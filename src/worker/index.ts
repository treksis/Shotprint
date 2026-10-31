import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  AgentChatRequest,
  CreateProjectRequest,
  DissectVideoRequest,
  RemixProject,
  UpdateSceneRequest,
  ViralTemplate,
} from '../shared/types';
import { PRESET_PROJECTS, PRESET_TEMPLATES } from './data/presets';
import {
  computeContentHash,
  createProductRemix,
  dissectViralVideo,
  getMetaTextModel,
  hasCachedResponse,
  regenerateSceneKeyframe,
  renderAllClipsAndVerify,
  renderSceneClip,
  verifyProjectFidelity,
} from './services/ai-pipeline';
import {
  inspectSandboxSession,
  runSandboxAgentTurn,
  syncHyperframeToSandbox,
} from './services/sandbox';

export interface WorkerBindings {
  DB?: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        first<T = Record<string, unknown>>(): Promise<T | null>;
        run(): Promise<unknown>;
        all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      };
    };
  };
  MEDIA_BUCKET?: {
    put(key: string, value: ArrayBuffer | ReadableStream | string, options?: unknown): Promise<unknown>;
    get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  };
  SANDBOX_DO?: {
    idFromName(name: string): unknown;
    get(id: unknown): any;
  };
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  JUDGE_PASSCODE?: string;
  META_API_KEY?: string;
  META_API_BASE_URL?: string;
  META_TEXT_MODEL?: string;
  FAL_KEY?: string;
  FAL_API_BASE_URL?: string;
  SANDBOX_TRANSPORT?: string;
}

// Seed mutable in-memory state from presets so local dev & edge cold-starts have instant data
const templatesStore = new Map<string, ViralTemplate>(
  PRESET_TEMPLATES.map((tpl) => [tpl.id, structuredClone(tpl)])
);

const projectsStore = new Map<string, RemixProject>(
  PRESET_PROJECTS.map((proj) => [proj.id, structuredClone(proj)])
);

const uploadedAssetsStore = new Map<
  string,
  { buffer: ArrayBuffer; contentType: string; fileName: string }
>();

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isLiveAuthorized(c: any): boolean {
  const expected = String(c.env?.JUDGE_PASSCODE || '').trim().toUpperCase();
  if (!expected) return false;
  const provided = String(c.req.header('X-Judge-Key') || '').trim().toUpperCase();
  return constantTimeEqual(provided, expected);
}

export const app = new Hono<{ Bindings: WorkerBindings }>();

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Judge-Mode', 'X-Judge-Key'],
  })
);

app.onError((err, c) => {
  console.error('[MuseClone Worker Error]:', err);
  return c.json(
    {
      error: err.message || 'Internal Server Error',
      status: 500,
    },
    500
  );
});

// 1. Health & Stack Telemetry Endpoint
app.get('/api/health', (c) => {
  const hasMetaKey = Boolean(c.env?.META_API_KEY || (c.env as any)?.meta_api_key);
  const activeTextModel = getMetaTextModel(c.env);
  return c.json({
    status: 'ok',
    service: 'MuseClone Edge Orchestrator (Cloudflare Workers + Hono)',
    timestamp: new Date().toISOString(),
    stack: {
      activeTextModel,
      dissectionEngine: `Meta ${activeTextModel} + SAM 3.1 (sam-3.1)`,
      audioTranscription: 'Meta Muse Voice Transcribe (muse-voice-transcribe-1.0)',
      keyframeSynthesis: 'Meta Muse Image 1.0 (muse-image-1.0)',
      motionSynthesis: 'fal.ai Kling 1.6 Pro Image-to-Video',
      stitchingAndAudit: `Cloudflare Sandbox MicroVM (FFmpeg) + ${activeTextModel} Verifier`,
    },
    cloudflareBindings: {
      d1Database: Boolean(c.env?.DB),
      r2MediaBucket: Boolean(c.env?.MEDIA_BUCKET),
      sandboxDurableObject: Boolean(c.env?.SANDBOX_DO),
      sandboxRuntime: c.env?.SANDBOX_DO ? 'cloudflare_microvm_do' : 'local_isolated_workspace',
      staticAssets: Boolean(c.env?.ASSETS),
    },
    judgeMode: {
      passcodeConfigured: Boolean(c.env?.JUDGE_PASSCODE),
      liveMetaApiConfigured: hasMetaKey,
      liveFalApiConfigured: Boolean(c.env?.FAL_KEY),
      sha256CacheEnabled: true,
    },
    counts: {
      templates: templatesStore.size,
      projects: projectsStore.size,
    },
  });
});

