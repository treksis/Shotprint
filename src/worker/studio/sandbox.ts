import type { DirectorModel, SessionView, StudioEdge, StudioEvent, StudioProject, TemplateDetail, TurnRequest } from '../../shared/studio';

/** A project's live Muse Code session and its workspace, wherever the sandbox runs. */
export interface ProjectSession {
  view(): SessionView;
  /** Sends a snapshot first, then every change. Returns the unsubscribe function. */
  subscribe(fn: (e: StudioEvent) => void): () => void;
  /** Sends the project's brief as the first turn, once. */
  start(): Promise<{ started: boolean }>;
  turn(req: TurnRequest): Promise<{ disposition: string }>;
  interrupt(): Promise<void>;
  unqueue(turnId: string): Promise<void>;
  setModel(model: DirectorModel): Promise<void>;
  serveFile(rel: string, range?: string | null): Promise<Response>;
  upload(name: string, data: ArrayBuffer): Promise<string>;
  setLinks(links: StudioEdge[]): Promise<void>;
}

/** Docker containers in node dev; Cloudflare Sandbox containers when deployed. */
export interface StudioSandbox {
  runnable(): Promise<boolean>;
  open(project: StudioProject): Promise<ProjectSession>;
  remove(projectId: string): Promise<void>;
  /** A ready template's cuts, storyboards and ingredient set (sandbox/templates/<id>). */
  templateDetail?(id: string): Promise<TemplateDetail | null>;
  templateFile?(id: string, rel: string, range?: string | null): Promise<Response>;
}

let impl: StudioSandbox | null = null;
export const setStudioSandbox = (s: StudioSandbox) => {
  impl = s;
};
export const studioSandbox = () => impl;
