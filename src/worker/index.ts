import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { studioRoutes } from './studio/routes';

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
  SANDBOX_DO?: {
    idFromName(name: string): unknown;
    get(id: unknown): any;
  };
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  JUDGE_PASSCODE?: string;
  /** "1" lets anyone use Muse Wonder without the judge passcode (local dev). */
  STUDIO_OPEN?: string;
  META_API_KEY?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Judges unlock Live mode (Muse Wonder) with the passcode from the submission notes. */
export function isLiveAuthorized(c: any): boolean {
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
    allowHeaders: ['Content-Type', 'Authorization', 'X-Judge-Key'],
  })
);

app.onError((err, c) => {
  console.error('[Shotprint]', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

app.route('/api/studio', studioRoutes);

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    metaApiKey: Boolean(c.env?.META_API_KEY),
    judgePasscode: Boolean(c.env?.JUDGE_PASSCODE),
    d1: Boolean(c.env?.DB),
  })
);

app.post('/api/judge/verify', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { passcode?: string };
  const provided = String(body.passcode || '').trim().toUpperCase();
  const expected = String(c.env?.JUDGE_PASSCODE || '').trim().toUpperCase();
  if (expected && constantTimeEqual(provided, expected)) return c.json({ authorized: true, mode: 'live' });
  return c.json({ authorized: false, mode: 'public', error: 'invalid_access_code' }, 401);
});

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
      error: `Route ${c.req.method} ${c.req.path} not found on Shotprint API`,
    },
    404
  );
});

export default app;
