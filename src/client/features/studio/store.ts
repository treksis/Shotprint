import { create } from 'zustand';
import { temporal } from 'zundo';
import type { StudioEdge, StudioMessage, StudioNode, StudioState } from './types';

/**
 * One store per open project. Undo/redo (zundo) covers the canvas only: nodes and edges.
 * Chat messages and selection are outside history, so undo never rewrites the conversation.
 */
interface StudioStore {
  nodes: StudioNode[];
  edges: StudioEdge[];
  messages: StudioMessage[];
  selected: string[];
  load: (s: StudioState) => void;
  setNodes: (fn: (n: StudioNode[]) => StudioNode[]) => void;
  setEdges: (fn: (e: StudioEdge[]) => StudioEdge[]) => void;
  setMessages: (fn: (m: StudioMessage[]) => StudioMessage[]) => void;
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

export const useStudio = create<StudioStore>()(
  temporal(
    (set) => ({
      nodes: [],
      edges: [],
      messages: [],
      selected: [],
      load: (s) => set({ nodes: s.nodes, edges: s.edges, messages: s.messages, selected: [] }),
      setNodes: (fn) => set((st) => ({ nodes: fn(st.nodes) })),
      setEdges: (fn) => set((st) => ({ edges: fn(st.edges) })),
      setMessages: (fn) => set((st) => ({ messages: fn(st.messages) })),
      setSelected: (ids) => set({ selected: ids }),
    }),
    {
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges }),
      equality: (a, b) => a.nodes === b.nodes && a.edges === b.edges,
      handleSet: (handleSet) => throttleLeading(handleSet, 400),
      limit: 100,
    }
  )
);

export const history = () => useStudio.temporal.getState();
export const snapshot = (): StudioState => {
  const s = useStudio.getState();
  return { nodes: s.nodes, edges: s.edges, messages: s.messages };
};
