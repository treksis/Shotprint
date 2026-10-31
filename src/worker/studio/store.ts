import type {
  CreateStudioProjectRequest,
  StudioProject,
  StudioProjectSummary,
  UpdateStudioProjectRequest,
} from '../../shared/studio';
import type { WorkerBindings } from '../index';

/** Where Studio projects live: D1 on Cloudflare, a JSON file in node dev, memory otherwise. */
export interface StudioStore {
  list(): Promise<StudioProjectSummary[]>;
  get(id: string): Promise<StudioProject | null>;
  create(input: CreateStudioProjectRequest): Promise<StudioProject>;
  update(id: string, patch: UpdateStudioProjectRequest): Promise<StudioProject | null>;
  remove(id: string): Promise<boolean>;
}

const now = () => new Date().toISOString();
const newProjectId = () => `stp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const summary = ({ prompt: _p, state: _s, ...rest }: StudioProject): StudioProjectSummary => rest;

/** A store kept in a Map; `persist` (if given) is called after every write with all projects. */
export function memoryStore(
  initial: StudioProject[] = [],
  persist?: (all: StudioProject[]) => void
): StudioStore {
  const map = new Map(initial.map((p) => [p.id, p]));
  const save = () => persist?.([...map.values()]);
  return {
    async list() {
      return [...map.values()].map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async create(input) {
      const t = now();
      const project: StudioProject = { id: newProjectId(), status: 'draft', createdAt: t, updatedAt: t, ...input };
      map.set(project.id, project);
      save();
      return project;
    },
    async update(id, patch) {
      const cur = map.get(id);
      if (!cur) return null;
      const next = { ...cur, ...stripUndefined(patch), updatedAt: now() } as StudioProject;
      map.set(id, next);
      save();
      return next;
    },
    async remove(id) {
      const ok = map.delete(id);
      if (ok) save();
      return ok;
    },
  };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

type Row = {
  id: string;
  name: string;
  template_id: string | null;
  prompt: string;
  status: StudioProject['status'];
  thumbnail: string | null;
  state_json: string;
  created_at: string;
  updated_at: string;
};

const fromRow = (r: Row): StudioProject => ({
  id: r.id,
  name: r.name,
  templateId: r.template_id,
  prompt: r.prompt,
  status: r.status,
  thumbnail: r.thumbnail,
  state: JSON.parse(r.state_json),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function d1Store(db: NonNullable<WorkerBindings['DB']>): StudioStore {
  const store: StudioStore = {
    async list() {
      const { results } = await db
        .prepare(
          'SELECT id, name, template_id, status, thumbnail, created_at, updated_at FROM studio_projects ORDER BY updated_at DESC LIMIT 100'
        )
        .bind()
        .all<Omit<Row, 'prompt' | 'state_json'>>();
      return results.map((r) => ({
        id: r.id,
        name: r.name,
        templateId: r.template_id,
        status: r.status,
        thumbnail: r.thumbnail,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    async get(id) {
      const row = await db.prepare('SELECT * FROM studio_projects WHERE id = ?').bind(id).first<Row>();
      return row ? fromRow(row) : null;
    },
    async create(input) {
      const t = now();
      const p: StudioProject = { id: newProjectId(), status: 'draft', createdAt: t, updatedAt: t, ...input };
      await db
        .prepare(
          'INSERT INTO studio_projects (id, name, template_id, prompt, status, thumbnail, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(p.id, p.name, p.templateId, p.prompt, p.status, p.thumbnail, JSON.stringify(p.state), t, t)
        .run();
      return p;
    },
    async update(id, patch) {
      const cur = await store.get(id);
      if (!cur) return null;
      const next = { ...cur, ...stripUndefined(patch), updatedAt: now() } as StudioProject;
      await db
        .prepare('UPDATE studio_projects SET name = ?, status = ?, thumbnail = ?, state_json = ?, updated_at = ? WHERE id = ?')
        .bind(next.name, next.status, next.thumbnail, JSON.stringify(next.state), next.updatedAt, id)
        .run();
      return next;
    },
    async remove(id) {
      await db.prepare('DELETE FROM studio_projects WHERE id = ?').bind(id).run();
      return true;
    },
  };
  return store;
}

let override: StudioStore | null = null;
let fallback: StudioStore | null = null;

/** Node dev injects a file-backed store (dev-server.ts); the Worker uses D1 when bound. */
export function setStudioStore(store: StudioStore) {
  override = store;
}

export function studioStore(env: WorkerBindings | undefined): StudioStore {
  if (override) return override;
  if (env?.DB) return d1Store(env.DB);
  return (fallback ??= memoryStore());
}
