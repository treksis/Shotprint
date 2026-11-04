import React, { useState } from 'react';
import { STUDIO_TEMPLATES } from '../../../shared/studio-templates';

export function FeatureSection() {
  const fallbackMedia = [0, 1, 2, 3].map((i) => STUDIO_TEMPLATES[i % STUDIO_TEMPLATES.length].thumbnail);
  // Real artifacts from the Meta launch template (docs/pitch/make_steps.sh).
  const media = ['/landing/step-measure.jpg', '/landing/step-ingredients.jpg', '/landing/step-boards.jpg', '/landing/step-proof.jpg'];
  const [imgSrcs, setImgSrcs] = useState<string[]>(media);
  const rows = [
    {
      title: '1. Measure your video',
      body: 'Every cut, fade, brightness level, loudness and spoken line, measured in seconds with no model. One board per shot: start, middle, end.',
    },
    {
      title: '2. Build the template and its assets',
      body: 'Framing, camera move, light and timing for every shot, with numbers. Cast, product and places drawn as sheets you swap for your own.',
    },
    {
      title: '3. Cut it to 30 s and 15 s',
      body: 'An editor picks the hook, the proof and the payoff, cuts the soundtrack on the bar, and sketches a storyboard for every kept shot.',
    },
    {
      title: '4. Benchmark, then publish',
      body: 'The spot is regenerated from the template alone, with no access to the original, and reviewed side by side. Keep it private, or list it on the marketplace.',
    },
  ];

  return (
    <section id="features" className="py-14 lg:py-20 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-[68ch] mx-auto" data-reveal>
          <h2 className="text-[28px] sm:text-[32px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#111111]">
            Build a template, sell it to agents
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
