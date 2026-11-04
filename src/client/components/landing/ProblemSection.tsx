import React from 'react';

export function ProblemSection() {
  return (
    <section className="py-14 lg:py-20 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6" data-reveal>
          <h2 className="text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.12] text-[#111111]">
            Stock templates are made for people.
            <br />
            Agents can't use them.
          </h2>
        </div>

        <div className="lg:col-span-6 text-[18px] leading-[1.55] text-[#111111]" data-reveal>
          <p className="max-w-[48ch]">
            A stock template is a project file someone still has to open and edit for hours. A Shotprint
            template is written for the agent: every shot's timing, framing, camera move, light and sound as
            numbers it can follow, and every asset a slot it fills with your product.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;
