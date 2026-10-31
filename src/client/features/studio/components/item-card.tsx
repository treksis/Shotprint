import { ArrowRight, AudioLines, FileText, Film, ImageIcon, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ITEM_SIZE, KIND_LABEL, type StudioItem } from '../types';

function Thumb({ src, className }: { src?: string; className?: string }) {
  if (!src)
    return (
      <span className={cn('grid place-items-center bg-muted text-muted-foreground', className)}>
        <ImageIcon className="size-5" aria-hidden="true" />
      </span>
    );
  return <img src={src} alt="" draggable={false} className={cn('object-cover bg-muted', className)} />;
}

function Caption({ item, icon }: { item: StudioItem; icon?: React.ReactNode }) {
  return (
    <span className="block px-3 pt-2 pb-2.5">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
        {icon}
        <span className="truncate">{item.label}</span>
      </span>
      {item.sub && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{item.sub}</span>}
    </span>
  );
}

/** What one item looks like on the board. Position and dragging live in the canvas. */
export function ItemCard({ item, selected }: { item: StudioItem; selected: boolean }) {
  const { w, h } = ITEM_SIZE[item.kind];
  const frame = cn(
    'block overflow-hidden rounded-[12px] border bg-background text-left transition-colors',
    selected ? 'border-foreground' : 'border-border'
  );
  const style = { width: w, height: h };

  if (item.kind === 'plate') {
    const end = item.meta?.end as string | undefined;
    return (
      <span className={frame} style={style}>
        {end ? (
          <span className="flex items-center gap-1 p-1.5">
            <Thumb src={item.media?.src} className="aspect-video w-[100px] rounded-[6px]" />
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Thumb src={end} className="aspect-video w-[100px] rounded-[6px]" />
          </span>
        ) : (
          <Thumb src={item.media?.src} className="aspect-video w-full" />
        )}
        <Caption item={item} />
      </span>
    );
  }

  if (item.kind === 'fill') {
    const lines = Object.entries((item.meta?.lines ?? {}) as Record<string, string>);
    return (
      <span className={cn(frame, 'p-3')} style={style}>
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          <FileText className="size-3.5" aria-hidden="true" />
          {item.label}
        </span>
        <span className="mt-2 block space-y-1">
          {lines.slice(0, 6).map(([k, v]) => (
            <span key={k} className="flex gap-2 text-[12px] leading-snug">
              <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{k}</span>
              <span className="truncate">{v}</span>
            </span>
          ))}
        </span>
      </span>
    );
  }

  if (item.kind === 'cut') {
    const shots = (item.meta?.shots ?? []) as Array<{ t: [number, number]; label: string; poster?: string }>;
    const total = shots.length ? shots[shots.length - 1].t[1] : 30;
    return (
      <span className={cn(frame, 'p-3')} style={style}>
        <span className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium">{item.label}</span>
          <span className="text-[12px] text-muted-foreground">{item.sub}</span>
        </span>
        <span className="mt-3 flex h-[84px] gap-[2px] overflow-hidden rounded-[6px]">
          {shots.map((s, i) => (
            <span
              key={i}
              className="relative h-full overflow-hidden bg-muted"
              style={{ width: `${((s.t[1] - s.t[0]) / total) * 100}%` }}
              title={`${s.label} · ${s.t[0].toFixed(1)}–${s.t[1].toFixed(1)} s`}
            >
              {s.poster && <img src={s.poster} alt="" draggable={false} className="h-full w-full object-cover" />}
            </span>
          ))}
        </span>
        <span className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>0 s</span>
          <span>{total.toFixed(0)} s</span>
        </span>
      </span>
    );
  }

  if (item.kind === 'final') {
    const score = item.meta?.score as number | undefined;
    return (
      <span className={frame} style={style}>
        <Thumb src={item.media?.poster} className="aspect-video w-full" />
        <span className="flex items-center justify-between px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[14px] font-medium">
            <Film className="size-4" aria-hidden="true" />
            {item.label}
          </span>
          {score !== undefined && (
            <span className="rounded-[6px] bg-[var(--pill-positive-bg)] px-2 py-0.5 text-[13px] font-medium text-[var(--pill-positive-ink)] tabular-nums">
              {score.toFixed(2)} / 10
            </span>
          )}
        </span>
      </span>
    );
  }

  if (item.kind === 'note') {
    return (
      <span className={cn(frame, 'p-3')} style={style}>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <StickyNote className="size-3.5" aria-hidden="true" />
          Note
        </span>
        <span className="mt-1.5 line-clamp-4 block text-[13px] leading-snug">{item.text}</span>
      </span>
    );
  }

  const icon =
    item.kind === 'take' ? (
      <AudioLines className="size-3.5" aria-hidden="true" />
    ) : item.media?.type === 'video' ? (
      <Film className="size-3.5" aria-hidden="true" />
    ) : undefined;
  return (
    <span className={frame} style={style}>
      <Thumb
        src={item.media?.poster ?? (item.media?.type === 'image' ? item.media.src : undefined)}
        className={cn('w-full', item.kind === 'take' ? 'h-[96px]' : 'aspect-video')}
      />
      <Caption item={item} icon={icon} />
      <span className="sr-only">{KIND_LABEL[item.kind]}</span>
    </span>
  );
}
