import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { layoutProject, loadDemoProject, newId, nextSlot, STEP_DELAY_MS } from '../lib';
import { ITEM_SIZE, type DemoProject, type RunStep, type StudioItem, type StudioMessage } from '../types';
import { CanvasPanel } from './canvas-panel';
import { ChatPanel } from './chat-panel';

const MIN_CHAT = 320;
const MAX_CHAT = 640;
const SPLIT_KEY = 'museclone.studio.split';
const DEMO_ID = 'bluechip-v3';

type AgentMessage = Extract<StudioMessage, { role: 'agent' }>;

/** Attach poster frames to the cut's shot strip from the items it was cut from. */
function withCutPosters(items: StudioItem[]): StudioItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return items.map((i) =>
    i.kind !== 'cut'
      ? i
      : {
          ...i,
          meta: {
            ...i.meta,
            shots: (i.meta?.shots ?? []).map((s: any) => {
              const src = s.item ? byId.get(s.item) : undefined;
              return { ...s, poster: src?.media?.poster ?? (src?.media?.type === 'image' ? src.media.src : undefined) };
            }),
          },
        }
  );
}

/**
 * Phase 0: chat on the left, production canvas on the right, all in memory.
 * The demo project is a real template run (Meta VR Glasses on the BlueChip template); "sending" replays
 * that run lane by lane. Nothing is generated, saved or spent.
 */
