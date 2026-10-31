import { ITEM_SIZE, type DemoProject, type Lane, type StudioItem } from './types';

/** Left edge of every lane; the lane label sits to its left. */
export const LANE_X = 160;
const GAP_X = 28;
const GAP_Y = 64;
const LANE_ORDER: Lane[] = ['inputs', 'fill', 'plates', 'takes', 'clips', 'cut', 'final', 'notes'];

let counter = 0;
export const newId = (prefix = 'item'): string => `${prefix}_${Date.now().toString(36)}${counter++}`;

const WRAP = 7;
const ROW_GAP = 24;

const rowHeight = (lane: Lane) =>
  lane === 'cut' ? ITEM_SIZE.cut.h : lane === 'final' ? ITEM_SIZE.final.h : lane === 'fill' ? ITEM_SIZE.fill.h : 196;

/** Top of each lane, given how many items each lane holds (lanes wrap at WRAP items per row). */
export function laneTops(counts: Partial<Record<Lane, number>>): Record<Lane, number> {
  const tops = {} as Record<Lane, number>;
  let y = 40;
  for (const lane of LANE_ORDER) {
    tops[lane] = y;
    const n = counts[lane] ?? 0;
    if (!n) continue;
    const rows = Math.ceil(n / WRAP);
    y += rows * rowHeight(lane) + (rows - 1) * ROW_GAP + GAP_Y;
  }
  return tops;
}

export function laneCounts(items: Array<{ lane: Lane }>): Partial<Record<Lane, number>> {
  const counts: Partial<Record<Lane, number>> = {};
  for (const i of items) counts[i.lane] = (counts[i.lane] ?? 0) + 1;
  return counts;
}

/** Place items left to right in their lane, in project order, wrapping every WRAP items. */
export function layoutProject(project: DemoProject): StudioItem[] {
  const tops = laneTops(laneCounts(project.items));
  const index = {} as Record<Lane, number>;
  const rowX = {} as Record<string, number>;
  const inputs = new Map<string, string[]>();
  for (const e of project.edges) inputs.set(e.to, [...(inputs.get(e.to) ?? []), e.from]);
  return project.items.map((raw) => {
    const n = index[raw.lane] ?? 0;
    index[raw.lane] = n + 1;
    const row = Math.floor(n / WRAP);
    const key = `${raw.lane}:${row}`;
    const x = rowX[key] ?? LANE_X;
    rowX[key] = x + ITEM_SIZE[raw.kind].w + GAP_X;
    const y = tops[raw.lane] + row * (rowHeight(raw.lane) + ROW_GAP);
    return { ...raw, x, y, inputs: inputs.get(raw.id) ?? [] };
  });
}

/** Where a new item goes: the notes lane, below everything else, after the last note. */
export function nextSlot(items: StudioItem[]): { x: number; y: number } {
  const notes = items.filter((i) => i.lane === 'notes');
  if (notes.length) return { x: Math.max(...notes.map((i) => i.x + ITEM_SIZE[i.kind].w)) + GAP_X, y: notes[0].y };
  const bottom = items.length ? Math.max(...items.filter((i) => i.lane !== 'notes').map((i) => i.y + ITEM_SIZE[i.kind].h)) : 0;
  return { x: LANE_X, y: bottom + GAP_Y };
}

export function edgesOf(items: StudioItem[]) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return items.flatMap((to) =>
    to.inputs.flatMap((fromId) => {
      const from = byId.get(fromId);
      return from ? [{ id: `${fromId}-${to.id}`, from, to }] : [];
    })
  );
}

/** Vertical curve from the bottom of the input to the top of the output (lanes stack downward). */
export function edgePath(from: StudioItem, to: StudioItem): string {
  const a = { x: from.x + ITEM_SIZE[from.kind].w / 2, y: from.y + ITEM_SIZE[from.kind].h };
  const b = { x: to.x + ITEM_SIZE[to.kind].w / 2, y: to.y };
  if (b.y <= a.y) {
    const a2 = { x: from.x + ITEM_SIZE[from.kind].w, y: from.y + ITEM_SIZE[from.kind].h / 2 };
    const b2 = { x: to.x, y: to.y + ITEM_SIZE[to.kind].h / 2 };
    const bend = Math.max(30, Math.abs(b2.x - a2.x) / 2);
    return `M ${a2.x} ${a2.y} C ${a2.x + bend} ${a2.y}, ${b2.x - bend} ${b2.y}, ${b2.x} ${b2.y}`;
  }
  const bend = Math.max(24, (b.y - a.y) / 2);
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + bend}, ${b.x} ${b.y - bend}, ${b.x} ${b.y}`;
}

export async function loadDemoProject(id: string): Promise<DemoProject> {
  const res = await fetch(`/demo/${id}/project.json`);
  if (!res.ok) throw new Error(`Demo project ${id} not found (${res.status})`);
  return res.json();
}

/** The step delay for the replayed agent run (ms). */
export const STEP_DELAY_MS = 1100;
