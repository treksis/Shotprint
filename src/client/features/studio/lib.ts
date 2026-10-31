import { loadDemo } from './api';
import {
  NODE_SIZE,
  type CreateStudioProjectRequest,
  type DemoProject,
  type Lane,
  type StudioEdge,
  type StudioNode,
  type StudioState,
  type StudioTemplate,
} from './types';

let counter = 0;
export const newId = (prefix = 'n') => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Pipeline order, left to right on the canvas. */
export const LANE_ORDER: Lane[] = ['inputs', 'fill', 'plates', 'takes', 'clips', 'cut', 'final', 'notes'];
/** Lanes with many nodes stack in two sub-columns. */
const SUBCOLS: Partial<Record<Lane, number>> = { plates: 2, clips: 2 };
const COL_GAP = 120;
const ROW_GAP = 18;
const SUB_GAP = 16;

export interface LaneBox {
  lane: Lane;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay nodes out as columns in pipeline order, each column centred on the tallest one. */
export function layoutColumns(nodes: Array<Omit<StudioNode, 'x' | 'y' | 'status'> & Partial<StudioNode>>) {
  const byLane = new Map<Lane, typeof nodes>();
  for (const n of nodes) byLane.set(n.lane, [...(byLane.get(n.lane) ?? []), n]);
  const cols: Array<{ lane: Lane; items: typeof nodes; w: number; h: number; sub: number }> = [];
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

/** Re-flow every node into its lane column (used when nodes arrive or after "Tidy up"). */
export function relayout(nodes: StudioNode[]): StudioNode[] {
  const { placed } = layoutColumns(nodes);
  return nodes.map((n) => ({ ...n, ...placed.get(n.id)! }));
}

export function laneBoxes(nodes: StudioNode[]): LaneBox[] {
  const byLane = new Map<Lane, StudioNode[]>();
  for (const n of nodes) byLane.set(n.lane, [...(byLane.get(n.lane) ?? []), n]);
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

/** Output port (right middle) to input port (left middle). */
export function ports(from: StudioNode, to: StudioNode) {
  const a = { x: from.x + NODE_SIZE[from.kind].w, y: from.y + NODE_SIZE[from.kind].h / 2 };
  const b = { x: to.x, y: to.y + NODE_SIZE[to.kind].h / 2 };
  return { a, b };
}

export function edgePath(from: StudioNode, to: StudioNode): { d: string; mid: { x: number; y: number } } {
  const { a, b } = ports(from, to);
  const bend = Math.max(48, Math.abs(b.x - a.x) * 0.5);
  const d = `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
  return { d, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

/** Demo project -> canvas nodes (all done) and edges. */
export function demoGraph(demo: DemoProject): { nodes: StudioNode[]; edges: StudioEdge[] } {
  const withPosters = demo.items.map((i) => {
    if (i.kind !== 'cut') return i;
    const byId = new Map(demo.items.map((x) => [x.id, x]));
    return {
      ...i,
      meta: {
        ...i.meta,
        shots: (i.meta?.shots ?? []).map((s: any) => {
          const src = s.item ? byId.get(s.item) : undefined;
          return { ...s, poster: src?.media?.poster ?? (src?.media?.type === 'image' ? src.media.src : undefined) };
        }),
      },
    };
  });
  const { placed } = layoutColumns(withPosters);
  return {
    nodes: withPosters.map((i) => ({ ...i, ...placed.get(i.id)!, status: 'done' as const })),
    edges: demo.edges,
  };
}

/** Only edges whose two ends are on the canvas. */
export const liveEdges = (state: StudioState) => {
  const ids = new Set(state.nodes.map((n) => n.id));
  return state.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
};

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
}

/** Initial state for a new project: the user's brief plus the inputs the director starts from. */
export async function initialProject(
  prompt: string,
  template: StudioTemplate | null,
  attachments: Attachment[]
): Promise<CreateStudioProjectRequest> {
  let nodes: StudioNode[] = [];
  let edges: StudioEdge[] = [];
  if (template?.status === 'ready' && template.example) {
    const g = demoGraph(await loadDemo(template.example.demoId));
    nodes = g.nodes.filter((n) => n.lane === 'inputs');
    edges = g.edges;
  } else if (template) {
    nodes = [
      {
        id: 'ref',
        kind: 'reference',
        lane: 'inputs',
        label: 'Reference ad',
        sub: `${template.source} · ${template.durationSec.toFixed(0)} s`,
        x: 0,
        y: 0,
        status: 'done',
        media: { type: 'video', src: template.preview, poster: template.thumbnail },
      },
    ];
  }
  for (const a of attachments)
    nodes.push({
      id: newId('upload'),
      kind: 'upload',
      lane: 'inputs',
      label: a.name,
      sub: `${a.type} · uploaded`,
      x: 0,
      y: 0,
      status: 'done',
      media: { type: a.type, src: a.url },
    });
  nodes = relayout(nodes);
  const name = template?.example ? `${template.example.product} × ${template.title}` : template ? template.title : prompt.slice(0, 48);
  return {
    name,
    prompt,
    templateId: template?.id ?? null,
    thumbnail: template?.thumbnail ?? null,
    state: {
      nodes,
      edges,
      messages: [{ id: newId('m'), role: 'user', text: prompt, attachments: attachments.map((a) => a.name), templateId: template?.id }],
    },
  };
}

/** Sample projects so a first-time reviewer sees a populated workspace. */
export async function seedProjects(templates: StudioTemplate[]): Promise<CreateStudioProjectRequest[]> {
  const ready = templates.find((t) => t.status === 'ready' && t.example);
  const out: CreateStudioProjectRequest[] = [];
  for (const t of templates.filter((x) => x.status === 'reference').slice(0, 2)) {
    const p = await initialProject(t.prompt, t, []);
    p.name = `Sample: ${t.title}`;
    p.state.messages.push({
      id: newId('m'),
      role: 'agent',
      steps: [],
      state: 'blocked',
      created: [],
      text: 'This reference has not been dissected yet. Dissection measures every cut, camera move and line, and needs Live mode.',
    });
    out.push(p);
  }
  if (ready?.example) {
    const demo = await loadDemo(ready.example.demoId);
    const g = demoGraph(demo);
    out.push({
      name: `Sample: ${ready.example.product} × ${ready.title}`,
      prompt: ready.prompt,
      templateId: ready.id,
      thumbnail: g.nodes.find((n) => n.kind === 'final')?.media?.poster ?? ready.thumbnail,
      state: {
        nodes: g.nodes,
        edges: g.edges,
        messages: [
          { id: newId('m'), role: 'user', text: ready.prompt, attachments: [], templateId: ready.id },
          {
            id: newId('m'),
            role: 'agent',
            steps: demo.run.map((s) => ({ ...s, status: 'done' as const })),
            state: 'done',
            created: ['final', 'cut', 'fill'],
            text: finishedText(g.nodes),
          },
        ],
      },
    });
  }
  return out;
}

export function finishedText(nodes: StudioNode[]): string {
  const final = nodes.find((n) => n.kind === 'final');
  const score = final?.meta?.score as number | undefined;
  const shots = nodes.find((n) => n.kind === 'cut')?.meta?.shots?.length;
  return score
    ? `The film follows the template's ${shots ?? 15} shots and scored ${score.toFixed(2)} out of 10 with the judge, with no major flaws. Open any node on the canvas to see what it was made from.`
    : 'Done.';
}
