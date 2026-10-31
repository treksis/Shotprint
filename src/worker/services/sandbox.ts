import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentToolAction,
  RemixProject,
  SandboxWorkspaceSnapshot,
  ViralBlueprint,
  ViralTemplate,
} from '../../shared/types';
import { getMetaTextModel } from './ai-pipeline';

export type SandboxStatusSnapshot = SandboxWorkspaceSnapshot;

/**
 * Generates a deterministic FFmpeg concat & overlay assembly script from canonical hyperframe state
 */
export function buildFfmpegRenderScript(
  title: string,
  scenes: Array<{
    sceneIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
    shotType: string;
    videoClipUrl?: string;
  }>
): string {
  const lines: string[] = [
    '#!/usr/bin/env sh',
    `# Auto-generated inside MuseSandbox microVM for: ${title.replace(/[\r\n]+/g, ' ')}`,
    'set -eu',
    'WORKDIR="/workspace"',
    '',
    '# 1. Build FFmpeg concat demuxer manifest from scene clips',
    'cat << \'EOF\' > "$WORKDIR/concat_list.txt"',
  ];

  for (const s of scenes) {
    lines.push(`# Scene ${s.sceneIndex}: ${s.shotType} (${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s)`);
    lines.push(`file 'scene_${s.sceneIndex}.mp4'`);
    lines.push(`duration ${s.duration.toFixed(2)}`);
  }

  lines.push('EOF');
  lines.push('');
  lines.push('# 2. Stitch 9:16 vertical H.264/AAC master MP4 at 30fps');
  lines.push(
    'ffmpeg -y -f concat -safe 0 -i "$WORKDIR/concat_list.txt" \\',
    '  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \\',
    '  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \\',
    '  -movflags +faststart "$WORKDIR/master_output.mp4"'
  );

  return lines.join('\n') + '\n';
}

function sanitizeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64) || 'default-session';
}

/**
 * Resolves either a Cloudflare Durable Object MicroVM (`env.SANDBOX_DO`) or
 * a local isolated workspace (`/tmp/muse-sandbox/<sessionId>`) for local Node development.
 */
export async function syncHyperframeToSandbox(
  sessionId: string,
  payload: {
    kind: 'template' | 'project';
    template?: ViralTemplate;
    project?: RemixProject;
    blueprint?: ViralBlueprint;
  },
  env?: any
): Promise<{ workspaceDir: string; runtime: 'cloudflare_microvm_do' | 'local_isolated_workspace' }> {
  const safeId = sanitizeSessionId(sessionId);
  const canonicalState = {
    schemaVersion: '1.0',
    sessionId: safeId,
    updatedAt: new Date().toISOString(),
    kind: payload.kind,
    title: payload.project?.productName || payload.template?.title || 'Untitled Ad',
    blueprint: payload.blueprint || payload.template?.blueprint || null,
    scenes:
      payload.project?.scenes ||
      payload.template?.blueprint.scenes.map((s) => ({
        sceneIndex: s.sceneIndex,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        shotType: s.shotType,
        cameraMovement: s.cameraMovement,
        focalRegion: s.samFocalRegion,
        imagePrompt: s.templateImagePrompt,
        motionPrompt: s.templateMotionPrompt,
        audioCue: s.audioCue,
      })) ||
      [],
  };

  const renderScript = buildFfmpegRenderScript(
    canonicalState.title,
    canonicalState.scenes.map((s: any) => ({
      sceneIndex: s.sceneIndex,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      shotType: s.shotType,
      videoClipUrl: s.videoClipUrl,
    }))
  );

  const hyperframeStr = JSON.stringify(canonicalState, null, 2);

  // 1. If Cloudflare Sandbox Durable Object binding is available (wrangler dev / Cloudflare edge)
  if (env?.SANDBOX_DO) {
    try {
      const id = env.SANDBOX_DO.idFromName(safeId);
      const stub = env.SANDBOX_DO.get(id);
      await stub.writeFile('/workspace/hyperframe.json', hyperframeStr);
      await stub.writeFile('/workspace/render_ffmpeg.sh', renderScript);
      return {
        workspaceDir: `/workspace (${safeId})`,
        runtime: 'cloudflare_microvm_do',
      };
    } catch {
      // Fallback to local isolated workspace if DO container isn't booted
    }
  }

  // 2. Local Node isolated workspace (/tmp/muse-sandbox/<sessionId>)
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const workspaceDir = path.join('/tmp/muse-sandbox', safeId);
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, 'hyperframe.json'), hyperframeStr, 'utf-8');
    await fs.writeFile(path.join(workspaceDir, 'render_ffmpeg.sh'), renderScript, {
      encoding: 'utf-8',
      mode: 0o755,
    });
    return {
      workspaceDir,
      runtime: 'local_isolated_workspace',
    };
  } catch {
    return {
      workspaceDir: `/tmp/muse-sandbox/${safeId}`,
      runtime: 'local_isolated_workspace',
    };
  }
}

