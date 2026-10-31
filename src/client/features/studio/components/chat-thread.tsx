import { Check, Clapperboard, Loader2, PanelRightOpen, Workflow } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { KIND_LABEL, type StudioMessage, type StudioNode } from '../types';

export interface ChatThreadProps {
  messages: StudioMessage[];
  nodes: StudioNode[];
  canvasOpen: boolean;
  isLive: boolean;
  onOpenCanvas: () => void;
  onChip: (id: string) => void;
  onGoLive: () => void;
}

function Chip({ node, onClick }: { node: StudioNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-background pr-2.5 pl-1 text-[13px] hover:border-[#c9c9c6]"
    >
      {node.media?.poster || node.media?.type === 'image' ? (
        <img src={node.media.poster ?? node.media.src} alt="" className="h-6 w-9 rounded-[6px] object-cover" />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-muted">
          <Workflow className="size-3" />
        </span>
      )}
      <span className="text-muted-foreground">{KIND_LABEL[node.kind]}</span>
      <span className="max-w-[140px] truncate font-medium">{node.label}</span>
    </button>
  );
}

/** The conversation: your briefs, and the director's steps, results and the canvas card. */
export function ChatThread({ messages, nodes, canvasOpen, isLive, onOpenCanvas, onChip, onGoLive }: ChatThreadProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  const done = nodes.filter((n) => n.status === 'done').length;
  const working = nodes.some((n) => n.status === 'running' || n.status === 'pending');

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-7 px-5 pt-6 pb-10">
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex flex-col items-end gap-1.5">
              <p className="max-w-[85%] rounded-[18px] bg-[var(--chrome)] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
              {m.attachments.length > 0 && <p className="text-[12px] text-muted-foreground">{m.attachments.join(', ')}</p>}
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#1a4be0] text-[#ffffff]">
                <Clapperboard className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-[13px] font-medium text-muted-foreground">Director</p>
                {m.steps.length > 0 && (
                  <ol className="overflow-hidden rounded-[14px] border border-border">
                    {m.steps.map((s, i) => (
                      <li key={i} className={cn('flex items-start gap-2.5 px-3.5 py-2.5 text-[14px]', i > 0 && 'border-t border-border')}>
                        <span className="mt-[3px] grid size-4 shrink-0 place-items-center">
                          {s.status === 'done' ? (
                            <Check className="size-4 text-[var(--positive)]" />
                          ) : s.status === 'running' ? (
                            <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
                          ) : (
                            <span className="size-2 rounded-full border border-[var(--control)]" />
                          )}
                        </span>
                        <span className={cn('min-w-0 flex-1 leading-snug', s.status === 'pending' || s.status === 'stopped' ? 'text-muted-foreground' : 'text-foreground')}>
                          {s.text}
                        </span>
                        {s.cost && <span className="shrink-0 pt-px text-[12px] tabular-nums text-muted-foreground">{s.cost}</span>}
                      </li>
                    ))}
                  </ol>
                )}

                {nodes.length > 0 && (m.state === 'running' || m.state === 'done') && m === messages.filter((x) => x.role === 'agent').at(-1) && (
                  <button
                    type="button"
                    onClick={onOpenCanvas}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-background p-2.5 text-left hover:border-[#c9c9c6]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--chrome)]">
                      {working ? <Loader2 className="size-4 animate-spin text-[var(--accent)]" /> : <Workflow className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">Production canvas</span>
                      <span className="block text-[12px] text-muted-foreground">
                        {working ? `${done} of ${nodes.length} nodes ready` : `${nodes.length} nodes`}
                      </span>
                    </span>
                    {!canvasOpen && (
                      <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-muted px-2.5 py-1 text-[12px] font-medium">
                        <PanelRightOpen className="size-3.5" />
                        Open
                      </span>
                    )}
                  </button>
                )}

                {m.text && <p className="text-[15px] leading-relaxed">{m.text}</p>}
                {m.state === 'blocked' && !isLive && (
                  <button
                    type="button"
                    onClick={onGoLive}
                    className="inline-flex h-9 cursor-pointer items-center rounded-[10px] bg-foreground px-3.5 text-[14px] font-medium text-background"
                  >
                    Enter the judge passcode
                  </button>
                )}
                {m.state === 'stopped' && <p className="text-[14px] text-muted-foreground">Stopped. Send the brief again to restart.</p>}
                {m.state === 'done' && m.created.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.created.map((id) => {
                      const n = byId.get(id);
                      return n ? <Chip key={id} node={n} onClick={() => onChip(id)} /> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        {messages.at(-1)?.role === 'user' && (
          <div className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#1a4be0] text-[#ffffff]">
              <Clapperboard className="size-3.5" />
            </span>
            <span className="mt-1.5 flex gap-1" aria-label="The director is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="studio-dot size-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
