import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { CreateStudioProjectRequest, StudioEdge, StudioEvent, TurnRequest, UpdateStudioProjectRequest } from '../../shared/studio';
import { STUDIO_TEMPLATES } from '../../shared/studio-templates';
import type { WorkerBindings } from '../index';
import { isLiveAuthorized } from '../index';
import { studioSandbox } from './sandbox';
import { studioStore } from './store';

/**
 * /api/studio: templates, projects, and each project's Muse Code session.
 * A project is a sandbox running Muse Code; these routes are a thin client of its MSP session.
 */
export const studioRoutes = new Hono<{ Bindings: WorkerBindings }>();

type C = Context<{ Bindings: WorkerBindings }>;
const MAX_STATE_BYTES = 500_000;

studioRoutes.get('/templates', (c) => c.json({ templates: STUDIO_TEMPLATES }));

studioRoutes.get('/projects', async (c) => c.json({ projects: await studioStore(c.env).list() }));

studioRoutes.get('/projects/:id', async (c) => {
  const project = await studioStore(c.env).get(c.req.param('id'));
  return project ? c.json({ project }) : c.json({ error: 'not_found' }, 404);
});

studioRoutes.post('/projects', async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateStudioProjectRequest | null;
  if (!body || typeof body.prompt !== 'string') return c.json({ error: 'invalid_request' }, 400);
  const project = await studioStore(c.env).create({
    name: String(body.name || 'Untitled project').slice(0, 120),
    prompt: body.prompt.slice(0, 4000),
    templateId: body.templateId ?? null,
    thumbnail: body.thumbnail ?? null,
    state: body.state ?? { positions: {} },
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
  await studioSandbox()?.remove(c.req.param('id')).catch(() => undefined);
  await studioStore(c.env).remove(c.req.param('id'));
  return c.json({ ok: true });
});

/** The project's session, or an error response when there is no project or no sandbox runtime. */
async function session(c: C) {
  const sandbox = studioSandbox();
  if (!sandbox) return { error: c.json({ error: 'no_sandbox', message: 'This deployment has no sandbox runtime yet.' }, 503) };
  const project = await studioStore(c.env).get(c.req.param('id')!);
  if (!project) return { error: c.json({ error: 'not_found' }, 404) };
  return { s: await sandbox.open(project) };
}

const fail = (c: C, e: unknown, status: 400 | 409 | 500 = 500) => c.json({ error: String((e as Error)?.message || e).slice(0, 400) }, status);

/** The live session: a snapshot, then items, deltas, status, todos, usage and canvas changes. */
studioRoutes.get('/projects/:id/events', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  return streamSSE(c, async (stream) => {
    let chain = Promise.resolve();
    const unsub = r.s.subscribe((e: StudioEvent) => {
      chain = chain.then(() => stream.writeSSE({ data: JSON.stringify(e) })).catch(() => undefined);
    });
    let open = true;
    stream.onAbort(() => {
      open = false;
      unsub();
    });
    while (open) {
      await stream.sleep(15_000);
      if (open) chain = chain.then(() => stream.writeSSE({ event: 'ping', data: '' })).catch(() => undefined);
    }
    await chain;
  });
});

/** Send the project's brief as its first turn (idempotent). */
studioRoutes.post('/projects/:id/start', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  try {
    return c.json(await r.s.start());
  } catch (e) {
    return fail(c, e);
  }
});

/** A message: starts a turn, steers the running one, or queues behind it (Muse Code decides). */
studioRoutes.post('/projects/:id/turns', async (c) => {
  const body = (await c.req.json().catch(() => null)) as TurnRequest | null;
  if (!body?.text?.trim()) return c.json({ error: 'invalid_request' }, 400);
  if (body.model === 'wonder' && !isLiveAuthorized(c) && c.env.STUDIO_OPEN !== '1') return c.json({ error: 'Muse Wonder needs Live mode.' }, 403);
  const r = await session(c);
  if (r.error) return r.error;
  try {
    return c.json(await r.s.turn({ text: body.text.trim().slice(0, 8000), mode: body.mode, model: body.model, files: body.files?.slice(0, 20) }));
  } catch (e) {
    return fail(c, e, 409);
  }
});

studioRoutes.post('/projects/:id/interrupt', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  try {
    await r.s.interrupt();
    return c.json({ ok: true });
  } catch (e) {
    return fail(c, e, 409);
  }
});

studioRoutes.delete('/projects/:id/queue/:turnId', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  try {
    await r.s.unqueue(c.req.param('turnId'));
    return c.json({ ok: true });
  } catch (e) {
    return fail(c, e, 409);
  }
});

studioRoutes.put('/projects/:id/model', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { model?: string };
  if (body.model !== 'spark' && body.model !== 'wonder') return c.json({ error: 'invalid_request' }, 400);
  if (body.model === 'wonder' && !isLiveAuthorized(c) && c.env.STUDIO_OPEN !== '1') return c.json({ error: 'Muse Wonder needs Live mode.' }, 403);
  const r = await session(c);
  if (r.error) return r.error;
  try {
    await r.s.setModel(body.model);
    return c.json({ ok: true });
  } catch (e) {
    return fail(c, e, 409);
  }
});

/** Workspace files (what the canvas shows), with byte ranges so videos seek. */
studioRoutes.get('/projects/:id/files/*', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  const prefix = `/api/studio/projects/${c.req.param('id')}/files/`;
  const rel = decodeURIComponent(new URL(c.req.url).pathname.slice(prefix.length));
  return r.s.serveFile(rel, c.req.header('range'));
});

/** Upload into the workspace's inputs/ (dropped on the canvas or attached in the chat). */
studioRoutes.post('/projects/:id/files', async (c) => {
  const r = await session(c);
  if (r.error) return r.error;
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return c.json({ error: 'invalid_request' }, 400);
  if (file.size > 200 * 1024 * 1024) return c.json({ error: 'file_too_large' }, 413);
  return c.json({ path: await r.s.upload(file.name, await file.arrayBuffer()) }, 201);
});

/** The person's wiring on the canvas, saved where the agent can read it (.studio/links.json). */
studioRoutes.put('/projects/:id/links', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { links?: StudioEdge[] } | null;
  if (!Array.isArray(body?.links)) return c.json({ error: 'invalid_request' }, 400);
  const r = await session(c);
  if (r.error) return r.error;
  await r.s.setLinks(body.links.slice(0, 500));
  return c.json({ ok: true });
});
