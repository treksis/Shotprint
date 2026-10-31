// Studio data contracts shared by the Worker API and the React client.

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

/** What one node gives another: "first + last frame", "guide audio", "shot", "assemble"... */
export interface StudioEdge {
  from: string;
  to: string;
  role: string;
}

export interface RunStep {
  text: string;
  lane: Lane;
  cost?: string;
  status: 'pending' | 'running' | 'done' | 'stopped';
}

export type StudioMessage =
  | { id: string; role: 'user'; text: string; attachments: string[]; templateId?: string }
  | {
      id: string;
      role: 'agent';
      steps: RunStep[];
      state: 'running' | 'done' | 'stopped' | 'blocked';
      created: string[];
      text?: string;
      /** Live turns: which model ran and what the turn cost. Replays have neither. */
      model?: string;
      usd?: number;
    };

export interface StudioState {
  nodes: StudioNode[];
  edges: StudioEdge[];
  messages: StudioMessage[];
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
  state: StudioState;
}

export interface UpdateStudioProjectRequest {
  name?: string;
  status?: ProjectStatus;
  thumbnail?: string | null;
  state?: StudioState;
}

/** A dissected (ready) or not-yet-dissected (reference) ad the director can rebuild. */
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
  /** A finished run built on this template, replayed in demo mode. */
  example?: { demoId: string; product: string; score: number };
}
