import { Hammer, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { listTemplates } from '../api';
import { TEMPLATE_CASTS, TEMPLATE_GOALS, TEMPLATE_TONES, type StudioTemplate } from '../types';
import { TemplateCard } from './template-card';
import { TemplateDetailDialog } from './template-detail';

type Filters = { goal: string | null; industry: string | null; tone: string | null; cast: string | null };
const NONE: Filters = { goal: null, industry: null, tone: null, cast: null };

const SORTS = {
  featured: { label: 'Featured', by: () => 0 },
  shots: { label: 'Most shots', by: (a: StudioTemplate, b: StudioTemplate) => b.shots - a.shots },
  title: { label: 'A to Z', by: (a: StudioTemplate, b: StudioTemplate) => a.title.localeCompare(b.title) },
} as const;

/** /templates: the marketplace. Every template is a production an agent can run; filter by what it is for. */
export function TemplatesPage({ onUseTemplate, onBuild }: { onUseTemplate: (id: string, seconds?: number) => void; onBuild: () => void }) {
  const [templates, setTemplates] = useState<StudioTemplate[] | null>(null);
  const [open, setOpen] = useState<StudioTemplate | null>(null);
  const [query, setQuery] = useState('');
  const [f, setF] = useState<Filters>(NONE);
  const [sort, setSort] = useState<keyof typeof SORTS>('featured');
  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const industries = useMemo(() => [...new Set((templates ?? []).flatMap((t) => t.industries ?? []))].sort(), [templates]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (templates ?? [])
      .filter((t) => !f.goal || t.goal === f.goal)
      .filter((t) => !f.industry || t.industries?.includes(f.industry))
      .filter((t) => !f.tone || t.tone === f.tone)
      .filter((t) => !f.cast || t.cast === f.cast)
      .filter((t) => !q || [t.title, t.description, t.format, t.source, ...(t.industries ?? [])].join(' ').toLowerCase().includes(q))
      .sort(SORTS[sort].by);
  }, [templates, f, query, sort]);
  const active = Object.values(f).some(Boolean) || query.trim() !== '';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-6 pt-10 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[720px]">
            <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Marketplace</p>
            <h1 className="mt-1 text-[36px] leading-tight font-medium tracking-[-0.01em]">The video template marketplace for AI agents</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              A template here is a production an agent can run, not a project file a person has to edit: measured timing,
              framing, camera, light, text and sound for every shot, a storyboard per shot, and swappable cast, product and
              places. Download a template with its fill recipe and <span className="text-foreground">run it with your own agent and video model</span>, or run it here with Muse Code.
            </p>
          </div>
          <button
            type="button"
            onClick={onBuild}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Hammer className="size-4" />
            Make a template
          </button>
        </div>

        <div data-tour="filters" className="sticky top-0 z-10 -mx-6 mt-8 space-y-3 bg-background/95 px-6 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 focus-within:border-foreground">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates: launch, comedy, car, app…"
                className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              />
            </label>
            <Picker label="Industry" value={f.industry} options={industries} onChange={(industry) => setF({ ...f, industry })} />
            <Picker label="Tone" value={f.tone} options={TEMPLATE_TONES} onChange={(tone) => setF({ ...f, tone })} />
            <Picker label="Cast" value={f.cast} options={TEMPLATE_CASTS} onChange={(cast) => setF({ ...f, cast })} />
            <Select value={sort} onValueChange={(v) => setSort(v as keyof typeof SORTS)}>
              <SelectTrigger aria-label="Sort" className="h-10! cursor-pointer rounded-full px-4 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORTS).map(([k, s]) => (
                  <SelectItem key={k} value={k}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[null, ...TEMPLATE_GOALS].map((g) => (
              <button
                key={g ?? 'all'}
                type="button"
                aria-pressed={f.goal === g}
                onClick={() => setF({ ...f, goal: g })}
                className={cn(
                  'h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  f.goal === g ? 'bg-foreground text-background' : 'bg-[rgba(0,0,0,0.05)] text-foreground hover:bg-[rgba(0,0,0,0.08)]',
                )}
              >
                {g ?? 'All'}
                <span className="ml-1.5 tabular-nums opacity-60">{(templates ?? []).filter((t) => !g || t.goal === g).length}</span>
              </button>
            ))}
            {active && (
              <button
                type="button"
                onClick={() => {
                  setF(NONE);
                  setQuery('');
                }}
                className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1 px-2 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">
          {templates === null ? 'Loading…' : `${shown.length} of ${templates.length} templates`}
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates === null &&
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-[16px] border border-border">
                <div className="aspect-video animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          {shown.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onSelect={() => (t.status === 'ready' ? setOpen(t) : onUseTemplate(t.id))}
              onDetails={setOpen}
            />
          ))}
        </div>
        {templates !== null && shown.length === 0 && (
          <div className="mt-6 rounded-[16px] border border-dashed border-border p-10 text-center">
            <p className="text-[15px] font-medium">No template matches yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Build one from a video that already works for you.</p>
            <button type="button" onClick={onBuild} className="mt-4 h-9 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background">
              Make a template
            </button>
          </div>
        )}
        <TemplateDetailDialog template={open} onClose={() => setOpen(null)} onUse={(t, seconds) => onUseTemplate(t.id, seconds)} />
      </div>
    </div>
  );
}

const ANY = '__any';

function Picker({ label, value, options, onChange }: { label: string; value: string | null; options: readonly string[]; onChange: (v: string | null) => void }) {
  return (
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-10! cursor-pointer rounded-full px-4 text-[14px]',
          value && 'border-foreground bg-foreground text-background hover:bg-foreground/90 [&_svg]:text-background!',
        )}
      >
        <SelectValue>{value ? `${label}: ${value}` : `${label}: any`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
