import React from 'react';

export function LogoStrip() {
  const items = ['TikTok Ads', 'Instagram Reels', 'YouTube Shorts', 'Product Launches'];

  return (
    <section className="py-8 bg-[#f4f4f4]">
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[16px] text-[#6b6b6b]">
          {items.map((name) => (
            <span key={name} className="font-medium text-[#111111]">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LogoStrip;
