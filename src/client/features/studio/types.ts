export * from '../../../shared/studio';
import type { Lane, NodeKind } from '../../../shared/studio';

export const NODE_SIZE: Record<NodeKind, { w: number; h: number }> = {
  reference: { w: 216, h: 190 },
  template: { w: 216, h: 190 },
  product: { w: 216, h: 190 },
  cast: { w: 216, h: 190 },
  upload: { w: 216, h: 190 },
  fill: { w: 248, h: 214 },
  plate: { w: 216, h: 176 },
  image: { w: 216, h: 176 },
  take: { w: 216, h: 176 },
  clip: { w: 216, h: 190 },
  cut: { w: 312, h: 178 },
  final: { w: 312, h: 262 },
  note: { w: 264, h: 214 },
};

export const LANE_LABEL: Record<Lane, string> = {
  inputs: 'Inputs',
  fill: 'Plans & notes',
  plates: 'Plates & stills',
  takes: 'Audio',
  clips: 'Clips',
  cut: 'Cut',
  final: 'Final',
  notes: 'Notes',
};

export const KIND_LABEL: Record<NodeKind, string> = {
  reference: 'Reference video',
  template: 'Template',
  product: 'Product',
  cast: 'Presenter',
  upload: 'Upload',
  fill: 'Fill sheet',
  plate: 'Plate',
  image: 'Image',
  take: 'Audio',
  clip: 'Clip',
  cut: 'Cut',
  final: 'Final film',
  note: 'Note',
};

/** How each connection role is drawn. Anything not listed is a plain input. */
export const EDGE_STYLE: Record<string, { stroke: string; dash?: string; width: number; legend?: string }> = {
  'first frame': { stroke: 'var(--ink)', width: 1.6, legend: 'First / last frame' },
  'last frame': { stroke: 'var(--ink)', width: 1.6, legend: 'First / last frame' },
  'guide audio': { stroke: 'var(--accent)', dash: '6 4', width: 1.6, legend: 'Guide audio (lip-sync)' },
  reference: { stroke: 'var(--ink)', dash: '2 4', width: 1.4, legend: 'Reference' },
  voice: { stroke: 'var(--accent)', dash: '2 4', width: 1.4, legend: 'Voice reference' },
  edit: { stroke: 'var(--muted)', width: 1.3, legend: 'Image edit' },
  shot: { stroke: 'var(--control)', width: 1.2, legend: 'In the cut' },
  assemble: { stroke: 'var(--ink)', width: 1.6, legend: 'Assembled' },
  frames: { stroke: 'var(--muted)', dash: '1 3', width: 1.3, legend: 'Frames studied' },
};
export const DEFAULT_EDGE: { stroke: string; dash?: string; width: number; legend?: string } = { stroke: 'var(--control)', width: 1.2, legend: 'Input' };
