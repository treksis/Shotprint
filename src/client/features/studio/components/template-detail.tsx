import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getJudgeModeState } from '../../../lib/api';
import { getTemplate, templateFileUrl } from '../api';
import type { StudioTemplate, TemplateDetail } from '../types';

const KIND_LABEL: Record<TemplateDetail['set'][number]['kind'], string> = {
  char: 'Cast',
  product: 'Product',
  loc: 'Places',
  ui: 'Screens & graphics',
  other: 'Other',
};

/**
 * A ready template, opened: the proof (the real film cut to 30 or 15 s next to a rebuild made blind from
 * the template), the cut as a storyboard strip, its lines, and the ingredient set.
 */
export function TemplateDetailDialog({
  template,
  onClose,
  onUse,
}: {
  template: StudioTemplate | null;
  onClose: () => void;
  onUse: (t: StudioTemplate, seconds: number) => void;
}) {
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!template) return;
    setSeconds(template.cuts?.[0] ?? 30);
    setDetail(null);
    setLoading(true);
    getTemplate(template.id)
      .then((d) => setDetail(d.detail))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [template]);

  const t = template;
  const cut = detail?.cuts.find((c) => c.seconds === seconds) ?? null;
  // The deployed demo serves footage that isn't ours (benchmarks, reference ads) to judges only.
  const locked = import.meta.env.PROD && !getJudgeModeState();
  const proof = locked ? undefined : t?.proof?.[String(seconds) as '30' | '15'];
  const groups = (['char', 'product', 'loc', 'ui', 'other'] as const)
    .map((k) => ({ k, files: detail?.set.filter((s) => s.kind === k) ?? [] }))
    .filter((g) => g.files.length);

  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[1040px]">
        {t && (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
              <div className="min-w-0">
                <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{t.format ?? 'Template'}</p>
                <DialogTitle className="mt-1 text-[24px] font-medium">{t.title}</DialogTitle>
                <DialogDescription className="mt-1 text-[14px]">{t.source}</DialogDescription>
              </div>
              {t.cuts && t.cuts.length > 1 && (
                <div role="tablist" aria-label="Spot length" className="flex rounded-full bg-muted p-1">
                  {t.cuts.map((s) => (
                    <button
                      key={s}
                      role="tab"
                      type="button"
                      aria-selected={seconds === s}
                      onClick={() => setSeconds(s)}
                      className={cn(
                        'h-8 cursor-pointer rounded-full px-4 text-[13px] font-medium tabular-nums transition-colors',
                        seconds === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {s} s spot
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pt-5">
              {proof ? (
                <figure>
                  <video
                    key={proof}
                    src={proof}
                    poster={proof.replace(/\.mp4$/, '.jpg')}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[32/9] w-full rounded-[12px] bg-black"
                  />
                  <figcaption className="mt-2 text-[13px] text-muted-foreground">
                    Benchmark. Left: the original, cut to {seconds} s. Right: generated from this template alone, without
                    access to the original footage.
                  </figcaption>
                </figure>
              ) : (
                <figure>
                  <video
                    src={t.preview}
                    poster={t.thumbnail}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="aspect-video w-full rounded-[12px] bg-black object-cover"
                  />
                  {locked && t.proof && (
                    <figcaption className="mt-2 text-[13px] text-muted-foreground">
                      The benchmark (the original next to a remake made from this template alone) opens in Live mode, with
                      the judge passcode.
                    </figcaption>
                  )}
                </figure>
              )}
            </div>

            <div className="grid gap-6 px-6 pt-6 pb-6 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium">
                  {seconds} s cut{cut ? ` · ${cut.shots.length} shots` : ''}
                </h3>
                {cut?.arc && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{cut.arc}</p>}
                {loading && <div className="mt-3 h-28 animate-pulse rounded-[12px] bg-muted" />}
                {cut && (
                  <ol className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {cut.shots.map((s) => (
                      <li key={s.n} className="w-[150px] shrink-0">
                        <div className="aspect-video overflow-hidden rounded-[8px] border border-border bg-white">
                          {s.board && (
                            <img
                              src={templateFileUrl(t.id, s.board)}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-[12px] font-medium tabular-nums">
                          {s.n}. {s.start.toFixed(1)}–{s.end.toFixed(1)} s
                        </p>
                        {s.shotSize && <p className="text-[11px] text-muted-foreground">{s.shotSize}</p>}
                        {s.action && <p className="line-clamp-3 text-[11px] leading-snug text-muted-foreground">{s.action}</p>}
                      </li>
                    ))}
                  </ol>
                )}
                {cut && cut.lines.length > 0 && (
                  <>
                    <h3 className="mt-4 text-[15px] font-medium">Script</h3>
                    <ul className="mt-2 space-y-1">
                      {cut.lines.map((l, i) => (
                        <li key={i} className="flex gap-3 text-[13px]">
                          <span className="w-12 shrink-0 text-muted-foreground tabular-nums">{l.start.toFixed(1)} s</span>
                          <span>{l.words}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!locked && t.examples && t.examples.length > 0 && (
                  <>
                    <h3 className="mt-5 text-[15px] font-medium">Example productions</h3>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {t.examples.map((x) => (
                        <figure key={x.video}>
                          <video src={x.video} poster={x.poster} controls playsInline preload="metadata" className="aspect-video w-full rounded-[10px] bg-black" />
                          <figcaption className="mt-1 text-[12px] text-muted-foreground">{x.title}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </>
                )}
                {detail?.summary && <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">{detail.summary}</p>}
              </div>

              <aside>
                <h3 className="text-[15px] font-medium">Assets</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Replace with your own product, talent and locations. Shot structure and timing stay locked.
                </p>
                {groups.map((g) => (
                  <div key={g.k} className="mt-3">
                    <p className="text-[12px] font-medium text-muted-foreground">{KIND_LABEL[g.k]}</p>
                    <div className="mt-1 grid grid-cols-3 gap-1.5">
                      {g.files.slice(0, 9).map((f) => (
                        <img
                          key={f.file}
                          src={templateFileUrl(t.id, f.file)}
                          alt={f.file.replace(/^set\//, '')}
                          title={f.file.replace(/^set\//, '')}
                          loading="lazy"
                          className="aspect-video w-full rounded-[6px] border border-border bg-muted object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onUse(t, seconds)}
                  className="mt-6 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-medium text-background transition-opacity hover:opacity-90"
                >
                  Create a {seconds} s spot
                  <ArrowRight className="size-4" />
                </button>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
