import { ArrowRight, Box, Film, FolderTree, Lock, Ruler, ScanEye, Store, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createProject, uploadToProject } from '../api';
import { newProject } from '../lib';
import { TEMPLATE_CASTS, TEMPLATE_GOALS, TEMPLATE_TONES } from '../types';

/** What happens inside the build's sandbox, in order. Each step is a tool in sandbox/kit. */
const STEPS = [
  { icon: Box, title: 'Its own microVM', tool: 'one VM per build', text: 'Your footage never shares a machine. A fresh lightweight VM boots in under a second for this build alone: its own Linux kernel, filesystem, CPU, memory and spend caps.' },
  { icon: Ruler, title: 'Measure', tool: 'bin/dissect', text: 'Cuts, gradual transitions, shot times, loudness, silences, a transcript and labelled shot boards, in about 30 s. No model calls.' },
  { icon: ScanEye, title: 'Read the craft', tool: 'tools/motion.py', text: 'Optical flow turns each shot’s camera move into numbers; Muse Code reads the boards for framing, lens, light and text.' },
  { icon: FolderTree, title: 'Write the template', tool: 'make-template skill', text: 'TEMPLATE.md and template.json, a storyboard per shot, a swappable asset set, and the 30 s and 15 s cuts with their score.' },
  { icon: Film, title: 'Benchmark', tool: 'bin/template check', text: 'Without the original footage, the agent remakes the reference from the template alone. You compare the two side by side.' },
  { icon: Store, title: 'Publish or keep', tool: 'catalog.json', text: 'Keep it private to your workspace, or list it on the marketplace with its category, industry, tone and cast.' },
];

const TREE = `templates/<your-template>/
├─ TEMPLATE.md        the director's recipe, shot by shot
├─ template.json      timing, framing, lens, move, light, text, sound
│   ├─ cut30          30 s spot: shots, lines, score
│   └─ cut15          15 s spot
├─ boards/            one storyboard frame per shot
├─ set/               cast, product, places, screens (swappable)
└─ catalog.json       marketplace listing: goal, industry, tone, cast`;

