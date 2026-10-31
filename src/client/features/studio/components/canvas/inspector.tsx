import { ArrowLeft, ArrowRight, MessageSquarePlus, X } from 'lucide-react';
import { KIND_LABEL, type StudioEdge, type StudioNode } from '../../types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-1.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export interface InspectorProps {
  node: StudioNode;
  nodes: StudioNode[];
  edges: StudioEdge[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onAttach: (id: string) => void;
}

/** The selected node: its media, how it was made, and what it connects to. */
export function Inspector({ node, nodes, edges, onClose, onSelect, onAttach }: InspectorProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const m = node.meta ?? {};
  const inputs = edges.filter((e) => e.to === node.id);
  const outputs = edges.filter((e) => e.from === node.id);
  const busy = node.status === 'pending' || node.status === 'running';

  const Link = ({ e, dir }: { e: StudioEdge; dir: 'in' | 'out' }) => {
    const other = byId.get(dir === 'in' ? e.from : e.to);
    if (!other) return null;
    return (
      <button
        type="button"
        onClick={() => onSelect(other.id)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px] hover:bg-muted"
      >
        {dir === 'in' ? <ArrowLeft className="size-3.5 text-muted-foreground" /> : <ArrowRight className="size-3.5 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">{other.label}</span>
        <span className="shrink-0 text-[12px] text-muted-foreground">{e.role}</span>
      </button>
    );
  };

  return (
    <aside aria-label={`${node.label} details`} className="absolute inset-y-3 right-3 z-20 flex w-[356px] flex-col overflow-hidden rounded-[16px] border border-border bg-background">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted-foreground">{KIND_LABEL[node.kind]}</p>
          <h3 className="truncate text-[15px] font-medium">{node.label}</h3>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {busy ? (
          <div className="mb-3 grid aspect-video place-items-center rounded-[10px] bg-muted text-[13px] text-muted-foreground">
            {node.status === 'running' ? 'Working on it…' : 'Queued'}
          </div>
        ) : (
          <>
            {node.media?.type === 'video' && (
              <video key={node.media.src} src={node.media.src} poster={node.media.poster} controls playsInline className="mb-3 w-full rounded-[10px] bg-black" />
            )}
            {node.media?.type === 'image' && <img src={node.media.src} alt="" className="mb-3 w-full rounded-[10px] bg-muted" />}
            {node.media?.type === 'audio' && <audio src={node.media.src} controls className="mb-3 w-full" />}
            {node.kind === 'plate' && m.end && (
              <>
                <p className="mb-1 text-[12px] text-muted-foreground">End frame (last_frame)</p>
                <img src={m.end} alt="" className="mb-3 w-full rounded-[10px] bg-muted" />
              </>
            )}
            {node.kind === 'cast' && m.voice && <audio src={m.voice} controls className="mb-3 w-full" />}
          </>
        )}

        {node.sub && node.sub !== m.mode && <Row label="Summary">{node.sub}</Row>}
        {m.mode && <Row label="Made with">{m.mode}</Row>}
        {m.line && <Row label="Line">“{m.line}”</Row>}
        {m.duration && <Row label="Length">{m.duration} s</Row>}
        {typeof m.at === 'number' && <Row label="On the cut">placed at {m.at.toFixed(2)} s, never retimed</Row>}
        {m.effect && <Row label="Effect">{m.effect}</Row>}
        {m.lock && <Row label="Product lock">{m.lock}</Row>}
        {node.text && <Row label="Text">{node.text}</Row>}

        {m.lines && (
          <div className="mt-2">
            <p className="mb-1 text-[12px] text-muted-foreground">Lines</p>
            {Object.entries(m.lines as Record<string, string>).map(([k, v]) => (
              <Row key={k} label={k}>
                “{v}”
              </Row>
            ))}
          </div>
        )}
        {m.shots && node.kind === 'fill' && (
          <div className="mt-2">
            <p className="mb-1 text-[12px] text-muted-foreground">Shots</p>
            {(m.shots as Array<{ n: number; t: string; setup: string; picture: string }>).map((s) => (
              <Row key={s.n} label={`${s.n} · ${s.t}`}>
                <span className="font-medium">{s.setup}</span> <span className="text-muted-foreground">{s.picture}</span>
              </Row>
            ))}
          </div>
        )}
        {m.frames && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {Object.entries(m.frames as Record<string, string>).map(([k, src]) => (
              <img key={k} src={src} alt={k} title={k.replace(/_/g, ' ')} className="aspect-video w-full rounded-[6px] object-cover" />
            ))}
          </div>
        )}
        {typeof m.score === 'number' && (
          <div className="mt-2">
            <Row label="Judge">
              <span className="font-medium tabular-nums">{m.score.toFixed(2)} / 10</span>
              <span className="text-muted-foreground"> · 3 passes, spread {m.spread}</span>
            </Row>
            {m.scores &&
              Object.entries(m.scores as Record<string, number>).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr_32px] items-center gap-3 py-1 text-[13px]">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ').replace('consistency', '')}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${v * 10}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{v.toFixed(1)}</span>
                </div>
              ))}
            {m.summary && <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{m.summary}</p>}
          </div>
        )}

        {inputs.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-[12px] text-muted-foreground">Made from</p>
            {inputs.map((e) => (
              <Link key={e.from} e={e} dir="in" />
            ))}
          </div>
        )}
        {outputs.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[12px] text-muted-foreground">Feeds</p>
            {outputs.map((e) => (
              <Link key={e.to} e={e} dir="out" />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => onAttach(node.id)}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] hover:bg-muted"
        >
          <MessageSquarePlus className="size-4" />
          Ask the director about this
        </button>
      </div>
    </aside>
  );
}
