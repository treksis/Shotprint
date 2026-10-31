import React from 'react';

export interface DemoVsLiveProps {
  onOpenStudio: () => void;
  onOpenLiveGate: () => void;
}

export function DemoVsLive({ onOpenStudio, onOpenLiveGate }: DemoVsLiveProps) {
  const demoBullets = [
    '3 ready-made viral templates',
    'Pre-built product swaps',
    'Side-by-side video player',
  ];

  const liveBullets = [
    'Paste any video link',
    'Upload your own product photo',
    'Generate new video clips',
  ];

  return (
    <section id="access" className="py-14 lg:py-20 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-[68ch] mx-auto" data-reveal>
          <h2 className="text-[28px] sm:text-[32px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#111111]">
            Demo or Live
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Demo */}
          <div
            data-reveal
            className="rounded-[12px] bg-[#f4f4f4] p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[22px] font-semibold text-[#111111]">Demo</h3>
                <span className="px-3 py-1 rounded-[6px] bg-[#ffffff] text-[#111111] text-[14px] font-medium">
                  Free
                </span>
              </div>

              <ul className="mt-5 space-y-2.5 text-[16px] text-[#111111]">
                {demoBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-[1px] bg-[#111111] shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={onOpenStudio}
                className="w-full sm:w-auto h-[44px] px-6 rounded-[8px] bg-[#111111] text-[#ffffff] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Open demo
              </button>
            </div>
          </div>

          {/* Card 2: Live */}
          <div
            data-reveal
            className="rounded-[12px] bg-[#f4f4f4] p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[22px] font-semibold text-[#111111]">Live</h3>
                <span className="px-3 py-1 rounded-[6px] bg-[#eef2fd] text-[#1a4be0] text-[14px] font-medium">
                  Passcode
                </span>
              </div>

              <ul className="mt-5 space-y-2.5 text-[16px] text-[#111111]">
                {liveBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-[1px] bg-[#1a4be0] shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={onOpenLiveGate}
                className="w-full sm:w-auto h-[44px] px-6 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Enter passcode
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DemoVsLive;
