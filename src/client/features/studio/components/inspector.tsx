import { MessageSquarePlus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KIND_LABEL, type StudioItem } from '../types';

export interface InspectorProps {
  item: StudioItem;
  items: StudioItem[];
  onClose: () => void;
  onAttach: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-1.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/** Details of the selected item, docked inside the canvas (no new page, no sheet). */
export function Inspector({ item, items, onClose, onAttach, onRemove, onSelect }: InspectorProps) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const meta = item.meta ?? {};
  const media = item.media;

  return (
    <aside
      aria-label={`${item.label} details`}
      className="absolute inset-y-3 right-3 z-20 flex w-[340px] flex-col overflow-hidden rounded-[12px] border border-border bg-background"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] text-muted-foreground">{KIND_LABEL[item.kind]}</p>
          <h2 className="truncate text-[15px] font-medium">{item.label}</h2>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {media?.type === 'video' && (
          <video
            key={media.src}
            src={media.src}
            poster={media.poster}
            controls
            playsInline
            className="mb-3 w-full rounded-[8px] bg-black"
          />
        )}
        {media?.type === 'image' && (
          <img src={media.src} alt="" className="mb-3 w-full rounded-[8px] bg-muted" />
        )}
        {item.kind === 'plate' && meta.end && (
          <>
            <p className="mb-1 text-[12px] text-muted-foreground">End frame</p>
            <img src={meta.end} alt="" className="mb-3 w-full rounded-[8px] bg-muted" />
          </>
        )}
        {item.kind === 'cast' && meta.voice && (
          <audio src={meta.voice} controls className="mb-3 w-full" />
        )}

        {item.sub && <Row label="Summary">{item.sub}</Row>}
        {meta.mode && <Row label="Mode">{meta.mode}</Row>}
        {meta.line && <Row label="Line">“{meta.line}”</Row>}
        {meta.duration && <Row label="Length">{meta.duration} s</Row>}
        {typeof meta.at === 'number' && <Row label="Placed at">{meta.at.toFixed(2)} s on the timeline</Row>}
        {meta.effect && <Row label="Effect">{meta.effect}</Row>}
        {meta.lock && <Row label="Product lock">{meta.lock}</Row>}
        {item.text && <Row label="Text">{item.text}</Row>}

        {meta.lines && (
          <div className="mt-2">
            <p className="mb-1 text-[12px] text-muted-foreground">Lines</p>
            {Object.entries(meta.lines as Record<string, string>).map(([k, v]) => (
              <Row key={k} label={k}>“{v}”</Row>
            ))}
          </div>
        )}
        {meta.shots && item.kind === 'fill' && (
          <div className="mt-2">
            <p className="mb-1 text-[12px] text-muted-foreground">Shots</p>
            {(meta.shots as Array<{ n: number; t: string; setup: string; picture: string }>).map((s) => (
              <Row key={s.n} label={`${s.n} · ${s.t}`}>
                <span className="font-medium">{s.setup}</span> {s.picture}
              </Row>
            ))}
          </div>
        )}
        {meta.frames && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {Object.entries(meta.frames as Record<string, string>).map(([k, src]) => (
              <img key={k} src={src} alt={k} title={k} className="aspect-video w-full rounded-[4px] object-cover" />
            ))}
          </div>
        )}
        {typeof meta.score === 'number' && (
          <div className="mt-2">
            <Row label="Judge">
              <span className="font-medium tabular-nums">{meta.score.toFixed(2)} / 10</span>
              <span className="text-muted-foreground"> · spread {meta.spread} over 3 passes</span>
            </Row>
            {meta.scores &&
              Object.entries(meta.scores as Record<string, number>).map(([k, v]) => (
                <Row key={k} label={k.replace(/_/g, ' ')}>
                  <span className="tabular-nums">{v.toFixed(1)}</span>
                </Row>
              ))}
            {meta.summary && <p className="mt-2 text-[13px] leading-relaxed">{meta.summary}</p>}
          </div>
        )}

        {item.inputs.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px] text-muted-foreground">Made from</p>
            <div className="flex flex-wrap gap-1">
              {item.inputs.map((id) => {
                const input = byId.get(id);
                return input ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelect(id)}
                    className="h-7 rounded-[6px] bg-muted px-2.5 text-[12px] font-medium hover:bg-[var(--sidebar-accent)] cursor-pointer"
                  >
                    {input.label}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-t border-border p-2">
        <Button variant="ghost" size="sm" onClick={() => onAttach(item.id)}>
          <MessageSquarePlus />
          Ask about this
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onRemove(item.id)}>
          <Trash2 />
          Remove
        </Button>
      </div>
    </aside>
  );
}
