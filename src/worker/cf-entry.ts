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
  /** Spend guard (wrangler.jsonc vars): all projects together, one project across VM lives, new projects a day. */
  GLOBAL_USD_CAP?: string;
  PROJECT_USD_CAP?: string;
  DAILY_PROJECTS?: string;
  /** "1" stops every new turn: the kill switch. */
  STUDIO_PAUSED?: string;
};

/**
 * One project, one microVM: a Cloudflare container running the Studio session server (vm-server.ts) and
 * Muse Code side by side. It sleeps when nobody has used it for a while; Meta's API is its only caller.
 */
export class ProjectVM extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = '20m';
  enableInternet = true;

  constructor(ctx: DurableObjectState<{}>, env: Env) {
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

const SPEND = /^\/api\/studio\/projects\/[^/]+\/(start|turns)$/;
const ACTIVE_MS = 25 * 60_000;

/** The slim project a VM needs to know who it is (not the canvas layout). */
function vmRequest(project: StudioProject, req: Request) {
  const slim: StudioProject = { ...project, state: { positions: {}, seed: (project.state as { seed?: string })?.seed } as never };
  const headers = new Headers(req.headers);
  headers.set('x-studio-project', btoa(unescape(encodeURIComponent(JSON.stringify(slim)))));
  return new Request(req, { headers });
}

/** Asks a project VM what this life of it has spent (and optionally stops its turn), and records it. */
async function pollVm(env: Env, project: StudioProject, stop = false) {
  const res = await getContainer(env.PROJECT_VM, project.id).fetch(vmRequest(project, new Request(`http://vm/__${stop ? 'stop' : 'usage'}`)));
  const u = (await res.json()) as { boot: string; usd: number };
  await env.DB!.prepare('INSERT INTO vm_spend (project_id, boot, usd) VALUES (?, ?, ?) ON CONFLICT (project_id, boot) DO UPDATE SET usd = MAX(usd, excluded.usd)')
    .bind(project.id, u.boot, u.usd)
    .run();
}

async function spent(env: Env, projectId?: string) {
  const all = await env.DB!.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM vm_spend').bind().first<{ usd: number }>();
  const one = projectId ? await env.DB!.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM vm_spend WHERE project_id = ?').bind(projectId).first<{ usd: number }>() : null;
  return { total: all?.usd ?? 0, project: one?.usd ?? 0 };
}

const caps = (env: Env) => ({ global: Number(env.GLOBAL_USD_CAP || 12), project: Number(env.PROJECT_USD_CAP || 5) });

/** Before a turn starts: the kill switch, then the shared budget and the project's own. */
async function budgetBlock(env: Env, project: StudioProject) {
  if (env.STUDIO_PAUSED === '1') return Response.json({ error: 'paused', message: 'Agents are paused on this demo right now.' }, { status: 503 });
  await pollVm(env, project).catch(() => undefined);
  const s = await spent(env, project.id);
  const c = caps(env);
  if (s.total >= c.global) return Response.json({ error: 'budget', message: `This demo has used its $${c.global} agent budget.` }, { status: 402 });
  if (s.project >= c.project) return Response.json({ error: 'budget', message: `This project has used its $${c.project} budget. Start a new project.` }, { status: 402 });
  return null;
}

async function guard(env: Env) {
  const { results } = await env.DB!.prepare('SELECT project_id FROM vm_activity WHERE last_seen > ?').bind(Date.now() - ACTIVE_MS).all<{ project_id: string }>();
  const store = d1Store(env.DB!);
  const over = async () => (await spent(env)).total >= caps(env).global || env.STUDIO_PAUSED === '1';
  const polled: Record<string, string> = {};
  for (const { project_id } of results) {
    const p = await store.get(project_id);
    if (!p) continue;
    const stop = await over();
    polled[project_id] = await pollVm(env, p, stop).then(() => (stop ? 'stopped' : 'ok'), (e) => `error: ${(e as Error).message}`);
  }
  return { active: results.length, polled, ...(await spent(env)) };
}

/** Recorded runs anyone can replay in Demo mode (finished films; their source footage stays blocked). */
const PUBLIC_SEEDS = ['01-meta-vr-glasses-bluechip', '02-render-modes-teaser'];
const PUBLIC_BLOCKED = /^(inputs\/reference|notes\/ref)|\.(wav|mp3|m4a|aac)$/i;

async function demoReplays(env: Env) {
  const { results } = await env.DB!.prepare('SELECT id, name, template_id, status, thumbnail, created_at, updated_at, state_json FROM studio_projects')
    .bind()
    .all<{ id: string; name: string; template_id: string | null; status: StudioProject['status']; thumbnail: string | null; created_at: string; updated_at: string; state_json: string }>();
  return results
    .filter((r) => PUBLIC_SEEDS.includes(JSON.parse(r.state_json)?.seed))
    .map((r) => ({ id: r.id, name: r.name, templateId: r.template_id, status: r.status, thumbnail: r.thumbnail, createdAt: r.created_at, updatedAt: r.updated_at }));
}

/** Without the passcode: the recorded runs, read only. */
async function publicReplay(req: Request, env: Env, url: URL) {
  if (req.method !== 'GET') return null;
  await seedOnce(env);
  const replays = await demoReplays(env);
  if (url.pathname === '/api/studio/projects') return Response.json({ projects: replays });
  const m = /^\/api\/studio\/projects\/([^/]+)(?:\/(events|files)\/?(.*))?$/.exec(url.pathname);
  const id = m && decodeURIComponent(m[1]);
  if (!id || !replays.some((r) => r.id === id)) return null;
  if (!m![2]) return 'app' as const;
  if (m![2] === 'files' && PUBLIC_BLOCKED.test(decodeURIComponent(m![3]))) return new Response('judge passcode required', { status: 401 });
  const project = await d1Store(env.DB!).get(id);
  return project ? getContainer(env.PROJECT_VM, id).fetch(vmRequest(project, req)) : null;
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

/** Static videos with byte ranges (the assets server sends whole files, so players could not seek). */
async function rangedAsset(req: Request, env: Env) {
  const res = await env.ASSETS!.fetch(new Request(req.url, { headers: { accept: req.headers.get('accept') ?? '*/*' } }));
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
  if (!res.ok || !range) {
    const h = new Headers(res.headers);
    h.set('accept-ranges', 'bytes');
    return new Response(res.body, { status: res.status, headers: h });
  }
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'video/mp4',
      'content-range': `bytes ${start}-${end}/${size}`,
      'content-length': String(end - start + 1),
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=3600',
    },
  });
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
        const res = await env.ASSETS!.fetch(new Request(new URL(`/tpl/${encodeURIComponent(id)}/${rel.split('/').map(encodeURIComponent).join('/')}`, url)));
        if (!res.ok) return new Response('not found', { status: 404 });
        // Packed as JPEG whatever the source extension.
        return new Response(res.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
      },
    });

    if (url.pathname.startsWith('/templates/proof/') || url.pathname.startsWith('/templates/examples/') || url.pathname.startsWith('/templates/samplea/') || url.pathname.startsWith('/media/')) {
      const publicThumb = PUBLIC_SEEDS.some((slug) => url.pathname.startsWith(`/media/seeds/${slug}/`));
      if (!judge && !publicThumb) return new Response('judge passcode required', { status: 401 });
      return media(req, env, url.pathname.replace(/^\/(media\/)?/, ''));
    }

    if (url.pathname.endsWith('.mp4') && req.method === 'GET' && !url.pathname.startsWith('/api/')) return rangedAsset(req, env);

    if (url.pathname === '/api/judge/verify' && req.method === 'POST') {
      const body = (await req.clone().json().catch(() => ({}))) as { passcode?: string };
      const res = await app.fetch(req, env, ctx);
      if (!res.ok) return res;
      const out = new Response(res.body, res);
      out.headers.append('set-cookie', `${COOKIE}=${encodeURIComponent(String(body.passcode || '').trim())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      return out;
    }

    if (url.pathname.startsWith('/api/studio/projects')) {
      if (!judge) {
        const pub = await publicReplay(req, env, url);
        if (pub === 'app') return app.fetch(req, env, ctx);
        return pub ?? judgeOnly();
      }
      await seedOnce(env);
      const m = SESSION.exec(url.pathname);
      if (m) {
        const project = await d1Store(env.DB!).get(decodeURIComponent(m[1]));
        if (!project) return Response.json({ error: 'not_found' }, { status: 404 });
        if (req.method === 'POST' && SPEND.test(url.pathname)) {
          const blocked = await budgetBlock(env, project);
          if (blocked) return blocked;
        }
        await env.DB!.prepare('INSERT INTO vm_activity (project_id, last_seen) VALUES (?, ?) ON CONFLICT (project_id) DO UPDATE SET last_seen = excluded.last_seen')
          .bind(project.id, Date.now())
          .run();
        return getContainer(env.PROJECT_VM, project.id).fetch(vmRequest(project, req));
      }
      if (url.pathname === '/api/studio/projects' && req.method === 'POST') {
        const today = await env.DB!.prepare("SELECT COUNT(*) AS n FROM studio_projects WHERE created_at > datetime('now', '-1 day')").bind().first<{ n: number }>();
        if ((today?.n ?? 0) >= Number(env.DAILY_PROJECTS || 30)) return Response.json({ error: 'limit', message: 'This demo has reached its projects for today.' }, { status: 429 });
      }
    }

    if (url.pathname === '/api/studio/budget') {
      if (!judge) return judgeOnly();
      if (url.searchParams.has('refresh')) return Response.json({ ...(await guard(env)), caps: caps(env) });
      return Response.json({ ...(await spent(env)), caps: caps(env), paused: env.STUDIO_PAUSED === '1' });
    }

    return app.fetch(req, env, ctx);
  },

  /** Every minute: record what active VMs have spent; past the shared budget, stop their turns. */
  async scheduled(_e: ScheduledController, env: Env) {
    console.log('[budget]', JSON.stringify(await guard(env)));
  },
} satisfies ExportedHandler<Env>;
