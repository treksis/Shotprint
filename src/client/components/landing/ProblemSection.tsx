import React from 'react';

export function ProblemSection() {
  return (
    <section className="py-14 lg:py-20 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6" data-reveal>
          <h2 className="text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.12] text-[#111111]">
            Viral ads have a structure.
            <br />
            Keep what works.
          </h2>
        </div>

        <div className="lg:col-span-6 text-[18px] leading-[1.55] text-[#111111]" data-reveal>
          <p className="max-w-[48ch]">
            We keep the opening hook, cut timing, and camera movement from a winning video, and
            swap in your product.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;
