import { NODE_SIZE, type CreateStudioProjectRequest, type Lane, type StudioNode, type StudioTemplate, type WorkspaceGraph } from './types';

/** Pipeline order, left to right on the canvas. */
export const LANE_ORDER: Lane[] = ['inputs', 'fill', 'plates', 'takes', 'clips', 'cut', 'final', 'notes'];
/** Lanes with many nodes stack in two sub-columns. */
const SUBCOLS: Partial<Record<Lane, number>> = { plates: 2, clips: 2 };
const COL_GAP = 120;
const ROW_GAP = 18;
const SUB_GAP = 16;

type Placeable = WorkspaceGraph['nodes'][number];

export interface LaneBox {
  lane: Lane;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay nodes out as columns in pipeline order, each column centred on the tallest one. */
export function layoutColumns(nodes: Placeable[]) {
  const byLane = new Map<Lane, Placeable[]>();
  for (const n of nodes) byLane.set(n.lane, [...(byLane.get(n.lane) ?? []), n]);
  const cols: Array<{ lane: Lane; items: Placeable[]; w: number; h: number; sub: number }> = [];
  for (const lane of LANE_ORDER) {
    const items = byLane.get(lane);
    if (!items?.length) continue;
    const sub = Math.min(SUBCOLS[lane] ?? 1, items.length);
    const colW = Math.max(...items.map((n) => NODE_SIZE[n.kind].w));
    const rows = Math.ceil(items.length / sub);
    const rowH = Math.max(...items.map((n) => NODE_SIZE[n.kind].h));
    cols.push({ lane, items, sub, w: sub * colW + (sub - 1) * SUB_GAP, h: rows * rowH + (rows - 1) * ROW_GAP });
  }
  const tallest = Math.max(0, ...cols.map((c) => c.h));
  const placed = new Map<string, { x: number; y: number }>();
  const boxes: LaneBox[] = [];
  let x = 0;
  for (const c of cols) {
    const top = (tallest - c.h) / 2;
    const colW = (c.w - (c.sub - 1) * SUB_GAP) / c.sub;
    const rowH = Math.max(...c.items.map((n) => NODE_SIZE[n.kind].h));
    c.items.forEach((n, i) => {
      const col = i % c.sub;
      const row = Math.floor(i / c.sub);
      placed.set(n.id, { x: x + col * (colW + SUB_GAP), y: top + row * (rowH + ROW_GAP) });
    });
    boxes.push({ lane: c.lane, x, y: top, w: c.w, h: c.h });
    x += c.w + COL_GAP;
  }
  return { placed, boxes };
}

/**
 * Where a new file goes: under the last node of its lane, or in a new column between the lanes
 * before and after it in pipeline order (at the far right when there are none after it).
 */
export function placeNew(nodes: StudioNode[], lane: Lane, kind: StudioNode['kind']) {
  const inLane = nodes.filter((n) => n.lane === lane);
  if (inLane.length) {
    const last = inLane.reduce((a, b) => (b.y > a.y || (b.y === a.y && b.x > a.x) ? b : a));
    return { x: last.x, y: last.y + NODE_SIZE[last.kind].h + ROW_GAP };
  }
  const order = LANE_ORDER.indexOf(lane);
  const before = nodes.filter((n) => LANE_ORDER.indexOf(n.lane) < order);
  const top = nodes.length ? Math.min(...nodes.map((n) => n.y)) : 0;
  const x = before.length ? Math.max(...before.map((n) => n.x + NODE_SIZE[n.kind].w)) + COL_GAP : nodes.length ? Math.min(...nodes.map((n) => n.x)) - NODE_SIZE[kind].w - COL_GAP : 0;
  return { x, y: top };
}

export function laneBoxes(nodes: StudioNode[]): LaneBox[] {
  const byLane = new Map<Lane, StudioNode[]>();
  for (const n of nodes) if (n.lane !== 'notes') byLane.set(n.lane, [...(byLane.get(n.lane) ?? []), n]);
  return [...byLane].map(([lane, ns]) => {
    const x = Math.min(...ns.map((n) => n.x));
    const y = Math.min(...ns.map((n) => n.y));
    return {
      lane,
      x,
      y,
      w: Math.max(...ns.map((n) => n.x + NODE_SIZE[n.kind].w)) - x,
      h: Math.max(...ns.map((n) => n.y + NODE_SIZE[n.kind].h)) - y,
    };
  });
}

/** A new project: the brief and the template; the workspace is made when it first opens. */
export function newProject(prompt: string, template: StudioTemplate | null): CreateStudioProjectRequest {
  return {
    name: template ? `${template.title}: ${prompt.slice(0, 40)}` : prompt.slice(0, 60) || 'Untitled project',
    prompt,
    templateId: template?.id ?? null,
    thumbnail: template?.thumbnail ?? null,
    state: { positions: {} },
  };
}

