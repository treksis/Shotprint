import { create } from 'zustand';
import type { SessionItem, SessionView, StudioEvent } from './types';

/**
 * The open project's Muse Code session, folded from its event stream. Outside undo history: undo is
 * for the canvas layout, never the conversation.
 */
interface SessionStore extends SessionView {
  connected: boolean;
  order: string[];
  byId: Record<string, SessionItem>;
  apply: (e: StudioEvent) => void;
  reset: () => void;
  setConnected: (c: boolean) => void;
}

const EMPTY: SessionView = {
  status: 'offline',
  runnable: false,
  model: 'spark',
  activeTurnId: null,
  queued: [],
  items: [],
  todos: [],
  usd: 0,
  graph: { nodes: [], edges: [] },
};

export const useSession = create<SessionStore>()((set) => ({
  ...EMPTY,
  connected: false,
  order: [],
  byId: {},
  reset: () => set({ ...EMPTY, connected: false, order: [], byId: {} }),
  setConnected: (connected) => set({ connected }),
  apply: (e) =>
    set((s) => {
      switch (e.type) {
        case 'snapshot':
          return { ...e.view, order: e.view.items.map((i) => i.id), byId: Object.fromEntries(e.view.items.map((i) => [i.id, i])) };
        case 'item':
          return {
            order: s.byId[e.item.id] ? s.order : [...s.order, e.item.id],
            byId: { ...s.byId, [e.item.id]: e.item },
          };
        case 'delta': {
          const it = s.byId[e.id];
          if (!it) return {};
          let next: SessionItem = it;
          if (e.field === 'text') next = { ...it, text: (it.text ?? '') + e.delta };
          else if (e.field === 'output') next = { ...it, output: ((it.output ?? '') + e.delta).slice(-16000) };
          else if (e.field.startsWith('summary.')) {
            const k = Number(e.field.split('.')[1]) || 0;
            const summary = [...(it.summary ?? [])];
            summary[k] = (summary[k] ?? '') + e.delta;
            next = { ...it, summary };
          }
          return { byId: { ...s.byId, [e.id]: next } };
        }
        case 'status':
          return { status: e.status, activeTurnId: e.activeTurnId, queued: e.queued, error: e.error, model: e.model };
        case 'todos':
          return { todos: e.items };
        case 'usage':
          return { usd: e.usd };
        case 'graph':
          return { graph: e.graph };
      }
    }),
}));
