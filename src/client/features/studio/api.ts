import type {
  CreateStudioProjectRequest,
  StudioProject,
  StudioProjectSummary,
  StudioTemplate,
  UpdateStudioProjectRequest,
} from './types';
import type { DemoProject } from './types';

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
