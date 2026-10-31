import { ArrowUp, Check, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ITEM_DRAG_TYPE, KIND_LABEL, type StudioItem, type StudioMessage } from '../types';

export interface ChatPanelProps {
  messages: StudioMessage[];
  items: StudioItem[];
  attachments: string[];
  running: boolean;
  dropActive: boolean;
  suggestions: string[];
  onSend: (text: string) => void;
  onStop: () => void;
  onDetach: (id: string) => void;
  onChip: (id: string) => void;
  onDropFiles: (files: File[], itemId: string | null) => void;
}

function Chip({ item, onClick, onRemove }: { item: StudioItem; onClick: () => void; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-7 items-center rounded-[6px] bg-muted text-[12px] font-medium">
      <button
        type="button"
        onClick={onClick}
        className="h-full rounded-[6px] px-2.5 hover:bg-[var(--sidebar-accent)] cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {['plate', 'clip', 'take'].includes(item.kind) ? `${KIND_LABEL[item.kind]} · ${item.label}` : item.label}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.label} from the message`}
          onClick={onRemove}
          className="mr-1 grid size-5 place-items-center rounded-[4px] hover:bg-[var(--sidebar-accent)] cursor-pointer"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export function ChatPanel({
  messages,
  items,
  attachments,
  running,
  dropActive,
  suggestions,
  onSend,
  onStop,
  onDetach,
  onChip,
  onDropFiles,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [over, setOver] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const byId = new Map(items.map((item) => [item.id, item]));
  useEffect(() => {
    // Scroll only the message list; scrollIntoView would also scroll the page.
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text || running) return;
    onSend(text);
    setDraft('');
  };

  return (
    <section
      data-chat-drop
      aria-label="Chat with the director"
      className={cn('relative flex min-h-0 flex-1 flex-col bg-background', (over || dropActive) && 'bg-muted')}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropFiles([...e.dataTransfer.files], e.dataTransfer.getData(ITEM_DRAG_TYPE) || null);
      }}
    >
      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="pt-8">
            <p className="text-[18px] font-medium">What are we making?</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
              The director fills a dissected template with your product: plates for every camera setup, voice takes,
              shots, the cut, then a judged final. Every step lands on the canvas.
            </p>
            <ul className="mt-4 space-y-1.5">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setDraft(s)}
                    className="w-full rounded-[8px] bg-muted px-3 py-2 text-left text-[14px] hover:bg-[var(--sidebar-accent)] cursor-pointer"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex flex-col items-end gap-1.5">
              <p className="max-w-[88%] rounded-[12px] bg-muted px-3.5 py-2.5 text-[14px] whitespace-pre-wrap">
                {message.text}
              </p>
              {message.attachments.length > 0 && (
                <span className="flex flex-wrap justify-end gap-1">
                  {message.attachments.map((id) => {
                    const item = byId.get(id);
                    return item ? <Chip key={id} item={item} onClick={() => onChip(id)} /> : null;
                  })}
                </span>
              )}
            </div>
          ) : (
            <div key={message.id} className="space-y-2.5">
              <ol className="space-y-1.5 text-[13px]">
                {message.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    {step.status === 'done' ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          step.status === 'running' ? 'bg-[var(--accent)]' : 'bg-[var(--control)]'
                        )}
                      />
                    )}
                    <span className={cn('leading-snug', step.status === 'done' && 'text-foreground')}>{step.text}</span>
                    {step.cost && <span className="ml-auto shrink-0 pl-2 tabular-nums">{step.cost}</span>}
                  </li>
                ))}
              </ol>
              {message.state === 'done' && (
                <>
                  {message.summary && <p className="text-[14px] leading-relaxed">{message.summary}</p>}
                  <span className="flex flex-wrap gap-1">
                    {message.created.map((id) => {
                      const item = byId.get(id);
                      return item ? <Chip key={id} item={item} onClick={() => onChip(id)} /> : null;
                    })}
                  </span>
                </>
              )}
              {message.state === 'stopped' && (
                <p className="text-[14px] text-muted-foreground">Stopped. Nothing further was made.</p>
              )}
            </div>
          )
        )}
      </div>

      <div className="border-t border-border p-3">
        {attachments.length > 0 && (
          <span className="mb-2 flex flex-wrap gap-1">
            {attachments.map((id) => {
              const item = byId.get(id);
              return item ? (
                <Chip key={id} item={item} onClick={() => onChip(id)} onRemove={() => onDetach(id)} />
              ) : null;
            })}
          </span>
        )}
        <div className="flex items-end gap-2 rounded-[12px] border border-border bg-background p-2 focus-within:border-foreground">
          <textarea
            value={draft}
            rows={2}
            aria-label="Message the director"
            placeholder={dropActive || over ? 'Drop to attach' : 'Describe the ad, or drop files here'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-muted-foreground"
          />
          {running ? (
            <Button size="icon" variant="outline" aria-label="Stop" onClick={onStop}>
              <Square />
            </Button>
          ) : (
            <Button size="icon" aria-label="Send" disabled={!draft.trim()} onClick={submit}>
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
