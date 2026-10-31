import React from 'react';

export interface SiteFooterProps {
  onOpenStudio: () => void;
  onOpenVault: () => void;
}

export function SiteFooter({ onOpenStudio, onOpenVault }: SiteFooterProps) {
  return (
    <footer className="bg-[#111111] text-[#bdbdbd] py-10 text-[14px]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>© 2026 MuseClone · Viral Video Template &amp; Product Ad Studio</div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onOpenStudio}
            className="text-[#bdbdbd] hover:text-[#ffffff] cursor-pointer"
          >
            Studio
          </button>
          <button
            type="button"
            onClick={onOpenVault}
            className="text-[#bdbdbd] hover:text-[#ffffff] cursor-pointer"
          >
            Templates
          </button>
          {/* TODO: Replace placeholder with public repository URL */}
          <a href="#" className="text-[#bdbdbd] hover:text-[#ffffff]">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
