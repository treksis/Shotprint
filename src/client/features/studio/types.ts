/** Studio canvas model. Phase 0: in memory, seeded from a demo project (public/demo/<id>/project.json). */

export type ItemKind =
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
  | 'upload';

export type Lane = 'inputs' | 'fill' | 'plates' | 'takes' | 'clips' | 'cut' | 'final' | 'notes';

export interface ItemMedia {
  type: 'image' | 'video' | 'audio';
  src: string;
  poster?: string;
}

export interface StudioItem {
  id: string;
  kind: ItemKind;
  lane: Lane;
  label: string;
  sub?: string;
  x: number;
  y: number;
  media?: ItemMedia;
  text?: string;
  meta?: Record<string, any>;
  /** Ids of the items this one was made from, drawn as lines. */
  inputs: string[];
}

export interface RunStep {
  text: string;
  lane: Lane;
  cost?: string;
  status: 'running' | 'done' | 'stopped';
}

export type StudioMessage =
  | { id: string; role: 'user'; text: string; attachments: string[] }
  | {
      id: string;
      role: 'agent';
      steps: RunStep[];
      state: 'running' | 'done' | 'stopped';
      /** Items the run created, shown as chips. */
      created: string[];
      summary?: string;
    };

/** Shape of public/demo/<id>/project.json, written by scripts/export_demo_project.py. */
export interface DemoProject {
  id: string;
  name: string;
  template: string;
  prompt: string;
  lanes: Lane[];
  items: Array<Omit<StudioItem, 'x' | 'y' | 'inputs'>>;
  edges: Array<{ from: string; to: string }>;
  run: Array<{ text: string; lane: Lane; cost?: string }>;
}

export const ITEM_SIZE: Record<ItemKind, { w: number; h: number }> = {
  reference: { w: 232, h: 196 },
  template: { w: 232, h: 196 },
  product: { w: 232, h: 196 },
  cast: { w: 232, h: 196 },
  fill: { w: 300, h: 196 },
  plate: { w: 232, h: 186 },
  take: { w: 208, h: 168 },
  clip: { w: 232, h: 186 },
  cut: { w: 760, h: 176 },
  final: { w: 380, h: 300 },
  note: { w: 232, h: 132 },
  upload: { w: 208, h: 186 },
};

export const LANE_LABEL: Record<Lane, string> = {
  inputs: 'Inputs',
  fill: 'Fill',
  plates: 'Plates',
  takes: 'Voice takes',
  clips: 'Clips',
  cut: 'Cut',
  final: 'Final',
  notes: 'Notes',
};

export const KIND_LABEL: Record<ItemKind, string> = {
  reference: 'Reference ad',
  template: 'Template',
  product: 'Product',
  cast: 'Presenter',
  fill: 'Fill sheet',
  plate: 'Plate',
  take: 'Voice take',
  clip: 'Clip',
  cut: 'Cut',
  final: 'Final',
  note: 'Note',
  upload: 'Upload',
};

export const ITEM_DRAG_TYPE = 'application/x-museclone-item';
