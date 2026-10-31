import React, { useState } from 'react';
import { STUDIO_TEMPLATES } from '../../../shared/studio-templates';

export function FeatureSection() {
  const samRegion = {
    label: 'Primary Subject',
    confidence: 0.99,
    x: 0.26,
    y: 0.22,
    w: 0.48,
    h: 0.56,
  };

  const fallbackMedia = [0, 1, 2, 3].map((i) => STUDIO_TEMPLATES[i % STUDIO_TEMPLATES.length].thumbnail);

  const [imgSrcs, setImgSrcs] = useState<string[]>(fallbackMedia);

  const fidelityScore = 96;

  const rows = [
    {
      title: '1. Break down the video',
      body: 'Paste a link. We map every scene, cut length, and camera move.',
      showFocusBox: false,
    },
    {
      title: '2. Lock product placement',
      body: 'We track where the product sits so yours lands in the exact same spot.',
      showFocusBox: true,
    },
    {
      title: '3. Swap in your product',
      body: 'Upload one product photo to rebuild and animate every scene.',
      showFocusBox: false,
    },
    {
      title: '4. Compare side by side',
      body: 'Play the original and your new ad together before you download.',
      showFocusBox: false,
    },
  ];

  return (
    <section id="features" className="py-14 lg:py-20 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-[68ch] mx-auto" data-reveal>
          <h2 className="text-[28px] sm:text-[32px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#111111]">
            Four steps to a new ad
          </h2>
        </div>

        <div className="mt-12 lg:mt-20 space-y-14 lg:space-y-20">
          {rows.map((row, idx) => {
            const imageLeft = idx % 2 === 1;
            const currentSrc = imgSrcs[idx] || fallbackMedia[idx];
            return (
              <div
                key={row.title}
                data-reveal
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
              >
                {/* Text Column */}
                <div className={imageLeft ? 'lg:order-2' : 'lg:order-1'}>
                  <h3 className="text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.12] text-[#111111]">
                    {row.title}
                  </h3>
                  <p className="mt-3 text-[18px] leading-[1.55] text-[#111111] max-w-[42ch]">
                    {row.body}
                  </p>
                </div>

                {/* Media Panel */}
                <div
                  className={`relative rounded-[12px] overflow-hidden bg-[#f4f4f4] aspect-[4/3] ${
                    imageLeft ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <img
                    src={currentSrc}
                    alt={row.title}
                    width={800}
                    height={600}
                    loading="lazy"
                    onError={() => {
                      setImgSrcs((prev) => {
                        const next = [...prev];
                        next[idx] = fallbackMedia[idx];
                        return next;
                      });
                    }}
                    className="w-full h-full object-cover"
                  />

                  {row.showFocusBox && (
                    <div
                      style={{
                        left: `${Math.round(samRegion.x * 100)}%`,
                        top: `${Math.round(samRegion.y * 100)}%`,
                        width: `${Math.round(samRegion.w * 100)}%`,
                        height: `${Math.round(samRegion.h * 100)}%`,
                      }}
                      className="pointer-events-none absolute rounded-[8px] border-2 border-[#1a4be0] bg-[#1a4be0]/15"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeatureSection;
