import { Box, Film, FolderTree, Ruler, ScanEye, Store } from 'lucide-react';

/** How the agent turns a video into a template, in its microVM. Each step is a tool in sandbox/kit. */
const STEPS = [
  { icon: Box, title: 'Its own microVM', tool: 'one VM per project', text: 'Your footage never shares a machine: its own kernel, filesystem, CPU, memory and spend caps.' },
  { icon: Ruler, title: 'Measure', tool: 'bin/dissect', text: 'Cuts, shot times, loudness, lines and shot boards in about 30 s. No model calls.' },
  { icon: ScanEye, title: 'Read the craft', tool: 'tools/motion.py', text: 'Optical flow turns camera moves into numbers; Muse Code reads framing, lens, light and text.' },
  { icon: FolderTree, title: 'Write the template', tool: 'make-template skill', text: 'TEMPLATE.md, template.json, a storyboard per shot and a swappable asset set.' },
  { icon: Film, title: 'Benchmark', tool: 'bin/template check', text: 'The agent remakes the reference from the template alone, side by side with the original.' },
  { icon: Store, title: 'Keep or list', tool: 'catalog.json', text: 'Private to your workspace, or listed on the marketplace for any agent.' },
];

const RUNTIME = [
  ['One microVM per project', 'Each project runs Muse Code in its own VM: Apple’s container locally, a Cloudflare container in production.'],
  ['In front', 'A Cloudflare Worker serves the app, keeps projects in D1 and media in R2, and routes each project to its VM.'],
  ['Session', 'A relay inside the VM keeps one Muse Code session per project and logs every protocol event, so a run survives restarts and replays exactly.'],
  ['Spend guard', 'Caps per VM, per project and in total; a per-minute check stops running turns at the cap; one switch pauses every agent.'],
];

const PACKAGE = `<template>/
├─ README.md            how any agent runs it
├─ template/
│  ├─ TEMPLATE.md       the director's recipe, shot by shot
│  ├─ template.json     timing, framing, lens, move, light, text, sound
│  │  ├─ cut30          30 s spot: shots, lines, score
│  │  └─ cut15          15 s spot
│  ├─ boards/           one storyboard per shot
│  ├─ set/              cast, product, places (swappable)
│  └─ catalog.json      goal, industry, tone, cast
└─ recipe/
   ├─ SKILL.md          the fill recipe
   └─ template_spec.md  the format`;

const MODELS = [
  ['Muse Code', 'The agent that makes the template or the film'],
  ['Muse Spark · Muse Wonder', 'Its reasoning (Demo · Live)'],
  ['Muse Image', 'Plates, cast and product sheets, storyboards'],
  ['Muse Voice Transcribe', 'Measures the spoken lines of a reference'],
];

/** /technical: what reviewers want to see under the hood, kept off the product pages. */
export function TechnicalPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[960px] px-6 pt-10 pb-24">
        <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Technical details</p>
        <h1 className="mt-1 text-[36px] leading-tight font-medium tracking-[-0.01em]">Under the hood</h1>

        <h2 className="mt-10 text-[18px] font-medium">How the agent makes a template</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-[14px] border border-border p-4">
              <div className="flex items-center gap-2">
                <s.icon className="size-4 text-muted-foreground" />
                <span className="text-[14px] font-medium">{s.title}</span>
              </div>
              <code className="mt-1 block text-[11px] text-muted-foreground">{s.tool}</code>
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-[18px] font-medium">Runtime</h2>
        <dl className="mt-4 divide-y divide-border rounded-[14px] border border-border">
          {RUNTIME.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr]">
              <dt className="text-[14px] font-medium">{k}</dt>
              <dd className="text-[13px] leading-snug text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-[18px] font-medium">The template package</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">What “Download template” gives you: any agent, any image and video model.</p>
        <pre className="mt-4 overflow-x-auto rounded-[14px] border border-border bg-muted/40 p-4 text-[12px] leading-relaxed">{PACKAGE}</pre>

        <h2 className="mt-12 text-[18px] font-medium">Meta models</h2>
        <dl className="mt-4 divide-y divide-border rounded-[14px] border border-border">
          {MODELS.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr]">
              <dt className="text-[14px] font-medium">{k}</dt>
              <dd className="text-[13px] text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Source: <a className="underline" href="https://github.com/treksis/Shotprint" target="_blank" rel="noreferrer">github.com/treksis/Shotprint</a>
        </p>
      </div>
    </div>
  );
}