export function StudioWorkspace() {
  const [project, setProject] = useState<DemoProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<StudioItem[]>([]);
  const [items, setItems] = useState<StudioItem[]>([]);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [chatDrop, setChatDrop] = useState(false);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'chat' | 'canvas'>('chat');
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(SPLIT_KEY) : 0);
    return saved >= MIN_CHAT && saved <= MAX_CHAT ? saved : 420;
  });
  const timers = useRef<number[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    loadDemoProject(DEMO_ID)
      .then((p) => {
        const laid = withCutPosters(layoutProject(p));
        setProject(p);
        setAll(laid);
        setItems(laid.filter((i) => i.lane === 'inputs'));
        setFitSignal((n) => n + 1);
      })
      .catch((e) => setError(String(e.message || e)));
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.filter((i) => i.id !== id).map((i) => ({ ...i, inputs: i.inputs.filter((x) => x !== id) }))
    );
    setAttachments((prev) => prev.filter((a) => a !== id));
    setSelectedId(null);
  }, []);

  const attach = useCallback((id: string) => setAttachments((prev) => (prev.includes(id) ? prev : [...prev, id])), []);

  const showFinished = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setRunning(false);
    setItems((prev) => [...all, ...prev.filter((i) => !all.some((a) => a.id === i.id))]);
    setFitSignal((n) => n + 1);
  };

  const send = (text: string) => {
    if (!project) return;
    const agentId = newId('msg');
    const attached = attachments;
    setAttachments([]);
    setMessages((prev) => [
      ...prev,
      { id: newId('msg'), role: 'user', text, attachments: attached },
      { id: agentId, role: 'agent', steps: [], state: 'running', created: [] },
    ]);
    setRunning(true);
    const patch = (fn: (m: AgentMessage) => AgentMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === agentId && m.role === 'agent' ? fn(m) : m)));

    project.run.forEach((step, index) => {
      timers.current.push(
        window.setTimeout(() => {
          patch((m) => ({
            ...m,
            steps: [
              ...m.steps.map((s): RunStep => ({ ...s, status: 'done' })),
              { ...step, status: 'running' },
            ],
          }));
          const reveal = all.filter((i) => i.lane === step.lane && !itemsRef.current.some((x) => x.id === i.id));
          if (reveal.length) {
            setItems((prev) => [...prev, ...reveal]);
            setFitSignal((n) => n + 1);
          }
        }, index * STEP_DELAY_MS)
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        const final = all.find((i) => i.kind === 'final');
        patch((m) => ({
          ...m,
          state: 'done',
          steps: m.steps.map((s): RunStep => ({ ...s, status: 'done' })),
          created: ['final', 'cut', 'fill'].filter((id) => all.some((i) => i.id === id)),
          summary: final?.meta?.score
            ? `Done. The film follows the template's 15 shots and scored ${final.meta.score.toFixed(2)} with the judge, with no major flaws. Open any plate or clip to see how it was made.`
            : 'Done.',
        }));
        setRunning(false);
        if (final) {
          setSelectedId(final.id);
          setFocus({ id: final.id, n: Date.now() });
        }
      }, project.run.length * STEP_DELAY_MS)
    );
  };

  const stop = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setMessages((prev) =>
      prev.map((m) =>
        m.role === 'agent' && m.state === 'running'
          ? {
              ...m,
              state: 'stopped',
              steps: m.steps.map((s): RunStep => ({ ...s, status: s.status === 'running' ? 'stopped' : s.status })),
            }
          : m
      )
    );
    setRunning(false);
  };

  /** Desktop files become upload items in the Inputs lane (object URLs; nothing is uploaded in Phase 0). */
  const addFiles = (files: File[], at?: { x: number; y: number }) => {
    const made: StudioItem[] = [];
    files.forEach((file, n) => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
      if (!type) return;
      const slot = at ?? nextSlot([...itemsRef.current, ...made]);
      made.push({
        id: newId('upload'),
        kind: 'upload',
        lane: 'notes',
        label: file.name,
        sub: `${type} · ${(file.size / 1e6).toFixed(1)} MB · not uploaded (preview)`,
        x: slot.x + (at ? n * 24 - ITEM_SIZE.upload.w / 2 : 0),
        y: slot.y + (at ? n * 24 - ITEM_SIZE.upload.h / 2 : 0),
        media: { type, src: URL.createObjectURL(file) },
        inputs: [],
      });
    });
    if (made.length) setItems((prev) => [...prev, ...made]);
    return made;
  };

  const addCopy = (source: StudioItem, at?: { x: number; y: number }) => {
    const slot = at
      ? { x: at.x - ITEM_SIZE[source.kind].w / 2, y: at.y - ITEM_SIZE[source.kind].h / 2 }
      : nextSlot(itemsRef.current);
    const copy: StudioItem = { ...source, id: newId(source.kind), lane: 'notes', x: slot.x, y: slot.y, inputs: [source.id] };
    setItems((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const dropOnChat = (files: File[], itemId: string | null) => {
    if (itemId) attach(itemId);
    for (const made of addFiles(files)) attach(made.id);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    let latest = startW;
    const move = (ev: PointerEvent) => {
      latest = Math.min(MAX_CHAT, Math.max(MIN_CHAT, startW + ev.clientX - startX));
      setChatWidth(latest);
    };
    const up = () => {
      localStorage.setItem(SPLIT_KEY, String(latest));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const assets = items.filter((i) => (i.lane === 'inputs' || i.kind === 'plate' || i.kind === 'upload') && i.media);
  const finished = items.length >= all.length && all.length > 0;

  return (
    <div className="mx-4 mb-4 flex h-[calc(100dvh-132px)] min-h-[560px] flex-col overflow-hidden rounded-[16px] border border-border bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <h1 className="truncate text-[16px] font-medium">{project?.name ?? 'Studio'}</h1>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">Preview · replay of a real run, nothing is generated</span>
        <span className="ml-auto" />
        {!finished && project && (
          <Button variant="outline" size="sm" onClick={showFinished}>
            Show finished project
          </Button>
        )}
        <fieldset className="m-0 inline-flex rounded-[8px] border-0 bg-muted p-0.5 lg:hidden">
          <legend className="sr-only">View</legend>
          {(['chat', 'canvas'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'h-8 rounded-[6px] px-3.5 text-[13px] font-medium capitalize cursor-pointer',
                tab === key ? 'bg-background text-foreground' : 'text-muted-foreground'
              )}
            >
              {key}
            </button>
          ))}
        </fieldset>
      </div>

      {error ? (
        <p className="p-6 text-[14px] text-[var(--negative)]">Couldn't load the demo project: {error}</p>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div
            className={cn('flex min-h-0 w-full flex-col lg:w-[var(--chat-w)] lg:shrink-0', tab !== 'chat' && 'max-lg:hidden')}
            style={{ '--chat-w': `${chatWidth}px` } as React.CSSProperties}
          >
            <ChatPanel
              messages={messages}
              items={items}
              attachments={attachments}
              running={running}
              dropActive={chatDrop}
              suggestions={project ? [project.prompt] : []}
              onSend={send}
              onStop={stop}
              onDetach={(id) => setAttachments((prev) => prev.filter((a) => a !== id))}
              onChip={(id) => {
                setSelectedId(id);
                setFocus({ id, n: Date.now() });
                setTab('canvas');
              }}
              onDropFiles={dropOnChat}
            />
          </div>
          <button
            type="button"
            aria-label="Resize chat"
            onPointerDown={startResize}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setChatWidth((w) => Math.max(MIN_CHAT, w - 24));
              if (e.key === 'ArrowRight') setChatWidth((w) => Math.min(MAX_CHAT, w + 24));
            }}
            className="w-px shrink-0 cursor-col-resize bg-border hover:bg-foreground focus-visible:bg-foreground max-lg:hidden"
          />
          <div className={cn('flex min-h-0 min-w-0 flex-1', tab !== 'canvas' && 'max-lg:hidden')}>
            <CanvasPanel
              items={items}
              assets={assets}
              selectedId={selectedId}
              focus={focus}
              fitSignal={fitSignal}
              onSelect={select}
              onMove={(id, x, y) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)))}
              onAddCopy={addCopy}
              onDropFiles={(files, at) => addFiles(files, at)}
              onRemove={removeItem}
              onAttach={attach}
              onDragToChat={setChatDrop}
            />
          </div>
        </div>
      )}
    </div>
  );
}
