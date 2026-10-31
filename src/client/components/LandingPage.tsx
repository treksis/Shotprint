import React from 'react';
import { STUDIO_TEMPLATES } from '../../shared/studio-templates';
import { useReveal } from '../lib/useReveal';
import { SiteHeader } from './landing/SiteHeader';
import { HeroSection } from './landing/HeroSection';
import { LogoStrip } from './landing/LogoStrip';
import { ProblemSection } from './landing/ProblemSection';
import { FeatureSection } from './landing/FeatureSection';
import { HowItWorks } from './landing/HowItWorks';
import { DemoVsLive } from './landing/DemoVsLive';
import { FinalCta } from './landing/FinalCta';
import { SiteFooter } from './landing/SiteFooter';

export interface LandingPageProps {
  onEnterJudgeStudio: (projectId?: string, opts?: { openLiveGate?: boolean }) => void;
  onOpenVault: () => void;
}

export function LandingPage({
  onEnterJudgeStudio,
  onOpenVault,
}: LandingPageProps) {
  useReveal();

  const onOpenStudio = () => onEnterJudgeStudio();
  const onOpenLiveGate = () => onEnterJudgeStudio(undefined, { openLiveGate: true });

  return (
    <div className="bg-[#ffffff] text-[#111111]">
      <SiteHeader onOpenStudio={onOpenStudio} onOpenVault={onOpenVault} />
      <div data-ui className="max-w-[1200px] mx-auto px-6 pt-2">
        <div className="rounded-[8px] bg-[#111111] text-[#ffffff] px-4 py-2.5 text-[15px] flex flex-wrap items-center justify-between gap-3">
          <span>
            Meta Hackathon review: Try the studio in demo mode, or enter the judge passcode for live generation.
          </span>
          <button
            type="button"
            onClick={onOpenLiveGate}
            className="font-semibold text-[#ffffff] underline underline-offset-2 hover:opacity-85 cursor-pointer whitespace-nowrap"
          >
            Enter judge passcode →
          </button>
        </div>
      </div>
      <main>
        <HeroSection
          fallbackPoster={STUDIO_TEMPLATES[0]?.thumbnail}
          onOpenStudio={onOpenStudio}
        />
        <LogoStrip />
        <ProblemSection />
        <FeatureSection />
        <HowItWorks onOpenVault={onOpenVault} />
        <DemoVsLive onOpenStudio={onOpenStudio} onOpenLiveGate={onOpenLiveGate} />
        <FinalCta onOpenStudio={onOpenStudio} />
      </main>
      <SiteFooter onOpenStudio={onOpenStudio} onOpenVault={onOpenVault} />
    </div>
  );
}

export default LandingPage;
