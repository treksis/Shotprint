import React from 'react';

export interface FinalCtaProps {
  onOpenStudio: () => void;
}

export function FinalCta({ onOpenStudio }: FinalCtaProps) {
  return (
    <section className="bg-[#111111] text-[#ffffff] py-14 lg:py-20 text-center">
      <div className="max-w-[1200px] mx-auto px-6" data-reveal>
        <h2 className="text-[28px] sm:text-[32px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#ffffff]">
          Same cuts. Your product.
        </h2>
        <div className="mt-7">
          <button
            type="button"
            onClick={onOpenStudio}
            className="h-[44px] px-6 rounded-[8px] bg-[#ffffff] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
          >
            Open studio
          </button>
        </div>
      </div>
    </section>
  );
}

export default FinalCta;
