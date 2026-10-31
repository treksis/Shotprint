import { Loader2, PanelRightClose, PanelRightOpen, Workflow } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getProject, listTemplates, loadDemo, updateProject } from '../api';
import { demoGraph, finishedText, newId, type Attachment } from '../lib';
import { history, snapshot, useStudio } from '../store';
import type { RunStep, StudioMessage, StudioProject, StudioTemplate } from '../types';
import { FlowCanvas } from './canvas/flow-canvas';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

type AgentMsg = Extract<StudioMessage, { role: 'agent' }>;
const STEP_MS = 1500;

export interface StudioProjectPageProps {
  projectId: string;
  isLive: boolean;
  onRequestLive: (reason?: string) => void;
  onProjectsChanged: () => void;
  onMissing: () => void;
}

/**
 * /studio/:id: the chat with the director, and the production canvas as an artifact panel beside it.
 * Demo mode replays the template's real run node by node; Live tools arrive in Phase 2.
 */
export function StudioProjectPage({ projectId, isLive, onRequestLive, onProjectsChanged, onMissing }: StudioProjectPageProps) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [template, setTemplate] = useState<StudioTemplate | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const nodes = useStudio((s) => s.nodes);
  const timers = useRef<number[]>([]);
  const status = useRef<StudioProject['status']>('draft');
  const extra = useRef<{ thumbnail?: string | null }>({});
  const answered = useRef(false);
  const loaded = useRef(false);

  const { setNodes, setEdges, setMessages, setSelected } = useStudio.getState();
  const patchAgent = (id: string, fn: (m: AgentMsg) => AgentMsg) =>
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === 'agent' ? fn(m) : m)));

  // Load the project into the store (history starts empty).
  useEffect(() => {
    let alive = true;
    loaded.current = false;
    Promise.all([getProject(projectId), listTemplates()])
      .then(([p, ts]) => {
        if (!alive) return;
        const s = p.state;
        useStudio.getState().load({
          ...s,
          // A run interrupted by a reload is marked stopped, not left spinning.
          nodes: s.nodes.filter((n) => n.status === 'done'),
          messages: s.messages.map((m) =>
            m.role === 'agent' && m.state === 'running'
              ? { ...m, state: 'stopped', steps: m.steps.map((x) => (x.status === 'done' ? x : { ...x, status: 'stopped' })) }
              : m
          ),
        });
        history().clear();
        status.current = p.status === 'running' ? 'draft' : p.status;
        setProject(p);
        setTemplate(ts.find((t) => t.id === p.templateId) ?? null);
        setCanvasOpen(s.nodes.length > 0);
        setFitSignal((n) => n + 1);
        loaded.current = true;
      })
      .catch(() => alive && onMissing());
    return () => {
      alive = false;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Persist every change to the canvas or chat (debounced); status/thumbnail changes refresh the sidebar.
  useEffect(() => {
    let t: number | null = null;
    let lastStatus = status.current;
    const unsub = useStudio.subscribe((s, prev) => {
      if (!loaded.current || (s.nodes === prev.nodes && s.edges === prev.edges && s.messages === prev.messages)) return;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const changed = status.current !== lastStatus;
        lastStatus = status.current;
        updateProject(projectId, { state: snapshot(), status: status.current, thumbnail: extra.current.thumbnail })
          .then(() => changed && onProjectsChanged())
          .catch(() => undefined);
      }, 600);
    });
    return () => {
      unsub();
      if (t) window.clearTimeout(t);
    };
  }, [projectId, onProjectsChanged]);

  /** Demo: replay the template's real run, lane by lane, node by node. Not part of undo history. */
  const replay = useCallback(async (tpl: StudioTemplate) => {
    const demo = await loadDemo(tpl.example!.demoId);
    const g = demoGraph(demo);
    const agentId = newId('m');
    status.current = 'running';
    history().pause();
    setRunning(true);
    setCanvasOpen(true);
    setEdges(() => g.edges);
    setMessages((ms) => [...ms, { id: agentId, role: 'agent', steps: demo.run.map((r) => ({ ...r, status: 'pending' as const })), state: 'running', created: [] }]);
    let t = 0;
    demo.run.forEach((step, i) => {
      const laneNodes = g.nodes.filter((n) => n.lane === step.lane);
      const at = t;
      const dur = Math.max(STEP_MS, Math.min(4200, laneNodes.length * 260));
      timers.current.push(
        window.setTimeout(() => {
          patchAgent(agentId, (m) => ({ ...m, steps: m.steps.map((s, j): RunStep => ({ ...s, status: j < i ? 'done' : j === i ? 'running' : 'pending' })) }));
          setNodes((ns) => {
            const have = new Set(ns.map((n) => n.id));
            const add = laneNodes.filter((n) => !have.has(n.id)).map((n) => ({ ...n, status: 'pending' as const }));
            return add.length ? [...ns, ...add] : ns;
          });
          if (laneNodes.length) setFitSignal((n) => n + 1);
        }, at)
      );
      laneNodes.forEach((n, k) => {
        const start = at + 200 + (k / Math.max(1, laneNodes.length)) * (dur - 500);
        timers.current.push(window.setTimeout(() => setNodes((ns) => ns.map((x) => (x.id === n.id && x.status === 'pending' ? { ...x, status: 'running' } : x))), start));
        timers.current.push(window.setTimeout(() => setNodes((ns) => ns.map((x) => (x.id === n.id ? { ...x, status: 'done' } : x))), start + 450));
      });
      t += dur;
    });
    timers.current.push(
      window.setTimeout(() => {
        const final = g.nodes.find((n) => n.kind === 'final');
        status.current = 'done';
        extra.current.thumbnail = final?.media?.poster ?? null;
        setNodes((ns) => ns.map((n) => ({ ...n, status: 'done' })));
        patchAgent(agentId, (m) => ({
          ...m,
          state: 'done',
          steps: m.steps.map((x) => ({ ...x, status: 'done' })),
          created: ['final', 'cut', 'fill'],
          text: finishedText(g.nodes),
        }));
        history().clear();
        history().resume();
        setRunning(false);
        if (final) {
          setSelected([final.id]);
          setFocus({ id: final.id, n: Date.now() });
        }
      }, t + 300)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The director's answer to the latest brief. */
  const respond = useCallback(
    (tpl: StudioTemplate | null) => {
      const finished = useStudio.getState().nodes.some((n) => n.kind === 'final');
      const say = (text: string, blocked = true) =>
        setMessages((ms) => [...ms, { id: newId('m'), role: 'agent', steps: [], state: blocked ? 'blocked' : 'done', created: [], text }]);
      if (tpl?.status === 'ready' && tpl.example && !finished) return void replay(tpl);
      if (finished)
        return say(
          isLive
            ? 'Editing a finished film with live tools (retake a shot, swap a plate) is the next step being wired up. You can already rearrange, connect and undo on the canvas, and open any node to see how it was made.'
            : "This project is a replay of a real run, so the director can't re-render it in demo mode. You can still rearrange, connect and undo on the canvas. In Live mode the director retakes shots and swaps plates on request.",
          !isLive
        );
      if (tpl)
        return say(
          isLive
            ? `**${tpl.title}** hasn't been dissected yet. Live dissection (cuts, camera moves, lines) is being wired up next; the BlueChip template is ready today.`
            : `**${tpl.title}** hasn't been dissected yet. Dissection measures every cut, camera move and line, and it runs Muse and the GPU, so it needs Live mode. The BlueChip template is ready to try in the demo.`
        );
      say('I make videos by filling a dissected template: a real film taken apart into shots, camera setups and lines. Pick one from the gallery on the Studio page, or attach a reference video to dissect in Live mode.');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replay, isLive]
  );

  // A new project arrives with the brief and no answer yet: answer it once.
  useEffect(() => {
    if (!project || running || answered.current) return;
    if (useStudio.getState().messages.at(-1)?.role === 'user') {
      answered.current = true;
      respond(template);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const send = async (text: string, attachments: Attachment[]) => {
    setDraft('');
    if (attachments.length) {
      // Attached files land on the canvas too, in the Notes lane after everything else.
      setNodes((ns) => {
        const bottom = ns.length ? Math.max(...ns.map((n) => n.y + 260)) : 0;
        return [
          ...ns,
          ...attachments.map((a, i) => ({
            id: newId('upload'),
            kind: 'upload' as const,
            lane: 'notes' as const,
            label: a.name,
            sub: `${a.type} · uploaded`,
            x: i * 240,
            y: bottom,
            status: 'done' as const,
            media: { type: a.type, src: a.url },
          })),
        ];
      });
      setCanvasOpen(true);
    }
    setMessages((ms) => [...ms, { id: newId('m'), role: 'user', text, attachments: attachments.map((a) => a.name) }]);
    window.setTimeout(() => respond(template), 600);
  };

  const stop = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    status.current = 'draft';
    setNodes((ns) => ns.filter((n) => n.status === 'done'));
    setMessages((ms) =>
      ms.map((m) =>
        m.role === 'agent' && m.state === 'running'
          ? { ...m, state: 'stopped', steps: m.steps.map((x) => (x.status === 'done' ? x : { ...x, status: 'stopped' })) }
          : m
      )
    );
    history().clear();
    history().resume();
    setRunning(false);
  };

  if (!project) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showCanvas = canvasOpen && nodes.length > 0;
  const doneCount = nodes.filter((n) => n.status === 'done').length;
  const score = nodes.find((n) => n.kind === 'final')?.meta?.score as number | undefined;
  const suggestions = nodes.some((n) => n.kind === 'final') ? ['Retake the field shot with the product locked', 'Make a vertical 9:16 edition'] : [];

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <section
        data-chat-drop
        aria-label="Chat with the director"
        className={cn('flex min-h-0 flex-col', showCanvas ? 'w-[440px] shrink-0 border-r border-border max-lg:hidden' : 'flex-1')}
      >
        <ChatThread
          canvasOpen={showCanvas}
          isLive={isLive}
          suggestions={running ? [] : suggestions}
          onSuggestion={setDraft}
          onOpenCanvas={() => {
            setCanvasOpen(true);
            setFitSignal((n) => n + 1);
          }}
          onChip={(id) => {
            setCanvasOpen(true);
            setSelected([id]);
            setFocus({ id, n: Date.now() });
          }}
          onGoLive={() => onRequestLive()}
        />
        <div className={cn('mx-auto w-full px-4 pb-4', !showCanvas && 'max-w-[760px]')}>
          <Composer value={draft} onChange={setDraft} onSubmit={send} onStop={stop} running={running} placeholder="Reply to the director" />
        </div>
      </section>

      {showCanvas ? (
        <section aria-label="Production canvas" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--chrome)]">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
            <Workflow className="size-4 text-muted-foreground" />
            <h2 className="truncate text-[14px] font-medium">{project.name}</h2>
            {running ? (
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {doneCount} of {nodes.length} ready
              </span>
            ) : score !== undefined ? (
              <span className="rounded-[6px] bg-[var(--pill-positive-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--pill-positive-ink)]">
                Finished · {score.toFixed(2)} / 10
              </span>
            ) : (
              <span className="text-[12px] text-muted-foreground">{nodes.length} nodes</span>
            )}
            <button
              type="button"
              aria-label="Close canvas"
              onClick={() => setCanvasOpen(false)}
              className="ml-auto grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted"
            >
              <PanelRightClose className="size-4" />
            </button>
          </header>
          <FlowCanvas
            focus={focus}
            fitSignal={fitSignal}
            readOnly={running}
            onAttach={(id) => {
              const n = useStudio.getState().nodes.find((x) => x.id === id);
              if (n) setDraft((d) => `${d}${d ? ' ' : ''}[${n.label}] `);
            }}
          />
        </section>
      ) : (
        nodes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCanvasOpen(true);
              setFitSignal((n) => n + 1);
            }}
            className="absolute top-3 right-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-[13px] hover:bg-muted"
          >
            <PanelRightOpen className="size-4" />
            Canvas · {nodes.length} nodes
          </button>
        )
      )}
    </div>
  );
}
