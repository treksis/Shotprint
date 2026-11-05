import { useEffect, useState } from 'react';

/** Each step outlines a real element on the Marketplace page and explains it next to it. */
const STEPS = [
  { target: 'filters', title: 'Find a template', body: 'Search, or filter by goal, industry, tone and cast. Every template here is written for an AI agent to run, not a project file to edit.' },
  { target: 'card', title: 'A template', body: 'Hover to preview. Each one is measured shot by shot from a video that works: timing, framing, camera, light, text and sound.' },
  { target: 'compare', title: 'Open it', body: 'Compare opens the template: a spot the agent made from it alone, the storyboard per shot, the swappable assets, and Download template for the package any agent can run.' },
  { target: 'nav-studio', title: 'The Studio', body: 'One agent, no forms. Attach a video and Muse Code turns it into a template; pick a template and it makes a spot. In this demo, sending opens a recorded run.' },
  { target: 'projects', title: 'Recorded runs', body: 'Real Muse Code sessions, replayed exactly: the chat, every file on the canvas, and the finished film. Each runs in its own microVM.' },
  { target: 'nav-tech', title: 'Under the hood', body: 'How a template is made, the microVM runtime, the package format and the Meta models.' },
];

type Box = { x: number; y: number; w: number; h: number };

export function DemoTour({ step, onStep, onClose }: { step: number; onStep: (n: number) => void; onClose: () => void }) {
  const s = STEPS[step];
  const [box, setBox] = useState<Box | null>(null);

  // Follow the target as the page lays out, scrolls or resizes.
  useEffect(() => {
    if (!s) return;
    let raf = 0;
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          scrolled = true;
        }
        const r = el.getBoundingClientRect();
        setBox((b) => (b && b.x === r.x && b.y === r.y && b.w === r.width && b.h === r.height ? b : { x: r.x, y: r.y, w: r.width, h: r.height }));
      } else setBox(null);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [s]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  if (!s) return null;
  const pad = 8;
  const last = step === STEPS.length - 1;
  // The note sits beside the outline: right of narrow targets (the sidebar), below wide ones.
  const W = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = 24;
  let top = vh - 220;
  if (box) {
    if (box.w < 320 && box.x + box.w + W + 40 < vw) {
      left = box.x + box.w + pad + 16;
      top = Math.min(Math.max(16, box.y - 8), vh - 220);
    } else {
      left = Math.min(Math.max(16, box.x), vw - W - 16);
      top = box.y + box.h + pad + 14 + 200 < vh ? box.y + box.h + pad + 14 : Math.max(16, box.y - pad - 14 - 200);
    }
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label="Demo tour">
      {box ? (
        <div
          className="pointer-events-none absolute rounded-[14px] ring-2 ring-[#0866ff] transition-all duration-300"
          style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, boxShadow: '0 0 0 9999px rgba(10,12,16,0.55)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(10,12,16,0.55)]" />
      )}
      <div className="absolute rounded-[14px] bg-background p-4 shadow-2xl transition-all duration-300" style={{ left, top, width: W }}>
        <p className="text-[12px] font-medium text-[#0866ff] tabular-nums">
          Demo tour · {step + 1} / {STEPS.length}
        </p>
        <h3 className="mt-1 text-[16px] font-medium">{s.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-8 cursor-pointer rounded-full px-2 text-[13px] text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <span className="flex-1" />
          {step > 0 && (
            <button type="button" onClick={() => onStep(step - 1)} className="h-8 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">
              Back
            </button>
          )}
          <button type="button" onClick={() => (last ? onClose() : onStep(step + 1))} className="h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-90">
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
