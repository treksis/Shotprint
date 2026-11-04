import { Container, getContainer } from '@cloudflare/containers';
import type { StudioProject, TemplateDetail } from '../shared/studio';
// Written by scripts/cf-pack.ts before a deploy.
import SEEDS from '../../.cf/seeds.json';
import DETAILS from '../../.cf/templates.json';
import { app, type WorkerBindings } from './index';
import { setStudioSandbox } from './studio/sandbox';
import { d1Store } from './studio/store';

type Env = WorkerBindings & {
  PROJECT_VM: DurableObjectNamespace<ProjectVM>;
  MEDIA: R2Bucket;
  STUDIO_USD_CAP?: string;
};

/**
 * One project, one microVM: a Cloudflare container running the Studio session server (vm-server.ts) and
 * Muse Code side by side. It sleeps when nobody has used it for a while; Meta's API is its only caller.
 */
export class ProjectVM extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = '20m';
  enableInternet = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.envVars = { META_API_KEY: env.META_API_KEY ?? '', STUDIO_USD_CAP: env.STUDIO_USD_CAP ?? '1' };
  }
}

const COOKIE = 'sp_judge';
const SESSION = /^\/api\/studio\/projects\/([^/]+)\/(events|start|turns|interrupt|queue|model|files|links)(\/|$)/;

/** Running agents, and footage that isn't ours, are for judges: header from the app, cookie for <video>. */
function isJudge(req: Request, env: Env) {
  const expected = String(env.JUDGE_PASSCODE || '').trim().toUpperCase();
  if (!expected) return false;
  const cookie = /(?:^|;\s*)sp_judge=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1];
  const given = String(req.headers.get('x-judge-key') || (cookie ? decodeURIComponent(cookie) : '')).trim().toUpperCase();
  return given.length === expected.length && [...given].reduce((m, ch, i) => m | (ch.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0;
}

const judgeOnly = () => Response.json({ error: 'judge_only', message: 'Running an agent on this demo needs the judge passcode (Live mode).' }, { status: 401 });

/** R2 object with byte ranges, so videos seek. */
async function media(req: Request, env: Env, key: string) {
  const obj = await env.MEDIA.get(key, { range: req.headers });
  if (!obj) return new Response('not found', { status: 404 });
  const h = new Headers({ 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600', etag: obj.httpEtag });
  obj.writeHttpMetadata(h);
  const r = obj.range as { offset?: number; length?: number } | undefined;
  if (req.headers.has('range') && r) {
    const start = r.offset ?? 0;
    const len = r.length ?? obj.size - start;
    h.set('content-range', `bytes ${start}-${start + len - 1}/${obj.size}`);
    h.set('content-length', String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('content-length', String(obj.size));
  return new Response(obj.body, { headers: h });
}

/** An empty project list gets the recorded sample projects; their workspaces ship in the VM image. */
let seeded = false;
async function seedOnce(env: Env) {
  if (seeded || !env.DB) return;
  seeded = true;
  const store = d1Store(env.DB);
  if ((await store.list()).length) return;
  for (const s of SEEDS) {
    const p = await store.create({ name: s.name, prompt: s.prompt, templateId: s.templateId, thumbnail: s.thumbnail, state: { positions: {}, seed: s.slug } as never });
    await store.update(p.id, { status: 'done' });
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const judge = isJudge(req, env);

    setStudioSandbox({
      runnable: async () => true,
      open: async () => {
        throw new Error('sessions run in the project VM');
      },
      remove: async (id) => {
        await getContainer(env.PROJECT_VM, id).destroy();
      },
      templateDetail: async (id) => ((DETAILS as Record<string, TemplateDetail>)[id] ?? null),
      templateFile: async (id, rel) => {
        const res = await env.ASSETS!.fetch(new URL(`/tpl/${encodeURIComponent(id)}/${rel.split('/').map(encodeURIComponent).join('/')}`, url));
        if (!res.ok) return new Response('not found', { status: 404 });
        // Packed as JPEG whatever the source extension.
        return new Response(res.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
      },
    });

    if (url.pathname.startsWith('/templates/proof/') || url.pathname.startsWith('/templates/examples/') || url.pathname.startsWith('/media/')) {
      if (!judge) return new Response('judge passcode required', { status: 401 });
      return media(req, env, url.pathname.replace(/^\/(media\/)?/, ''));
    }

    if (url.pathname === '/api/judge/verify' && req.method === 'POST') {
      const body = (await req.clone().json().catch(() => ({}))) as { passcode?: string };
      const res = await app.fetch(req, env, ctx);
      if (!res.ok) return res;
      const out = new Response(res.body, res);
      out.headers.append('set-cookie', `${COOKIE}=${encodeURIComponent(String(body.passcode || '').trim())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      return out;
    }

    if (url.pathname.startsWith('/api/studio/projects')) {
      if (!judge) return req.method === 'GET' && url.pathname === '/api/studio/projects' ? Response.json({ projects: [] }) : judgeOnly();
      await seedOnce(env);
      const m = SESSION.exec(url.pathname);
      if (m) {
        const project = await d1Store(env.DB!).get(decodeURIComponent(m[1]));
        if (!project) return Response.json({ error: 'not_found' }, { status: 404 });
        // The VM needs who it is, not the canvas layout.
        const slim: StudioProject = { ...project, state: { positions: {}, seed: (project.state as { seed?: string })?.seed } as never };
        const headers = new Headers(req.headers);
        headers.set('x-studio-project', btoa(unescape(encodeURIComponent(JSON.stringify(slim)))));
        return getContainer(env.PROJECT_VM, project.id).fetch(new Request(req, { headers }));
      }
    }

    return app.fetch(req, env, ctx);
  },
} satisfies ExportedHandler<Env>;