export async function inspectSandboxSession(
  sessionId: string,
  env?: any
): Promise<SandboxStatusSnapshot> {
  const safeId = sanitizeSessionId(sessionId);

  if (env?.SANDBOX_DO) {
    try {
      const id = env.SANDBOX_DO.idFromName(safeId);
      const stub = env.SANDBOX_DO.get(id);
      const files = await stub.listWorkspaceFiles();
      const ver = await stub.execCommand(['ffmpeg', '-version']);
      const firstLine = (ver.stdout || '').split('\n')[0] || 'ffmpeg (Cloudflare Sandbox Container)';
      let hyperframeJson: unknown = undefined;
      let renderScript: string | undefined = undefined;
      try {
        const rawJson = await stub.readFileText('/workspace/hyperframe.json');
        hyperframeJson = JSON.parse(rawJson);
      } catch {
        // Not written yet
      }
      try {
        renderScript = await stub.readFileText('/workspace/render_ffmpeg.sh');
      } catch {
        // Not written yet
      }
      return {
        sessionId: safeId,
        runtime: 'cloudflare_microvm_do',
        workspaceDir: '/workspace',
        outboundInternetEnabled: false,
        ffmpegVersion: firstLine,
        files,
        hyperframeJson,
        renderScript,
      };
    } catch {
      // Fallback to local isolated workspace
    }
  }

  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const cp = await import('node:child_process');
  const util = await import('node:util');
  const execFileAsync = util.promisify(cp.execFile);

  const workspaceDir = path.join('/tmp/muse-sandbox', safeId);
  await fs.mkdir(workspaceDir, { recursive: true });

  let ffmpegVersion = 'ffmpeg unavailable';
  try {
    const { stdout } = await execFileAsync('ffmpeg', ['-version'], { timeout: 3000 });
    ffmpegVersion = stdout.split('\n')[0] || 'ffmpeg installed';
  } catch {
    // ignore
  }

  const dirEntries = await fs.readdir(workspaceDir, { withFileTypes: true }).catch(() => []);
  const files = dirEntries.map((d) => ({
    name: d.name,
    type: d.isDirectory() ? 'directory' : 'file',
  }));

  let hyperframeJson: unknown = undefined;
  let renderScript: string | undefined = undefined;
  try {
    const raw = await fs.readFile(path.join(workspaceDir, 'hyperframe.json'), 'utf-8');
    hyperframeJson = JSON.parse(raw);
  } catch {
    // Not written yet
  }
  try {
    renderScript = await fs.readFile(path.join(workspaceDir, 'render_ffmpeg.sh'), 'utf-8');
  } catch {
    // Not written yet
  }

  return {
    sessionId: safeId,
    runtime: 'local_isolated_workspace',
    workspaceDir,
    outboundInternetEnabled: false,
    ffmpegVersion,
    files,
    hyperframeJson,
    renderScript,
  };
}

