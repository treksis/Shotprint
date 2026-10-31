import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { CreateStudioProjectRequest, UpdateStudioProjectRequest } from '../../shared/studio';
import { STUDIO_TEMPLATES } from '../../shared/studio-templates';
import type { WorkerBindings } from '../index';
import { studioStore } from './store';
import { budgetFor, LIMITS, runDirector, type AgentRequest } from './agent';
import { isLiveAuthorized } from '../index';

/**
 * /api/studio: templates and persisted projects (Phase 1: the canvas and chat survive a reload).
 * No paid work happens here; agent runs and renders arrive in Phase 2-3 behind the Live-mode spend cap.
 */
export const studioRoutes = new Hono<{ Bindings: WorkerBindings }>();

const MAX_STATE_BYTES = 2_000_000;

studioRoutes.get('/templates', (c) => c.json({ templates: STUDIO_TEMPLATES }));

studioRoutes.get('/projects', async (c) => c.json({ projects: await studioStore(c.env).list() }));

studioRoutes.get('/projects/:id', async (c) => {
  const project = await studioStore(c.env).get(c.req.param('id'));
  return project ? c.json({ project }) : c.json({ error: 'not_found' }, 404);
});

studioRoutes.post('/projects', async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateStudioProjectRequest | null;
  if (!body || typeof body.prompt !== 'string' || !body.state || !Array.isArray(body.state.nodes)) {
    return c.json({ error: 'invalid_request' }, 400);
  }
  if (JSON.stringify(body.state).length > MAX_STATE_BYTES) return c.json({ error: 'state_too_large' }, 413);
  const project = await studioStore(c.env).create({
    name: String(body.name || 'Untitled project').slice(0, 120),
    prompt: body.prompt.slice(0, 4000),
    templateId: body.templateId ?? null,
    thumbnail: body.thumbnail ?? null,
    state: body.state,
  });
  return c.json({ project }, 201);
});

studioRoutes.put('/projects/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as UpdateStudioProjectRequest | null;
  if (!body) return c.json({ error: 'invalid_request' }, 400);
  if (body.state && JSON.stringify(body.state).length > MAX_STATE_BYTES) return c.json({ error: 'state_too_large' }, 413);
  const project = await studioStore(c.env).update(c.req.param('id'), {
    name: body.name?.slice(0, 120),
    status: body.status,
    thumbnail: body.thumbnail,
    state: body.state,
  });
  return project ? c.json({ project }) : c.json({ error: 'not_found' }, 404);
});

studioRoutes.delete('/projects/:id', async (c) => {
  await studioStore(c.env).remove(c.req.param('id'));
  return c.json({ ok: true });
});

const sessionOf = (c: any) => String(c.req.header('X-Studio-Session') || 'anon').slice(0, 64);

/** What this browser session may still spend (demo: Spark only and a small budget). */
studioRoutes.get('/budget', (c) => {
  const live = isLiveAuthorized(c);
  const limits = live ? LIMITS.live : LIMITS.demo;
  const used = budgetFor(sessionOf(c));
  return c.json({ live, limits, used });
});

/** One director turn, streamed as server-sent events (steps, nodes, edges, text, done). */
studioRoutes.post('/agent', async (c) => {
  const body = (await c.req.json().catch(() => null)) as AgentRequest | null;
  if (!body || typeof body.text !== 'string' || !body.canvas) return c.json({ error: 'invalid_request' }, 400);
  const live = isLiveAuthorized(c);
  const origin = c.req.header('origin') || new URL(c.req.url).origin;
  return streamSSE(c, async (stream) => {
    // Writes are chained and awaited, so the stream never closes with events still queued.
    let chain = Promise.resolve();
    const emit = (e: unknown) => {
      chain = chain.then(() => stream.writeSSE({ data: JSON.stringify(e) }));
    };
    try {
      await runDirector(c.env, body, sessionOf(c), live, origin, emit);
    } catch (e) {
      emit({ type: 'error', message: String((e as Error).message || e).slice(0, 400) });
    }
    await chain;
  });
});