/** /templates/build: turn a video into a template inside its own sandbox, then keep it or list it. */
export function BuildTemplatePage({ onOpenProject, onProjectsChanged }: { onOpenProject: (id: string) => void; onProjectsChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>(TEMPLATE_GOALS[0]);
  const [tone, setTone] = useState<string>(TEMPLATE_TONES[0]);
  const [cast, setCast] = useState<string>(TEMPLATE_CASTS[0]);
  const [listing, setListing] = useState<'private' | 'marketplace'>('private');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const start = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const id = (name.trim() || file.name.replace(/\.[^.]+$/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-template';
    // A short reference keeps its own length: padding it to 30 s only costs time and money.
    const secs = await videoSeconds(file);
    const short = secs !== null && secs < 25;
    const cuts = short ? `a single cut at the source's own length (about ${Math.round(secs)} s; do not pad or loop it to 30 s)` : 'cut30 and cut15';
    const remake = short ? 'that cut' : 'the 30 s cut';
    const brief = [
      `Turn inputs/${file.name} into a director template named "${id}" with the make-template skill.`,
      `Run bin/dissect inputs/${file.name} --template ${id}, read the boards, and write templates/${id}/ to docs/template_spec.md: TEMPLATE.md, template.json with ${cuts}, a board per shot and the asset set. Finish with bin/template check templates/${id}.`,
      `Then benchmark it: without opening the original footage again, remake ${remake} from the template alone and put the remake next to bin/template reference for a side-by-side.`,
      `Listing: ${listing === 'marketplace' ? 'publish to the marketplace' : 'private to this workspace'}. Write templates/${id}/catalog.json with goal "${goal}", tone "${tone}", cast "${cast}" and the industries it fits.`,
    ].join('\n\n');
    try {
      const project = await createProject({ ...newProject(brief, null), name: `Template: ${id}` });
      await uploadToProject(project.id, file);
      onProjectsChanged();
      onOpenProject(project.id);
    } catch (e) {
      setError(String((e as Error).message || e));
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-24">
        <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Build a template</p>
        <h1 className="mt-1 max-w-[760px] text-[36px] leading-tight font-medium tracking-[-0.01em]">Turn a video that works into a template any agent can run</h1>
        <p className="mt-3 max-w-[720px] text-[15px] text-muted-foreground">
          Upload a reference. Muse Code measures it shot by shot inside its own microVM, writes the template, then proves it
          by remaking the reference from the template alone. Keep it private, or list it on the marketplace.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[16px] border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-muted text-[12px] font-medium tabular-nums">{i + 1}</span>
                  <s.icon className="size-4 text-muted-foreground" />
                  <span className="text-[15px] font-medium">{s.title}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.text}</p>
                <code className="mt-2 inline-block rounded-[6px] bg-muted px-1.5 py-0.5 text-[11px]">{s.tool}</code>
              </li>
            ))}
          </ol>

          <aside className="h-fit rounded-[16px] border border-border p-5">
            <h2 className="text-[16px] font-medium">New template</h2>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              className={cn(
                'mt-3 flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border border-dashed p-6 text-center transition-colors',
                file ? 'border-foreground' : 'border-border hover:border-[#c9c9c6]',
              )}
            >
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-[14px] font-medium">{file ? file.name : 'Drop a reference video'}</span>
              <span className="text-[12px] text-muted-foreground">
                {file ? `${(file.size / 1e6).toFixed(1)} MB` : 'MP4 or MOV, up to about 3 minutes'}
              </span>
            </button>
            <input ref={input} type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

            <label className="mt-4 block text-[12px] font-medium text-muted-foreground">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Night drive launch"
                className="mt-1 h-10 w-full rounded-[10px] border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-foreground"
              />
            </label>
            <div className="mt-3 grid grid-cols-[1.5fr_1fr_1fr] gap-2">
              <Field label="Goal" value={goal} options={TEMPLATE_GOALS} onChange={setGoal} />
              <Field label="Tone" value={tone} options={TEMPLATE_TONES} onChange={setTone} />
              <Field label="Cast" value={cast} options={TEMPLATE_CASTS} onChange={setCast} />
            </div>

            <div role="radiogroup" aria-label="Listing" className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  ['private', Lock, 'Private', 'Only your workspace'],
                  ['marketplace', Store, 'Marketplace', 'Listed for any agent'],
                ] as const
              ).map(([k, Icon, label, sub]) => (
                <button
                  key={k}
                  role="radio"
                  type="button"
                  aria-checked={listing === k}
                  onClick={() => setListing(k)}
                  className={cn(
                    'cursor-pointer rounded-[12px] border p-3 text-left transition-colors',
                    listing === k ? 'border-foreground' : 'border-border hover:border-[#c9c9c6]',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="mt-1 block text-[13px] font-medium">{label}</span>
                  <span className="block text-[11px] text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!file || busy}
              onClick={start}
              className="mt-5 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Booting the microVM…' : 'Build in a microVM'}
              <ArrowRight className="size-4" />
            </button>
            {error && <p className="mt-2 text-[13px] text-[var(--negative)]">{error}</p>}
          </aside>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <h2 className="text-[18px] font-medium">What a template is</h2>
            <pre className="mt-3 overflow-x-auto rounded-[16px] bg-[#111] p-5 text-[12.5px] leading-relaxed text-[#e9e9e6]">{TREE}</pre>
          </div>
          <div>
            <h2 className="text-[18px] font-medium">Why not a project file</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              A template from a stock marketplace is a timeline someone has to open and edit by hand. An agent can’t use it.
              A Shotprint template is written for the agent: every decision a director made is a number or a sentence it can
              follow, and every asset is a slot it can fill with your product, cast and places.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="text-[12px] font-medium text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="mt-1 h-10! w-full cursor-pointer rounded-[10px] px-2.5 text-[13px] text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The clip's length in seconds, read by the browser; null when it can't tell. */
function videoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (s: number | null) => {
      URL.revokeObjectURL(url);
      resolve(s);
    };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 5000);
    v.src = url;
  });
}