// 1b. Sandbox MicroVM Workspace Inspector (hyperframe.json + render_ffmpeg.sh + FFmpeg runtime)
app.get('/api/sandbox/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const template = templatesStore.get(sessionId);
  const project = projectsStore.get(sessionId);
  if (template) {
    await syncHyperframeToSandbox(sessionId, { kind: 'template', template }, c.env);
  } else if (project) {
    const parentTemplate = templatesStore.get(project.templateId);
    await syncHyperframeToSandbox(sessionId, { kind: 'project', project, template: parentTemplate }, c.env);
  }
  const snapshot = await inspectSandboxSession(sessionId, c.env);
  return c.json(snapshot);
});

// 1c. Agent-Based MicroVM Turn (Chat + Full Freedom Sandbox File & FFmpeg Execution)
const handleAgentChat = async (c: any) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<AgentChatRequest>;
  if (!body.prompt || !body.prompt.trim()) {
    return c.json({ error: 'Please enter an instruction for the agent.' }, 400);
  }

  const project = body.projectId ? projectsStore.get(body.projectId) : undefined;
  const template =
    (body.templateId && templatesStore.get(body.templateId)) ||
    (project && templatesStore.get(project.templateId)) ||
    Array.from(templatesStore.values())[0];

  const sessionId =
    body.sessionId || project?.id || template?.id || 'studio-session';

  const result = await runSandboxAgentTurn(
    {
      sessionId,
      prompt: body.prompt.trim(),
      templateId: template?.id,
      projectId: project?.id,
      videoUrl: body.videoUrl,
      videoTitle: body.videoTitle,
    },
    {
      template,
      project,
      isLiveAuthorized: isLiveAuthorized(c),
    },
    c.env
  );

  if (result.updatedTemplate) {
    templatesStore.set(result.updatedTemplate.id, result.updatedTemplate);
  }
  if (result.updatedProject) {
    projectsStore.set(result.updatedProject.id, result.updatedProject);
  }

  return c.json(result);
};

app.post('/api/agent/chat', handleAgentChat);
app.post('/api/agent/run', handleAgentChat);

// 2. Reviewer Live Mode Authentication Guard
const handleJudgeAuth = async (c: any) => {
  const body = await c.req.json().catch(() => ({}));
  const rawPasscode = String(body.passcode || body.key || '').trim().toUpperCase();
  const expectedPasscode = String(c.env?.JUDGE_PASSCODE || '').trim().toUpperCase();

  if (expectedPasscode && constantTimeEqual(rawPasscode, expectedPasscode)) {
    return c.json({
      authorized: true,
      mode: 'judge_live',
    });
  }

  return c.json(
    {
      authorized: false,
      mode: 'public_sandbox',
      error: 'invalid_access_code',
    },
    401
  );
};

app.post('/api/auth/judge', handleJudgeAuth);
app.post('/api/judge/verify', handleJudgeAuth);
app.post('/api/judge', handleJudgeAuth);

