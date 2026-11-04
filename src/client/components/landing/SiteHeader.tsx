import { ShotprintMark } from '../ShotprintMark';
import React from 'react';

export interface SiteHeaderProps {
  onOpenStudio: () => void;
  onOpenVault: () => void;
}

export function SiteHeader({ onOpenStudio, onOpenVault }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#ffffff] h-16">
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-4">
        <a
          href="#"
          className="flex items-center gap-2.5 text-[#111111] no-underline"
        >
          <ShotprintMark className="w-6 h-6 shrink-0" />
          <span className="text-[18px] font-semibold tracking-[-0.02em] text-[#111111]">
            Shotprint
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8 text-[16px] text-[#111111]">
          <a href="#features" className="text-[#111111] hover:text-[#1a4be0]">
            Features
          </a>
          <a href="#how-it-works" className="text-[#111111] hover:text-[#1a4be0]">
            How it works
          </a>
          <a href="#access" className="text-[#111111] hover:text-[#1a4be0]">
            Demo &amp; Live
          </a>
          <button
            type="button"
            onClick={onOpenVault}
            className="text-[16px] text-[#111111] hover:text-[#1a4be0] cursor-pointer"
          >
            Marketplace
          </button>
        </nav>

        <button
          type="button"
          onClick={onOpenStudio}
          className="h-[44px] px-5 rounded-[8px] bg-[#111111] text-[#ffffff] text-[16px] font-medium cursor-pointer btn-tactile shrink-0"
        >
          Open studio
        </button>
      </div>
    </header>
  );
}

export default SiteHeader;
