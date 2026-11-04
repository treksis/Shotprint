import React, { useState, useRef, useEffect } from 'react';

// The hook video (docs/pitch/make_hook.sh): real Meta films next to rebuilds an agent made blind from
// their templates, ending on "Same shots. Same timing. Your product." 
const HOOK_VIDEO = {
  mp4: '/hero/hook.mp4',
  poster: '/hero/hook-poster.jpg',
};

const HOOK_FALLBACK = {
  mp4: '/templates/meta-vr-glasses-launch.mp4',
};

export interface HeroSectionProps {
  fallbackPoster?: string;
  onOpenStudio: () => void;
}

export function HeroSection({ fallbackPoster, onOpenStudio }: HeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>(HOOK_VIDEO.mp4);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isPlayingManual, setIsPlayingManual] = useState<boolean>(false);

  const posterUrl =
    fallbackPoster ||
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1200&q=80';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleVideoError = () => {
    if (!usedFallback) {
      setUsedFallback(true);
      setVideoSrc(HOOK_FALLBACK.mp4);
    }
  };

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleManualPlay = () => {
    if (!videoRef.current) return;
    videoRef.current.play().catch(() => {});
    setIsPlayingManual(true);
  };

  const handleScrollHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-10 pb-16 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <h1 className="text-[24px] sm:text-[48px] lg:text-[64px] font-semibold tracking-[-0.03em] leading-[1.04] text-[#111111] max-w-[24ch] mx-auto">
          The video template marketplace
          <br />
          for AI agents.
        </h1>

        <p className="mt-4 text-[18px] leading-[1.55] text-[#111111] max-w-[48ch] mx-auto">
          Pick a template built for an agent, not a person. Write one sentence. Muse Code makes your 30 s and 15 s spots.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenStudio}
            className="h-[44px] px-6 rounded-[8px] bg-[#111111] text-[#ffffff] text-[16px] font-medium cursor-pointer btn-tactile"
          >
            Browse the marketplace
          </button>
          <button
            type="button"
            onClick={handleScrollHowItWorks}
            className="h-[44px] px-6 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
          >
            How it works
          </button>
        </div>

        {/* Hook Video Frame */}
        <div className="mt-8 relative rounded-[12px] overflow-hidden bg-[#111111] aspect-video w-full max-w-[1100px] mx-auto">
          <video
            key={videoSrc}
            ref={videoRef}
            src={videoSrc}
            poster={posterUrl}
            autoPlay={!reducedMotion}
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
            onError={handleVideoError}
            className="w-full h-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {reducedMotion && !isPlayingManual && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/40">
              <button
                type="button"
                onClick={handleManualPlay}
                className="h-[44px] px-6 rounded-[8px] bg-[#ffffff] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Play
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[8px] bg-[#ffffff] text-[#111111] text-[14px] font-medium cursor-pointer btn-tactile"
          >
            {isMuted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