// 2b. User Drag-and-Drop Asset Upload (Video & Product Photo to Cloudflare R2)
app.post('/api/assets/upload', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'Please select a valid video or image file to upload.' }, 400);
  }

  const blob = file as File;
  const arrayBuffer = await blob.arrayBuffer();
  const safeName = (blob.name || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${Date.now()}-${safeName}`;
  const contentType = blob.type || 'application/octet-stream';

  uploadedAssetsStore.set(key, {
    buffer: arrayBuffer,
    contentType,
    fileName: blob.name || safeName,
  });

  if (c.env?.MEDIA_BUCKET) {
    try {
      await c.env.MEDIA_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType },
      });
    } catch {
      // Fall back to in-memory asset store if R2 write fails in local dev
    }
  }

  return c.json({
    key,
    url: `/api/assets/${encodeURIComponent(key)}`,
    fileName: blob.name || safeName,
    contentType,
    sizeBytes: arrayBuffer.byteLength,
  });
});

app.get('/api/assets/:key', async (c) => {
  const key = c.req.param('key');
  const mem = uploadedAssetsStore.get(key);
  if (mem) {
    return new Response(mem.buffer, {
      status: 200,
      headers: {
        'Content-Type': mem.contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  if (c.env?.MEDIA_BUCKET) {
    const obj = await c.env.MEDIA_BUCKET.get(key);
    if (obj) {
      return new Response(obj.body, {
        status: 200,
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  return c.json({ error: 'Asset not found' }, 404);
});

// 3. Viral Templates Vault Endpoints
app.get('/api/templates', (c) => {
  const templates = Array.from(templatesStore.values());
  return c.json({ templates });
});

app.get('/api/templates/:id', (c) => {
  const id = c.req.param('id');
  const template = templatesStore.get(id);
  if (!template) {
    return c.json({ error: `Viral template '${id}' not found` }, 404);
  }
  return c.json({ template });
});

const handleDissectVideo = async (c: any) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<DissectVideoRequest>;
  if (!body.title || !body.sourceVideoUrl) {
    return c.json(
      { error: 'Both title and sourceVideoUrl are required to dissect a viral video.' },
      400
    );
  }

  const reqPayload: DissectVideoRequest = {
    title: body.title,
    sourceVideoUrl: body.sourceVideoUrl,
    category: body.category || 'Viral Product Reveal',
    sourcePlatform: body.sourcePlatform || 'TikTok',
  };

  const cacheHash = await computeContentHash({ op: 'dissectViralVideo', req: reqPayload });
  const isCached = await hasCachedResponse(cacheHash, c.env);

  if (!isCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const template = await dissectViralVideo(reqPayload, c.env);
  templatesStore.set(template.id, template);

  return c.json({ template }, 201);
};

app.post('/api/templates/dissect', handleDissectVideo);
app.post('/api/dissect', handleDissectVideo);
app.post('/api/templates', handleDissectVideo);

// 3b. Streaming Video Dissection & Template JSON Builder (SSE / NDJSON stream)
app.post('/api/templates/dissect-stream', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<DissectVideoRequest>;
  if (!body.title || !body.sourceVideoUrl) {
    return c.json(
      { error: 'Both title and sourceVideoUrl are required to dissect a video.' },
      400
    );
  }

  const reqPayload: DissectVideoRequest = {
    title: body.title,
    sourceVideoUrl: body.sourceVideoUrl,
    category: body.category || 'Product Ad',
    sourcePlatform: body.sourcePlatform || 'TikTok',
  };

  const cacheHash = await computeContentHash({ op: 'dissectViralVideo', req: reqPayload });
  const isCached = await hasCachedResponse(cacheHash, c.env);

  if (!isCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        send({
          type: 'status',
          step: 'ingest',
          message: `Reading video container and extracting hyperframes for "${reqPayload.title}"…`,
        });

        const template = await dissectViralVideo(reqPayload, c.env);
        templatesStore.set(template.id, template);

        const hyperframes = template.blueprint.scenes.map((scene) => ({
          sceneIndex: scene.sceneIndex,
          timestampSec: scene.startTime,
          window: `${scene.startTime.toFixed(1)}s–${scene.endTime.toFixed(1)}s`,
          shotType: scene.shotType,
          focalRegion: scene.samFocalRegion,
        }));

        send({
          type: 'hyperframes',
          message: `Extracted ${hyperframes.length} hyperframe anchor points across ${template.durationSec}s.`,
          hyperframes,
        });

        send({
          type: 'summary',
          message: `Hook: ${template.blueprint.hookAnalysis.first3SecMechanic} · Style: ${template.blueprint.globalStyle.lighting}`,
          overallHook: template.blueprint.hookAnalysis.first3SecMechanic,
          pacingStyle: template.blueprint.globalStyle.lighting,
        });

        for (const scene of template.blueprint.scenes) {
          send({
            type: 'cut',
            sceneIndex: scene.sceneIndex,
            message: `Cut ${scene.sceneIndex} (${scene.startTime.toFixed(1)}s–${scene.endTime.toFixed(1)}s) — ${scene.shotType}: ${scene.originalAction}`,
            scene,
          });
        }

        send({
          type: 'blueprint_json',
          message: 'Built structured template JSON blueprint.',
          blueprint: template.blueprint,
        });

        send({
          type: 'complete',
          message: 'Template ready.',
          template,
        });
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'Dissection stream failed.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
});

// 4. Remix Projects & Storyboard Endpoints
app.get('/api/projects', (c) => {
  const projects = Array.from(projectsStore.values());
  return c.json({ projects });
});

app.get('/api/projects/:id', (c) => {
  const id = c.req.param('id');
  const project = projectsStore.get(id);
  if (!project) {
    return c.json({ error: `Remix project '${id}' not found` }, 404);
  }
  return c.json({ project });
});

app.post('/api/projects', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<CreateProjectRequest>;
  if (!body.templateId || !body.productName || !body.productBrief) {
    return c.json(
      { error: 'templateId, productName, and productBrief are required to create a remix project.' },
      400
    );
  }

  const template =
    templatesStore.get(body.templateId) || Array.from(templatesStore.values())[0];

  if (!template) {
    return c.json({ error: `Template '${body.templateId}' not found` }, 404);
  }

  const projectHash = await computeContentHash({
    op: 'createProductRemix',
    templateId: template.id,
    productName: body.productName,
    productBrief: body.productBrief,
    productImageUrl: body.productImageUrl,
  });
  const isCached = await hasCachedResponse(projectHash, c.env);

  if (!isCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const project = await createProductRemix(
    template,
    {
      templateId: template.id,
      productName: body.productName,
      productCategory: body.productCategory,
      productBrief: body.productBrief,
      productImageUrl: body.productImageUrl,
    },
    c.env
  );

  projectsStore.set(project.id, project);
  return c.json({ project }, 201);
});

// 5. Scene Prompt & Script Overlay Editing (Open in Demo)
const handleUpdateScene = async (c: any) => {
  const id = c.req.param('id');
  const sceneIndex = Number(c.req.param('sceneIndex'));
  const project = projectsStore.get(id);

  if (!project) {
    return c.json({ error: `Project '${id}' not found` }, 404);
  }

  const scene = project.scenes.find((s) => s.sceneIndex === sceneIndex);
  if (!scene) {
    return c.json({ error: `Scene ${sceneIndex} not found in project '${id}'` }, 404);
  }

  const updates = (await c.req.json().catch(() => ({}))) as UpdateSceneRequest;
  if (typeof updates.adaptedImagePrompt === 'string') {
    scene.adaptedImagePrompt = updates.adaptedImagePrompt;
  }
  if (typeof updates.adaptedMotionPrompt === 'string') {
    scene.adaptedMotionPrompt = updates.adaptedMotionPrompt;
  }
  if (typeof updates.scriptOverlay === 'string') {
    scene.scriptOverlay = updates.scriptOverlay;
  }

  projectsStore.set(project.id, project);
  return c.json({ project, scene });
};

app.patch('/api/projects/:id/scenes/:sceneIndex', handleUpdateScene);
app.put('/api/projects/:id/scenes/:sceneIndex', handleUpdateScene);

// 6. Regenerate Scene Keyframe via Meta Muse Image (Requires Live Mode)
const handleRegenerateKeyframe = async (c: any) => {
  const id = c.req.param('id');
  const sceneIndex = Number(c.req.param('sceneIndex'));
  const project = projectsStore.get(id);

  if (!project) {
    return c.json({ error: `Project '${id}' not found` }, 404);
  }

  if (!isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: string;
    adaptedImagePrompt?: string;
  };
  const customPrompt = body.adaptedImagePrompt || body.prompt;

  const scene = await regenerateSceneKeyframe(project, sceneIndex, customPrompt, c.env);
  projectsStore.set(project.id, project);

  return c.json({ project, scene });
};

app.post('/api/projects/:id/scenes/:sceneIndex/regenerate-keyframe', handleRegenerateKeyframe);
app.post('/api/projects/:id/scenes/:sceneIndex/keyframe', handleRegenerateKeyframe);

// 7. Render Single Scene Motion Clip via fal.ai Kling 1.6 (Requires Live unless cached)
const handleRenderSceneClip = async (c: any) => {
  const id = c.req.param('id');
  const sceneIndex = Number(c.req.param('sceneIndex'));
  const project = projectsStore.get(id);

  if (!project) {
    return c.json({ error: `Project '${id}' not found` }, 404);
  }

  const targetScene = project.scenes.find((s) => s.sceneIndex === sceneIndex);
  if (!targetScene) {
    return c.json({ error: `Scene ${sceneIndex} not found in project '${id}'` }, 404);
  }

  const clipHash = await computeContentHash({
    op: 'renderSceneClip',
    keyframeUrl: targetScene.keyframeUrl,
    motionPrompt: targetScene.adaptedMotionPrompt,
    sceneIndex,
  });
  const isCached = await hasCachedResponse(clipHash, c.env);

  if (!isCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const scene = await renderSceneClip(project, sceneIndex, c.env);

  const allDone = project.scenes.every((s) => s.status === 'completed');
  if (allDone) {
    project.status = 'completed';
    if (!project.finalVideoUrl) {
      project.finalVideoUrl =
        project.scenes[0]?.videoClipUrl ||
        'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoy.mp4';
    }
  }

  projectsStore.set(project.id, project);
  return c.json({ project, scene });
};

app.post('/api/projects/:id/scenes/:sceneIndex/render-clip', handleRenderSceneClip);
app.post('/api/projects/:id/scenes/:sceneIndex/render', handleRenderSceneClip);
app.post('/api/projects/:id/scenes/:sceneIndex/clip', handleRenderSceneClip);

// 8. Render All Scene Clips, Stitch Master MP4, and Run Closed-Loop Muse Spark Verification
const handleRenderAll = async (c: any) => {
  const id = c.req.param('id');
  const project = projectsStore.get(id);

  if (!project) {
    return c.json({ error: `Project '${id}' not found` }, 404);
  }

  let allCached = true;
  for (const s of project.scenes) {
    const h = await computeContentHash({
      op: 'renderSceneClip',
      keyframeUrl: s.keyframeUrl,
      motionPrompt: s.adaptedMotionPrompt,
      sceneIndex: s.sceneIndex,
    });
    if (!(await hasCachedResponse(h, c.env))) {
      allCached = false;
      break;
    }
  }

  if (!allCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const template =
    templatesStore.get(project.templateId) || Array.from(templatesStore.values())[0];

  const updated = await renderAllClipsAndVerify(project, template, c.env);
  projectsStore.set(updated.id, updated);

  return c.json({ project: updated });
};

app.post('/api/projects/:id/render-all', handleRenderAll);
app.post('/api/projects/:id/render', handleRenderAll);

// 9. Explicit Closed-Loop Muse Spark 1.3 Viral Fidelity Verification
const handleVerifyFidelity = async (c: any) => {
  const id = c.req.param('id');
  const project = projectsStore.get(id);

  if (!project) {
    return c.json({ error: `Project '${id}' not found` }, 404);
  }

  const template =
    templatesStore.get(project.templateId) || Array.from(templatesStore.values())[0];

  const verifyHash = await computeContentHash({
    op: 'verifyProjectFidelity',
    projectId: project.id,
    templateId: template.id,
    scenes: project.scenes.map((s) => ({
      sceneIndex: s.sceneIndex,
      adaptedImagePrompt: s.adaptedImagePrompt,
      adaptedMotionPrompt: s.adaptedMotionPrompt,
      videoClipUrl: s.videoClipUrl,
    })),
  });
  const isCached = await hasCachedResponse(verifyHash, c.env);

  if (!isCached && !isLiveAuthorized(c)) {
    return c.json({ error: 'live_mode_required' }, 402);
  }

  const fidelityReport = await verifyProjectFidelity(project, template, c.env);
  projectsStore.set(project.id, project);

  return c.json({ project, fidelityReport });
};

app.post('/api/projects/:id/verify-fidelity', handleVerifyFidelity);
app.post('/api/projects/:id/verify', handleVerifyFidelity);
app.post('/api/projects/:id/fidelity', handleVerifyFidelity);

// Fallback to Cloudflare Static Assets (with SPA routing for /studio, /templates, etc.)
app.all('*', async (c) => {
  if (c.env?.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404 && c.req.method === 'GET' && !c.req.path.startsWith('/api/')) {
      const indexUrl = new URL('/index.html', c.req.url);
      return c.env.ASSETS.fetch(new Request(indexUrl.toString(), c.req.raw));
    }
    return res;
  }
  return c.json(
    {
      error: `Route ${c.req.method} ${c.req.path} not found on MuseClone API`,
    },
    404
  );
});

export default app;
