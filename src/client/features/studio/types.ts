export * from '../../../shared/studio';
import type { Lane, NodeKind } from '../../../shared/studio';

/** Shape of public/demo/<id>/project.json, written by scripts/export_demo_project.py. */
export interface DemoProject {
  id: string;
  name: string;
  template: string;
  prompt: string;
  lanes: Lane[];
  items: Array<{
    id: string;
    kind: NodeKind;
    lane: Lane;
    label: string;
    sub?: string;
    media?: { type: 'image' | 'video' | 'audio'; src: string; poster?: string };
    meta?: Record<string, any>;
  }>;
  edges: Array<{ from: string; to: string; role: string }>;
  run: Array<{ text: string; lane: Lane; cost?: string }>;
}

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
  note: { w: 216, h: 120 },
};

export const LANE_LABEL: Record<Lane, string> = {
  inputs: 'Inputs',
  fill: 'Fill',
  plates: 'Plates & stills',
  takes: 'Voice takes',
  clips: 'Shots',
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
  take: 'Voice take',
  clip: 'Shot',
  cut: 'Cut',
  final: 'Final film',
  note: 'Note',
};

/** How each connection role is drawn. Anything not listed is a plain input. */
export const EDGE_STYLE: Record<string, { stroke: string; dash?: string; width: number; legend?: string }> = {
  'first + last frame': { stroke: 'var(--ink)', width: 1.6, legend: 'First + last frame' },
  'guide audio': { stroke: 'var(--accent)', dash: '6 4', width: 1.6, legend: 'Guide audio (lip-sync)' },
  reference: { stroke: 'var(--ink)', dash: '2 4', width: 1.4, legend: 'Reference' },
  'setup plate': { stroke: 'var(--muted)', width: 1.2 },
};
export const DEFAULT_EDGE: { stroke: string; dash?: string; width: number; legend?: string } = { stroke: 'var(--control)', width: 1.2, legend: 'Input' };
