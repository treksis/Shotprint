import { Loader2, PanelRightClose, PanelRightOpen, Workflow } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getBudget, getProject, listTemplates, loadDemo, runDirector, steerRun, stopRun, updateProject, type Budget, type DirectorModel } from '../api';
import { Queue, QueueItem, QueueItemAction, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList } from '@/components/ai-elements/queue';
import { X } from 'lucide-react';
import { demoGraph, finishedText, newId, type Attachment } from '../lib';
import { history, snapshot, useStudio } from '../store';
import { NODE_SIZE, type Lane, type RunStep, type StudioMessage, type StudioNode, type StudioProject, type StudioTemplate } from '../types';
import { FlowCanvas } from './canvas/flow-canvas';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

type AgentMsg = Extract<StudioMessage, { role: 'agent' }>;
const STEP_MS = 1500;
const MODEL_KEY = 'museclone.director.model';

/** Where a node the director just made goes: under the last node of its lane, or in a new column. */
function placeNew(nodes: StudioNode[], lane: Lane, kind: StudioNode['kind']) {
  const inLane = nodes.filter((n) => n.lane === lane);
  if (inLane.length) {
    const last = inLane.reduce((a, b) => (b.y > a.y || (b.y === a.y && b.x > a.x) ? b : a));
    return { x: last.x, y: last.y + NODE_SIZE[last.kind].h + 18 };
  }
  const right = nodes.length ? Math.max(...nodes.map((n) => n.x + NODE_SIZE[n.kind].w)) + 140 : 0;
  const top = nodes.length ? Math.min(...nodes.map((n) => n.y)) : 0;
  return { x: right, y: top + (kind === 'note' ? 0 : 0) };
}

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
  const [retry, setRetry] = useState(0);
  const [model, setModel] = useState<DirectorModel>(() => (localStorage.getItem(MODEL_KEY) as DirectorModel) || 'spark');
  const [budget, setBudget] = useState<Budget | null>(null);
  const abort = useRef<AbortController | null>(null);
  const runId = useRef<string | null>(null);
  const [queued, setQueued] = useState<Array<{ id: string; text: string }>>([]);
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
      .catch((err: Error) => {
        // Only a missing project sends you home; a dev-server restart or network blip retries.
        if (!alive) return;
        if (/not_found|404/.test(err.message)) onMissing();
        else window.setTimeout(() => alive && setRetry((n) => n + 1), 1500);
      });
    return () => {
      alive = false;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, retry]);

  useEffect(() => {
    getBudget().then(setBudget).catch(() => setBudget(null));
  }, [isLive]);

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

  /** A live director turn: Muse with tools; steps, nodes and the reply stream in as they happen. */
  const direct = useCallback(
    async (text: string) => {
      const agentId = newId('m');
      const st = useStudio.getState();
      const chat = st.messages
        .filter((m) => (m.role === 'user' ? m.text : m.text))
        .slice(0, -1)
        .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: (m.role === 'user' ? m.text : m.text) ?? '' }));
      const canvas = {
        nodes: st.nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label, sub: n.sub, media: n.media ? { type: n.media.type, src: n.media.type === 'image' ? n.media.src : n.media.poster ?? n.media.src } : undefined })),
        edges: st.edges,
      };
      const chosen: DirectorModel = budget?.limits.models.includes(model) ? model : 'spark';
      setMessages((ms) => [...ms, { id: agentId, role: 'agent', steps: [], state: 'running', created: [] }]);
      setRunning(true);
      history().pause();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const stepIndex = new Map<string, number>();
      try {
        await runDirector(
          { model: chosen, text, history: chat, canvas, template: template ? { id: template.id, title: template.title, status: template.status } : null },
          (e) => {
            if (e.type === 'run') {
              runId.current = e.id;
            } else if (e.type === 'thinking') {
              patchAgent(agentId, (m) => ({ ...m, thinking: (m.thinking ?? '') + e.text }));
            } else if (e.type === 'stopped') {
              patchAgent(agentId, (m) => ({ ...m, state: 'stopped' }));
            } else if (e.type === 'step') {
              patchAgent(agentId, (m) => {
                const steps = [...m.steps];
                const s: RunStep = { text: e.text, lane: 'notes', cost: e.cost, status: e.status === 'failed' ? 'stopped' : e.status };
                if (stepIndex.has(e.id)) steps[stepIndex.get(e.id)!] = s;
                else {
                  stepIndex.set(e.id, steps.length);
                  steps.push(s);
                }
                return { ...m, steps };
              });
            } else if (e.type === 'node') {
              setNodes((ns) => {
                const i = ns.findIndex((n) => n.id === e.node.id);
                if (i >= 0) return ns.map((n) => (n.id === e.node.id ? { ...n, ...e.node, x: n.x, y: n.y } : n));
                const pos = placeNew(ns, e.node.lane, e.node.kind);
                return [...ns, { ...e.node, ...pos }];
              });
              if (e.edges?.length) setEdges((es) => [...es, ...e.edges!]);
              patchAgent(agentId, (m) => (m.created.includes(e.node.id) ? m : { ...m, created: [...m.created, e.node.id] }));
              setCanvasOpen(true);
              setFitSignal((n) => n + 1);
            } else if (e.type === 'edge') {
              setEdges((es) => [...es, e.edge]);
            } else if (e.type === 'delta') {
              patchAgent(agentId, (m) => ({ ...m, text: (m.text ?? '') + e.text }));
            } else if (e.type === 'text') {
              patchAgent(agentId, (m) => ({ ...m, text: e.text }));
            } else if (e.type === 'done') {
              patchAgent(agentId, (m) => ({ ...m, state: 'done', model: e.model, usd: e.usd }));
            } else if (e.type === 'error') {
              patchAgent(agentId, (m) => ({ ...m, state: 'blocked', text: e.message }));
            }
          },
          ctrl.signal
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') patchAgent(agentId, (m) => ({ ...m, state: 'blocked', text: `The director hit an error: ${(err as Error).message}` }));
      } finally {
        patchAgent(agentId, (m) => (m.state === 'running' ? { ...m, state: ctrl.signal.aborted ? 'stopped' : 'done' } : m));
        history().resume();
        abort.current = null;
        runId.current = null;
        setRunning(false);
        getBudget().then(setBudget).catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budget, model, template]
  );

  /** The director's answer to the latest brief. */
  const respond = useCallback(
    (text: string) => {
      const st = useStudio.getState();
      const firstBrief = !st.messages.some((m) => m.role === 'agent');
      const finished = st.nodes.some((n) => n.kind === 'final');
      // The template's showcase: its first brief replays the real, judged run.
      if (firstBrief && template?.status === 'ready' && template.example && !finished) return void replay(template);
      void direct(text);
    },
    [replay, direct, template]
  );

  // A new project arrives with the brief and no answer yet: answer it once.
  useEffect(() => {
    if (!project || running || answered.current) return;
    if (useStudio.getState().messages.at(-1)?.role === 'user') {
      answered.current = true;
      const last = useStudio.getState().messages.at(-1);
      respond(last?.role === 'user' ? last.text : '');
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
    window.setTimeout(() => respond(text), 50);
  };

  /** Mid-turn steering: shown in the chat now, read by the director before its next step. */
  const steer = async (text: string) => {
    const id = runId.current;
    if (!id) return queue(text);
    setMessages((ms) => {
      // Keep the steering message just above the running director message, in send order.
      const i = ms.length - 1;
      return [...ms.slice(0, i), { id: newId('m'), role: 'user', text, attachments: [], steer: true }, ms[i]];
    });
    const ok = await steerRun(id, text).catch(() => false);
    if (!ok) queue(text);
  };
  const queue = (text: string) => setQueued((q) => [...q, { id: newId('q'), text }]);

  // When a turn ends, the next queued message goes out by itself.
  useEffect(() => {
    if (running || !queued.length || !project) return;
    const [next, ...rest] = queued;
    setQueued(rest);
    void send(next.text, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, queued.length]);

  const stop = () => {
    if (runId.current) void stopRun(runId.current);
    abort.current?.abort();
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
          {queued.length > 0 && (
            <Queue className="mb-2 rounded-[18px] border-border bg-background px-2 py-1.5">
              <QueueList>
                {queued.map((q) => (
                  <QueueItem key={q.id}>
                    <div className="flex items-center gap-2">
                      <QueueItemIndicator />
                      <QueueItemContent>{q.text}</QueueItemContent>
                      <QueueItemActions>
                        <QueueItemAction aria-label="Remove from queue" onClick={() => setQueued((x) => x.filter((y) => y.id !== q.id))}>
                          <X className="size-3" />
                        </QueueItemAction>
                      </QueueItemActions>
                    </div>
                  </QueueItem>
                ))}
              </QueueList>
              <p className="px-2 pb-1 text-[11px] text-muted-foreground">Queued · sent when the director finishes</p>
            </Queue>
          )}
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            onStop={stop}
            onSteer={steer}
            onQueue={queue}
            running={running}
            placeholder={running ? 'Steer the director (Enter) or queue a message for later' : 'Ask the director: make keyframes, write a shot list, change a plate…'}
            model={model}
            onModelChange={(m) => {
              setModel(m);
              localStorage.setItem(MODEL_KEY, m);
            }}
            allowedModels={budget?.limits.models ?? ['spark']}
            footnote={
              budget
                ? `${budget.live ? 'Live' : 'Demo'} budget: ${Math.max(0, budget.limits.images - budget.used.images)} of ${budget.limits.images} images, $${budget.used.usd.toFixed(3)} of $${budget.limits.usd} used this session${budget.live ? '' : ' · Wonder needs Live mode'}`
                : undefined
            }
          />
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