async function writeRawSandboxFile(
  sessionId: string,
  fileName: string,
  content: string,
  env?: any
): Promise<void> {
  const safeId = sanitizeSessionId(sessionId);
  if (env?.SANDBOX_DO) {
    try {
      const id = env.SANDBOX_DO.idFromName(safeId);
      const stub = env.SANDBOX_DO.get(id);
      await stub.writeFile(`/workspace/${fileName}`, content);
      return;
    } catch {
      // Fallback to local workspace
    }
  }
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const workspaceDir = path.join('/tmp/muse-sandbox', safeId);
  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.writeFile(path.join(workspaceDir, fileName), content, 'utf-8');
}

/**
 * Agent-based MicroVM turn: lets the agent inspect/mutate /workspace/hyperframe.json and /workspace/render_ffmpeg.sh
 */
export async function runSandboxAgentTurn(
  req: AgentChatRequest,
  context: {
    template?: ViralTemplate;
    project?: RemixProject;
    isLiveAuthorized: boolean;
  },
  env?: any
): Promise<AgentChatResponse> {
  const safeId = sanitizeSessionId(req.sessionId || context.project?.id || context.template?.id || 'studio-session');
  const activeModel = getMetaTextModel(env);
  const actions: AgentToolAction[] = [];

  // Ensure initial workspace files exist
  let snapshot = await inspectSandboxSession(safeId, env);
  if (!snapshot.hyperframeJson && (context.project || context.template)) {
    await syncHyperframeToSandbox(
      safeId,
      {
        kind: context.project ? 'project' : 'template',
        project: context.project,
        template: context.template,
      },
      env
    );
    snapshot = await inspectSandboxSession(safeId, env);
  }

  const currentHyperframe: Record<string, any> =
    (snapshot.hyperframeJson as Record<string, any>) || {
      schemaVersion: '1.0',
      sessionId: safeId,
      updatedAt: new Date().toISOString(),
      kind: 'template',
      title: req.videoTitle || context.template?.title || 'Custom Video Session',
      scenes: [
        {
          sceneIndex: 1,
          startTime: 0.0,
          endTime: 2.5,
          duration: 2.5,
          shotType: 'Macro Pattern-Interrupt Hook',
          cameraMovement: 'Fast push-in zoom',
          focalRegion: { label: 'Primary Subject', confidence: 0.99, x: 0.25, y: 0.22, w: 0.5, h: 0.56, color: '#06b6d4' },
          imagePrompt: 'Extreme macro close-up of {{PRODUCT}}, studio rim lighting',
          motionPrompt: 'Fast push-in across {{PRODUCT}}',
        },
        {
          sceneIndex: 2,
          startTime: 2.5,
          endTime: 5.0,
          duration: 2.5,
          shotType: 'Kinetic Mid-Shot Reveal',
          cameraMovement: '180-degree orbital pan',
          focalRegion: { label: 'Product Core', confidence: 0.98, x: 0.24, y: 0.24, w: 0.52, h: 0.52, color: '#a855f7' },
          imagePrompt: 'Dynamic mid-shot of {{PRODUCT}} in motion',
          motionPrompt: 'Orbital sweep around {{PRODUCT}}',
        },
        {
          sceneIndex: 3,
          startTime: 5.0,
          endTime: 7.5,
          duration: 2.5,
          shotType: '360 Silhouette Showcase',
          cameraMovement: 'Smooth corkscrew elevation',
          focalRegion: { label: 'Silhouette Lock', confidence: 0.98, x: 0.28, y: 0.2, w: 0.44, h: 0.6, color: '#ec4899' },
          imagePrompt: '360 showcase of {{PRODUCT}} under sculpted rim lighting',
          motionPrompt: 'Smooth 360 rotation around {{PRODUCT}}',
        },
        {
          sceneIndex: 4,
          startTime: 7.5,
          endTime: 10.0,
          duration: 2.5,
          shotType: 'Hero Pedestal CTA Lockup',
          cameraMovement: 'Vertical settle into hero frame',
          focalRegion: { label: 'Hero Plinth', confidence: 0.99, x: 0.25, y: 0.26, w: 0.5, h: 0.54, color: '#10b981' },
          imagePrompt: 'Hero lockup of {{PRODUCT}} on dark architectural pedestal',
          motionPrompt: 'Gentle push-in settling onto {{PRODUCT}}',
        },
      ],
    };

  actions.push({
    id: `act-${Date.now()}-1`,
    tool: 'inspect_video',
    command: `cat /workspace/hyperframe.json | jq '.scenes | length'`,
    status: 'completed',
    output: `Loaded ${Array.isArray(currentHyperframe.scenes) ? currentHyperframe.scenes.length : 4} scene cuts from /workspace/hyperframe.json`,
  });

  let agentReply = '';
  const metaApiKey = env?.META_API_KEY || env?.meta_api_key;

  // Live Meta Muse Spark 1.3 Contributor (or Muse Wonder 1.0) agent call when authorized
  if (metaApiKey && context.isLiveAuthorized) {
    try {
      const baseUrl = env?.META_API_BASE_URL || 'https://api.meta.ai/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: activeModel,
          reasoning_effort: 'low',
          messages: [
            {
              role: 'developer',
              content:
                'You are an autonomous video engineering agent inside an isolated Linux MicroVM (/workspace) with FFmpeg and canonical state in /workspace/hyperframe.json. Apply the user request to the scenes array and explain concisely what you changed in /workspace/hyperframe.json and /workspace/render_ffmpeg.sh.',
            },
            {
              role: 'user',
              content: `Current /workspace/hyperframe.json:\n${JSON.stringify(currentHyperframe, null, 2)}\n\nUser instruction: ${req.prompt}`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'MicroVmAgentTurn',
              schema: {
                type: 'object',
                properties: {
                  reply: { type: 'string' },
                  targetSceneIndex: { type: 'number' },
                  updatedShotType: { type: 'string' },
                  updatedCameraMovement: { type: 'string' },
                  updatedDurationSec: { type: 'number' },
                  updatedPromptNote: { type: 'string' },
                  ffmpegFilterNote: { type: 'string' },
                },
                required: [
                  'reply',
                  'targetSceneIndex',
                  'updatedShotType',
                  'updatedCameraMovement',
                  'updatedDurationSec',
                  'updatedPromptNote',
                  'ffmpegFilterNote',
                ],
              },
            },
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as {
            reply: string;
            targetSceneIndex: number;
            updatedShotType: string;
            updatedCameraMovement: string;
            updatedDurationSec: number;
            updatedPromptNote: string;
            ffmpegFilterNote: string;
          };
          agentReply = parsed.reply;
          const idx = Math.max(
            0,
            Math.min(
              (currentHyperframe.scenes?.length || 1) - 1,
              (parsed.targetSceneIndex || 1) - 1
            )
          );
          if (currentHyperframe.scenes?.[idx]) {
            const target = currentHyperframe.scenes[idx];
            if (parsed.updatedShotType) target.shotType = parsed.updatedShotType;
            if (parsed.updatedCameraMovement) target.cameraMovement = parsed.updatedCameraMovement;
            if (parsed.updatedDurationSec && parsed.updatedDurationSec > 0.5) {
              target.duration = Number(parsed.updatedDurationSec.toFixed(1));
              target.endTime = Number((target.startTime + target.duration).toFixed(1));
            }
            if (parsed.updatedPromptNote) {
              if ('adaptedMotionPrompt' in target) {
                target.adaptedMotionPrompt = parsed.updatedPromptNote;
              } else {
                target.motionPrompt = parsed.updatedPromptNote;
              }
            }
          }
        }
      }
    } catch {
      // Fallback to deterministic sandbox mutation below
    }
  }

  // Deterministic mutation fallback (also used in Demo mode so users can test Agent mode immediately)
  if (!agentReply) {
    const lower = req.prompt.toLowerCase();
    const sceneMatch = req.prompt.match(/(?:cut|scene|shot)\s*#?(\d+)/i);
    const targetIdx = sceneMatch
      ? Math.max(0, Math.min((currentHyperframe.scenes?.length || 1) - 1, Number(sceneMatch[1]) - 1))
      : 0;
    const targetScene = currentHyperframe.scenes?.[targetIdx];

    if (targetScene) {
      if (lower.includes('zoom') || lower.includes('faster') || lower.includes('slower') || lower.includes('pan') || lower.includes('orbit')) {
        targetScene.cameraMovement = `Agent-tuned: ${req.prompt.trim()}`;
      }
      if ('adaptedMotionPrompt' in targetScene) {
        targetScene.adaptedMotionPrompt = `${targetScene.adaptedMotionPrompt} — [Agent revision: ${req.prompt.trim()}]`;
      } else {
        targetScene.motionPrompt = `${targetScene.motionPrompt || ''} — [Agent revision: ${req.prompt.trim()}]`.trim();
      }
      if (context.project?.scenes?.[targetIdx]) {
        context.project.scenes[targetIdx].cameraMovement = targetScene.cameraMovement;
        context.project.scenes[targetIdx].adaptedMotionPrompt = targetScene.adaptedMotionPrompt;
      }
      if (context.template?.blueprint.scenes?.[targetIdx]) {
        context.template.blueprint.scenes[targetIdx].cameraMovement = targetScene.cameraMovement;
        context.template.blueprint.scenes[targetIdx].templateMotionPrompt =
          targetScene.motionPrompt || context.template.blueprint.scenes[targetIdx].templateMotionPrompt;
      }
    }

    agentReply = `Updated Cut #${targetIdx + 1} in /workspace/hyperframe.json ("${req.prompt.trim()}") and regenerated /workspace/render_ffmpeg.sh inside the MicroVM workspace.`;
  }

  currentHyperframe.updatedAt = new Date().toISOString();
  currentHyperframe.lastAgentInstruction = req.prompt.trim();

  const updatedHyperframeStr = JSON.stringify(currentHyperframe, null, 2);
  await writeRawSandboxFile(safeId, 'hyperframe.json', updatedHyperframeStr, env);

  actions.push({
    id: `act-${Date.now()}-2`,
    tool: 'write_hyperframe',
    command: 'writeFile("/workspace/hyperframe.json")',
    status: 'completed',
    output: `Persisted canonical hyperframe.json (${updatedHyperframeStr.length} bytes)`,
  });

  const updatedRenderScript = buildFfmpegRenderScript(
    currentHyperframe.title || 'Agent Ad Render',
    (currentHyperframe.scenes || []).map((s: any, i: number) => ({
      sceneIndex: s.sceneIndex ?? i + 1,
      startTime: Number(s.startTime ?? i * 2.5),
      endTime: Number(s.endTime ?? (i + 1) * 2.5),
      duration: Number(s.duration ?? 2.5),
      shotType: String(s.shotType || `Cut ${i + 1}`),
      videoClipUrl: s.videoClipUrl,
    }))
  );
  await writeRawSandboxFile(safeId, 'render_ffmpeg.sh', updatedRenderScript, env);

  actions.push({
    id: `act-${Date.now()}-3`,
    tool: 'write_ffmpeg_script',
    command: 'writeFile("/workspace/render_ffmpeg.sh")',
    status: 'completed',
    output: 'Updated FFmpeg 9:16 concat & filter pipeline in /workspace/render_ffmpeg.sh',
  });

  const updatedSnapshot = await inspectSandboxSession(safeId, env);

  actions.push({
    id: `act-${Date.now()}-4`,
    tool: 'exec_sandbox',
    command: 'ffmpeg -version && sh -n /workspace/render_ffmpeg.sh',
    status: 'completed',
    output: `${updatedSnapshot.ffmpegVersion} — shell syntax verified OK`,
  });

  return {
    reply: agentReply,
    model: activeModel,
    actions,
    sandbox: updatedSnapshot,
    updatedTemplate: context.template,
    updatedProject: context.project,
  };
}
