import type {
  CreateStudioProjectRequest,
  DirectorModel,
  StudioEdge,
  StudioEvent,
  StudioProject,
  StudioProjectSummary,
  StudioTemplate,
  TemplateDetail,
  TurnRequest,
  UpdateStudioProjectRequest,
} from './types';
import { getJudgeModeState, getJudgePasscode } from '../../lib/api';

export type { DirectorModel };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (getJudgeModeState()) {
    const k = getJudgePasscode();
    if (k) h['X-Judge-Key'] = k;
  }
  return h;
}

const post = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: headers({ 'content-type': 'application/json' }), body: body === undefined ? undefined : JSON.stringify(body) });

export const listTemplates = () =>
  fetch('/api/studio/templates').then((r) => json<{ templates: StudioTemplate[] }>(r)).then((d) => d.templates);

export const getTemplate = (id: string) =>
  fetch(`/api/studio/templates/${encodeURIComponent(id)}`).then((r) => json<{ template: StudioTemplate; detail: TemplateDetail | null }>(r));

export const templateFileUrl = (id: string, rel: string) => `/api/studio/templates/${encodeURIComponent(id)}/files/${rel}`;

export const listProjects = () =>
  fetch('/api/studio/projects').then((r) => json<{ projects: StudioProjectSummary[] }>(r)).then((d) => d.projects);

export const getProject = (id: string) =>
  fetch(`/api/studio/projects/${id}`).then((r) => json<{ project: StudioProject }>(r)).then((d) => d.project);

export const createProject = (body: CreateStudioProjectRequest) =>
  post('/api/studio/projects', body)
    .then((r) => json<{ project: StudioProject }>(r))
    .then((d) => d.project);

export const updateProject = (id: string, patch: UpdateStudioProjectRequest) =>
  post(`/api/studio/projects/${id}`, patch, 'PUT')
    .then((r) => json<{ project: StudioProject }>(r))
    .then((d) => d.project);

export const deleteProject = (id: string) => fetch(`/api/studio/projects/${id}`, { method: 'DELETE' }).then((r) => json(r));

// ---- the project's Muse Code session ----------------------------------------------------------

/** Live session events (server-sent). The browser reconnects by itself; every reconnect starts with a snapshot. */
export function openEvents(projectId: string, onEvent: (e: StudioEvent) => void, onError?: () => void) {
  const es = new EventSource(`/api/studio/projects/${projectId}/events`);
  es.onmessage = (m) => {
    if (m.data) onEvent(JSON.parse(m.data));
  };
  es.onerror = () => onError?.();
  return () => es.close();
}

export const startProject = (id: string) => post(`/api/studio/projects/${id}/start`).then((r) => json<{ started: boolean }>(r));

export const sendTurn = (id: string, req: TurnRequest) => post(`/api/studio/projects/${id}/turns`, req).then((r) => json<{ disposition: string }>(r));

export const interruptTurn = (id: string) => post(`/api/studio/projects/${id}/interrupt`).then((r) => json(r));

export const unqueueTurn = (id: string, turnId: string) => fetch(`/api/studio/projects/${id}/queue/${turnId}`, { method: 'DELETE', headers: headers() }).then((r) => json(r));

export const setSessionModel = (id: string, model: DirectorModel) => post(`/api/studio/projects/${id}/model`, { model }, 'PUT').then((r) => json(r));

export const saveLinks = (id: string, links: StudioEdge[]) => post(`/api/studio/projects/${id}/links`, { links }, 'PUT').then((r) => json(r));

/** Upload into the project's workspace (inputs/); returns the workspace path the agent sees. */
export async function uploadToProject(id: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const r = await json<{ path: string }>(await fetch(`/api/studio/projects/${id}/files`, { method: 'POST', body: form, headers: headers() }));
  return r.path;
}
