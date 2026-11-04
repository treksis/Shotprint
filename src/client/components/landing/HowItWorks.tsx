import React from 'react';

export interface HowItWorksProps {
  onOpenVault: () => void;
}

export function HowItWorks({ onOpenVault }: HowItWorksProps) {
  const steps = [
    {
      num: '1',
      title: 'Pick a template',
      desc: 'Filter the marketplace by goal, industry, tone and cast. Every template is benchmarked.',
    },
    {
      num: '2',
      title: 'Brief the agent',
      desc: 'A product photo and one sentence. Muse Code directs in its own microVM.',
    },
    {
      num: '3',
      title: 'Get your 30 s and 15 s spots',
      desc: 'Steer it while it is made, on a live canvas.',
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#f4f4f4] py-14 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2
          data-reveal
          className="text-center text-[28px] sm:text-[32px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#111111]"
        >
          How it works
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} data-reveal className="bg-[#ffffff] rounded-[12px] p-6">
              <div className="text-[48px] font-semibold text-[#1a4be0] leading-none tabular-nums">
                {step.num}
              </div>
              <h3 className="mt-4 text-[22px] font-semibold text-[#111111]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[16px] leading-[1.55] text-[#6b6b6b]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center" data-reveal>
          <button
            type="button"
            onClick={onOpenVault}
            className="h-[44px] px-6 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
          >
            Browse the marketplace
          </button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
