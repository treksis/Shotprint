// Studio data contracts shared by the API server and the React client.
//
// A project is a Muse Code session running in its own sandbox. The chat is that session's item
// stream (MSP); the canvas is a live view of the sandbox's workspace folder.

export type NodeKind =
  | 'reference'
  | 'template'
  | 'product'
  | 'cast'
  | 'fill'
  | 'plate'
  | 'take'
  | 'clip'
  | 'cut'
  | 'final'
  | 'note'
  | 'upload'
  | 'image';

export type Lane = 'inputs' | 'fill' | 'plates' | 'takes' | 'clips' | 'cut' | 'final' | 'notes';

export type NodeStatus = 'pending' | 'running' | 'done' | 'failed';

export interface NodeMedia {
  type: 'image' | 'video' | 'audio';
  src: string;
  poster?: string;
}

/** A file in the workspace, shown on the canvas. `id` is its workspace-relative path. */
export interface StudioNode {
  id: string;
  kind: NodeKind;
  lane: Lane;
  label: string;
  sub?: string;
  x: number;
  y: number;
  status: NodeStatus;
  media?: NodeMedia;
  text?: string;
  meta?: Record<string, any>;
}

/** What one node gives another: "first frame", "guide audio", "edit", "shot"... `user` marks canvas wiring. */
export interface StudioEdge {
  from: string;
  to: string;
  role: string;
  user?: boolean;
}

export interface WorkspaceGraph {
  nodes: Array<Omit<StudioNode, 'x' | 'y'>>;
  edges: StudioEdge[];
}

/** One entry of the Muse Code transcript (an MSP view item, trimmed for the browser). */
export interface SessionItem {
  id: string;
  kind: 'userMessage' | 'agentMessage' | 'reasoning' | 'toolCall' | 'subagent' | 'workflow' | 'userShell' | (string & {});
  status: 'inProgress' | 'completed' | 'failed' | 'cancelled' | (string & {});
  turnId?: string;
  text?: string;
  summary?: string[];
  tool?: string;
  args?: Record<string, any>;
  commandText?: string;
  output?: string;
  exitCode?: number;
  durationMs?: number;
  steered?: boolean;
  at: number;
}

export interface TodoEntry {
  text: string;
  status: string;
  activeForm?: string;
}

export type SessionStatus = 'offline' | 'starting' | 'idle' | 'running' | 'error';

export type DirectorModel = 'spark' | 'wonder';

export const MODEL_IDS: Record<DirectorModel, string> = {
  spark: 'muse-spark-1.3-contributor',
  wonder: 'muse-wonder-1.0',
};

/** Everything the project page needs to render, sent on connect and kept current by events. */
export interface SessionView {
  status: SessionStatus;
  error?: string;
  /** Can this server start a sandbox at all (Docker in dev, a container binding in Cloudflare)? */
  runnable: boolean;
  model: DirectorModel;
  activeTurnId: string | null;
  queued: Array<{ turnId: string; text: string }>;
  items: SessionItem[];
  todos: TodoEntry[];
  usd: number;
  graph: WorkspaceGraph;
}

export type StudioEvent =
  | { type: 'snapshot'; view: SessionView }
  | { type: 'item'; item: SessionItem }
  | { type: 'delta'; id: string; field: string; delta: string }
  | { type: 'status'; status: SessionStatus; activeTurnId: string | null; queued: SessionView['queued']; error?: string; model: DirectorModel }
  | { type: 'todos'; items: TodoEntry[] }
  | { type: 'usage'; usd: number }
  | { type: 'graph'; graph: WorkspaceGraph };

export type TurnMode = 'send' | 'steer' | 'queue';

export interface TurnRequest {
  text: string;
  mode?: TurnMode;
  model?: DirectorModel;
  /** Workspace paths the person attached (uploads, or nodes dragged onto the chat). */
  files?: string[];
}

/** Canvas layout and the person's own wiring; the nodes themselves come from the workspace. */
export interface StudioState {
  positions: Record<string, { x: number; y: number }>;
}

export type ProjectStatus = 'draft' | 'running' | 'done';

export interface StudioProjectSummary {
  id: string;
  name: string;
  templateId: string | null;
  status: ProjectStatus;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudioProject extends StudioProjectSummary {
  prompt: string;
  state: StudioState;
}

export interface CreateStudioProjectRequest {
  name: string;
  prompt: string;
  templateId: string | null;
  thumbnail: string | null;
  state?: StudioState;
}

export interface UpdateStudioProjectRequest {
  name?: string;
  status?: ProjectStatus;
  thumbnail?: string | null;
  state?: StudioState;
}

export interface TemplateCut {
  /** 30 or 15. */
  seconds: number;
  duration: number;
  arc: string | null;
  shots: { n: number; from: number; start: number; end: number; board: string | null; action: string | null; shotSize: string | null }[];
  lines: { start: number; words: string }[];
}

/** The template page: what the cuts are made of. File paths are relative to the template folder. */
export interface TemplateDetail {
  id: string;
  summary: string;
  cuts: TemplateCut[];
  set: { file: string; kind: 'char' | 'product' | 'loc' | 'ui' | 'other' }[];
}

/** A dissected (ready) or not-yet-dissected (reference) film the director can rebuild. */
export interface StudioTemplate {
  id: string;
  title: string;
  source: string;
  status: 'ready' | 'reference';
  durationSec: number;
  shots: number;
  shotsMeasured: boolean;
  setups?: number;
  lines?: number;
  thumbnail: string;
  preview: string;
  description: string;
  prompt: string;
  /** Spot lengths a ready template makes, e.g. [30, 15]. */
  cuts?: number[];
  /** What kind of film it is, e.g. "Product reveal". */
  format?: string;
  /** Side-by-side proof per cut length: the real footage cut the same way | a blind rebuild from the template. */
  proof?: Partial<Record<'30' | '15', string>>;
  /** Films made from the template for a new product (not the source's), e.g. the demos for the pitch. */
  examples?: { title: string; video: string; poster?: string }[];
}
