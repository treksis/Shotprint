import type {
  CreateStudioProjectRequest,
  StudioProject,
  StudioProjectSummary,
  StudioTemplate,
  UpdateStudioProjectRequest,
} from './types';
import type { DemoProject } from './types';
import { getJudgeModeState, getJudgePasscode } from '../../lib/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const listTemplates = () =>
  fetch('/api/studio/templates').then((r) => json<{ templates: StudioTemplate[] }>(r)).then((d) => d.templates);

export const listProjects = () =>
  fetch('/api/studio/projects').then((r) => json<{ projects: StudioProjectSummary[] }>(r)).then((d) => d.projects);

export const getProject = (id: string) =>
  fetch(`/api/studio/projects/${id}`).then((r) => json<{ project: StudioProject }>(r)).then((d) => d.project);

export const createProject = (body: CreateStudioProjectRequest) =>
  fetch('/api/studio/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => json<{ project: StudioProject }>(r))
    .then((d) => d.project);

export const updateProject = (id: string, patch: UpdateStudioProjectRequest) =>
  fetch(`/api/studio/projects/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
    .then((r) => json<{ project: StudioProject }>(r))
    .then((d) => d.project);

export const deleteProject = (id: string) => fetch(`/api/studio/projects/${id}`, { method: 'DELETE' }).then((r) => json(r));

const demoCache = new Map<string, Promise<DemoProject>>();
export function loadDemo(id: string): Promise<DemoProject> {
  if (!demoCache.has(id))
    demoCache.set(
      id,
      fetch(`/demo/${id}/project.json`).then((r) => {
        if (!r.ok) throw new Error(`Demo ${id} not found`);
        return r.json();
      })
    );
  return demoCache.get(id)!;
}

/** Upload a reference or product file (R2 in Cloudflare, memory in dev). */
export async function uploadFile(file: File): Promise<{ url: string; fileName: string; contentType: string }> {
  const form = new FormData();
  form.append('file', file);
  return json(await fetch('/api/assets/upload', { method: 'POST', body: form }));
}

export type DirectorModel = 'spark' | 'wonder';

/** A per-browser id so the server can cap demo spend per visitor. */
export function sessionId(): string {
  try {
    let id = localStorage.getItem('museclone.session');
    if (!id) {
      id = `s_${crypto.randomUUID()}`;
      localStorage.setItem('museclone.session', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'X-Studio-Session': sessionId() };
  if (getJudgeModeState()) {
    const k = getJudgePasscode();
    if (k) h['X-Judge-Key'] = k;
  }
  return h;
}

export interface Budget {
  live: boolean;
  limits: { turns: number; images: number; usd: number; models: DirectorModel[] };
  used: { turns: number; images: number; usd: number };
}
export const getBudget = () => fetch('/api/studio/budget', { headers: authHeaders() }).then((r) => json<Budget>(r));

export type DirectorEvent =
  | { type: 'step'; id: string; text: string; status: 'running' | 'done' | 'failed'; cost?: string }
  | { type: 'node'; node: any; edges?: Array<{ from: string; to: string; role: string }> }
  | { type: 'edge'; edge: { from: string; to: string; role: string } }
  | { type: 'text'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'run'; id: string }
  | { type: 'steer'; text: string }
  | { type: 'stopped' }
  | { type: 'done'; usd: number; model: string }
  | { type: 'error'; message: string };

/** One director turn; events arrive as they happen (server-sent events over a POST). */
export async function runDirector(body: unknown, onEvent: (e: DirectorEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/studio/agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Director request failed (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = chunk
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('');
      if (data) onEvent(JSON.parse(data));
    }
  }
}

export const steerRun = (runId: string, text: string) =>
  fetch(`/api/studio/agent/runs/${runId}/steer`, { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ text }) }).then((r) => r.ok);
export const stopRun = (runId: string) => fetch(`/api/studio/agent/runs/${runId}/stop`, { method: 'POST', headers: authHeaders() }).then((r) => r.ok);
