import { X } from 'lucide-react';
import type { Route } from '../App';

const STEPS: Array<{ view: Route['view']; title: string; body: string }> = [
  {
    view: 'templates',
    title: 'The marketplace',
    body: 'Video templates written for AI agents, not for people to edit. Filter by goal, industry, tone and cast.',
  },
  {
    view: 'templates',
    title: 'Inside a template',
    body: 'Click Compare on a card. The spot on top was made by the agent from the template alone; click any storyboard or asset to see it large, and Download template for the package any agent can run.',
  },
  {
    view: 'home',
    title: 'The Studio',
    body: 'One agent, no forms: attach a video to make a template, or pick a template to make a spot. In Demo mode, sending opens a recorded run: the chat, the canvas and the finished film.',
  },
  {
    view: 'technical',
    title: 'Go live',
    body: 'With the judge passcode, spots play with their music, the benchmarks open, and Muse Code runs for you in its own microVM. This page shows how it is built.',
  },
];

/** A short guided tour for Demo mode: one card, four steps, each on its own page. */
export function DemoTour({ step, onStep, onClose, onGoLive, onNavigate }: { step: number; onStep: (n: number) => void; onClose: () => void; onGoLive: () => void; onNavigate: (r: Route) => void }) {
  const s = STEPS[step];
  if (!s) return null;
  const go = (n: number) => {
    onStep(n);
    onNavigate({ view: STEPS[n].view } as Route);
  };
  const last = step === STEPS.length - 1;
  return (
    <div role="dialog" aria-label="Demo tour" className="fixed right-5 bottom-5 z-[70] w-[360px] max-w-[calc(100vw-40px)] rounded-[16px] border border-border bg-background p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#0866ff] tabular-nums">
          Demo tour · {step + 1} / {STEPS.length}
        </p>
        <button type="button" aria-label="Close the tour" onClick={onClose} className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
      <h3 className="mt-1 text-[16px] font-medium">{s.title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
      <div className="mt-3 flex items-center gap-2">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="h-8 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">
            Back
          </button>
        )}
        <span className="flex-1" />
        {last ? (
          <>
            <button type="button" onClick={onClose} className="h-8 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoLive();
              }}
              className="h-8 cursor-pointer rounded-full bg-[#0866ff] px-4 text-[13px] font-medium text-white hover:opacity-90"
            >
              Go live
            </button>
          </>
        ) : (
          <button type="button" onClick={() => go(step + 1)} className="h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-90">
            Next
          </button>
        )}
      </div>
    </div>
  );
}
