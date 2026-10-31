import { AlertCircle, ArrowRight, AudioLines, Check, Clapperboard, FileText, Film, ImageIcon, Layers, Loader2, Package, Scissors, StickyNote, Upload, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KIND_LABEL, NODE_SIZE, type NodeKind, type StudioNode } from '../../types';

const ICON: Record<NodeKind, typeof Film> = {
  reference: Film,
  template: Layers,
  product: Package,
  cast: User,
  upload: Upload,
  fill: FileText,
  plate: ImageIcon,
  take: AudioLines,
  clip: Clapperboard,
  cut: Scissors,
  final: Film,
  note: StickyNote,
};

function Status({ node }: { node: StudioNode }) {
  if (node.status === 'running') return <Loader2 className="size-3.5 animate-spin text-[var(--accent)]" aria-label="Running" />;
  if (node.status === 'pending') return <span className="size-2 rounded-full border border-[var(--control)]" aria-label="Queued" />;
  if (node.status === 'failed') return <AlertCircle className="size-3.5 text-[var(--negative)]" aria-label="Failed" />;
  return <Check className="size-3.5 text-[var(--positive)]" aria-label="Done" />;
}

/** Tags shown under a node: how it was made (FL2V, guide audio) or what it holds. */
function tags(node: StudioNode): string[] {
  const m = node.meta ?? {};
  const out: string[] = [];
  if (m.mode) out.push(...String(m.mode).split(' + ').map((s) => (s === 'guide audio' ? '+ guide audio' : s)));
  if (node.kind === 'plate' && m.end) out.push('start + end');
  if (m.effect) out.push('effect');
  if (node.kind === 'clip' && m.duration) out.push(`${m.duration}s`);
  return out;
}

function Media({ node, className }: { node: StudioNode; className: string }) {
  const src = node.media?.poster ?? (node.media?.type === 'image' ? node.media.src : undefined);
  if (node.status === 'pending' || node.status === 'running')
    return (
      <span className={cn('relative block overflow-hidden bg-muted', className)}>
        <span className="studio-indeterminate absolute inset-x-0 bottom-0 h-[2px]" />
      </span>
    );
  if (!src)
    return (
      <span className={cn('grid place-items-center bg-muted text-muted-foreground', className)}>
        <ImageIcon className="size-5" />
      </span>
    );
  return <img src={src} alt="" draggable={false} className={cn('block bg-muted object-cover', className)} />;
}

export function NodeCard({ node, selected, related }: { node: StudioNode; selected: boolean; related: boolean }) {
  const { w, h } = NODE_SIZE[node.kind];
  const Icon = ICON[node.kind];
  const pending = node.status === 'pending';
  const t = tags(node);
  const label = pending ? KIND_LABEL[node.kind] : node.label;

  const body = () => {
    if (node.kind === 'fill') {
      const lines = Object.entries((node.meta?.lines ?? {}) as Record<string, string>);
      return pending ? (
        <span className="block space-y-2 px-3 pt-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="block h-2.5 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 9}%` }} />
          ))}
        </span>
      ) : (
        <span className="block space-y-1.5 px-3 pt-1">
          {lines.map(([k, v]) => (
            <span key={k} className="flex gap-2 text-[12px] leading-snug">
              <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{k}</span>
              <span className="truncate">{v}</span>
            </span>
          ))}
        </span>
      );
    }
    if (node.kind === 'cut') {
      const shots = (node.meta?.shots ?? []) as Array<{ t: [number, number]; label: string; poster?: string }>;
      const total = shots.length ? shots[shots.length - 1].t[1] : 30;
      return (
        <span className="block px-3 pt-1">
          <span className="flex h-[72px] gap-[2px] overflow-hidden rounded-[8px] bg-muted">
            {!pending &&
              shots.map((s, i) => (
                <span key={i} className="h-full overflow-hidden" style={{ width: `${((s.t[1] - s.t[0]) / total) * 100}%` }} title={`${s.label} · ${s.t[0]}–${s.t[1]} s`}>
                  {s.poster && <img src={s.poster} alt="" draggable={false} className="h-full w-full object-cover" />}
                </span>
              ))}
          </span>
          <span className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>0 s</span>
            <span>{shots.length} shots</span>
            <span>{total.toFixed(0)} s</span>
          </span>
        </span>
      );
    }
    if (node.kind === 'plate' && node.meta?.end && !pending) {
      return (
        <span className="flex items-center gap-1 px-2">
          <Media node={node} className="aspect-video w-[94px] rounded-[6px]" />
          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          <img src={node.meta.end} alt="" draggable={false} className="aspect-video w-[94px] rounded-[6px] bg-muted object-cover" />
        </span>
      );
    }
    if (node.kind === 'note') return <span className="line-clamp-3 block px-3 text-[13px] leading-snug">{node.text}</span>;
    return (
      <span className="block px-2">
        <Media node={node} className={cn('w-full rounded-[8px]', node.kind === 'final' ? 'aspect-video' : node.kind === 'plate' || node.kind === 'take' ? 'h-[92px]' : 'aspect-video')} />
      </span>
    );
  };

  return (
    <span
      className={cn(
        'relative flex flex-col overflow-hidden rounded-[14px] border bg-background text-left transition-[border-color,box-shadow,opacity] duration-150',
        pending && 'border-dashed',
        selected ? 'border-foreground ring-2 ring-foreground/10' : related ? 'border-[#9a9a96]' : 'border-border'
      )}
      style={{ width: w, height: h }}
    >
      <span className="flex h-9 shrink-0 items-center gap-1.5 px-3">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', pending && 'text-muted-foreground')}>{label}</span>
        <Status node={node} />
      </span>
      <span className="min-h-0 flex-1">{body()}</span>
      <span className="flex h-8 shrink-0 items-center gap-1 overflow-hidden px-3">
        {node.kind === 'final' && typeof node.meta?.score === 'number' && !pending ? (
          <span className="rounded-[6px] bg-[var(--pill-positive-bg)] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[var(--pill-positive-ink)]">
            Judge {node.meta.score.toFixed(2)} / 10
          </span>
        ) : t.length && !pending ? (
          t.map((x) => (
            <span key={x} className="shrink-0 rounded-[5px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {x}
            </span>
          ))
        ) : (
          <span className="truncate text-[11px] text-muted-foreground">
            {node.status === 'running' ? 'Working…' : pending ? 'Queued' : node.sub}
          </span>
        )}
      </span>
    </span>
  );
}
