import { useMemo } from 'react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import { layoutColumns, placeNew } from './lib';
import type { StudioEdge, StudioNode, WorkspaceGraph } from './types';

type Pos = { x: number; y: number };

/**
 * The canvas of the open project. Nodes are the workspace's files (from the sandbox, never undone);
 * undo/redo (zundo) covers what the person does to the canvas: where nodes sit and their own links.
 */
interface CanvasStore {
  graph: WorkspaceGraph;
  positions: Record<string, Pos>;
  links: StudioEdge[];
  selected: string[];
  load: (positions: Record<string, Pos>) => void;
  setGraph: (g: WorkspaceGraph) => void;
  move: (moves: Map<string, Pos>) => void;
  setLinks: (fn: (l: StudioEdge[]) => StudioEdge[]) => void;
  tidy: () => void;
  setSelected: (ids: string[]) => void;
}

/** Record at most one history entry per burst (a drag is one undo step, not sixty). */
function throttleLeading<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let last = 0;
  return (...a: A) => {
    const now = Date.now();
    if (now - last > ms) fn(...a);
    last = now;
  };
}

let linksLoaded = false;

export const useStudio = create<CanvasStore>()(
  temporal(
    (set, get) => ({
      graph: { nodes: [], edges: [] },
      positions: {},
      links: [],
      selected: [],
      load: (positions) => {
        linksLoaded = false;
        set({ graph: { nodes: [], edges: [] }, positions, links: [], selected: [] });
      },
      setGraph: (g) => {
        // Files the agent just made get a place on the canvas; that is not an undoable edit.
        const h = useStudio.temporal.getState();
        h.pause();
        const pos = { ...get().positions };
        const missing = g.nodes.filter((n) => !pos[n.id]);
        if (missing.length) {
          const placed = Object.keys(pos).length === 0 ? layoutColumns(g.nodes).placed : null;
          let laid: StudioNode[] = g.nodes.filter((n) => pos[n.id]).map((n) => ({ ...n, ...pos[n.id] }));
          for (const n of missing) {
            const p = placed?.get(n.id) ?? placeNew(laid, n.lane, n.kind);
            pos[n.id] = p;
            laid = [...laid, { ...n, ...p }];
          }
        }
        const patch: Partial<CanvasStore> = { graph: g, positions: pos };
        if (!linksLoaded) {
          linksLoaded = true;
          patch.links = g.edges.filter((e) => e.user);
        }
        set(patch);
        h.resume();
      },
      move: (moves) => set((s) => ({ positions: { ...s.positions, ...Object.fromEntries(moves) } })),
      setLinks: (fn) => set((s) => ({ links: fn(s.links) })),
      tidy: () => set((s) => ({ positions: { ...s.positions, ...Object.fromEntries(layoutColumns(s.graph.nodes).placed) } })),
      setSelected: (ids) => set({ selected: ids }),
    }),
    {
      partialize: (s) => ({ positions: s.positions, links: s.links }),
      equality: (a, b) => a.positions === b.positions && a.links === b.links,
      handleSet: (handleSet) => throttleLeading(handleSet, 400),
      limit: 100,
    }
  )
);

export const history = () => useStudio.temporal.getState();

/** Workspace files with their canvas positions. */
export function useCanvasNodes(): StudioNode[] {
  const graph = useStudio((s) => s.graph);
  const positions = useStudio((s) => s.positions);
  return useMemo(() => graph.nodes.map((n) => ({ ...n, ...(positions[n.id] ?? { x: 0, y: 0 }) })), [graph, positions]);
}

/** The agent's connections plus the person's own links. */
export function useCanvasEdges(): StudioEdge[] {
  const graph = useStudio((s) => s.graph);
  const links = useStudio((s) => s.links);
  return useMemo(() => [...graph.edges.filter((e) => !e.user), ...links.map((l) => ({ ...l, user: true }))], [graph, links]);
}
