import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const KEY = 'museclone.announce.dismissed';
const HEIGHT = 40;

/**
 * Full-width bar at the very top of the app (Dreamina's announcement pattern). It says which mode the
 * reviewer is in and offers the passcode. Sets --top-offset so the sidebar and pages sit below it.
 */
export function AnnouncementBar({ isLive, onGoLive, onExitLive }: { isLive: boolean; onGoLive: () => void; onExitLive: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === (isLive ? 'live' : 'demo');
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(KEY) === (isLive ? 'live' : 'demo'));
    } catch {
      setDismissed(false);
    }
  }, [isLive]);
  useEffect(() => {
    document.documentElement.style.setProperty('--top-offset', dismissed ? '0px' : `${HEIGHT}px`);
    return () => document.documentElement.style.setProperty('--top-offset', '0px');
  }, [dismissed]);
  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className={
        isLive
          ? 'relative z-30 flex h-10 items-center justify-center gap-2 bg-[var(--pill-positive-bg)] px-12 text-[13px] text-[var(--pill-positive-ink)]'
          : 'relative z-30 flex h-10 items-center justify-center gap-2 bg-[#0866ff] px-12 text-[13px] text-[#ffffff]'
      }
    >
      <span className="rounded-[4px] bg-[#ffffff]/15 px-1.5 py-0.5 text-[11px] font-semibold" hidden={isLive}>
        Demo
      </span>
      {isLive ? (
        <span className="truncate">
          Live mode is on for Meta Hackathon review: the director runs Muse and renders for real, within a per-session budget.{' '}
          <button type="button" onClick={onExitLive} className="cursor-pointer font-medium underline underline-offset-2">
            Back to demo
          </button>
        </span>
      ) : (
        <span className="truncate">
          You're exploring replays of real runs. Judges can enter the passcode from the submission notes to run the director
          live.{' '}
          <button type="button" onClick={onGoLive} className="cursor-pointer font-medium underline underline-offset-2">
            Go live ›
          </button>
        </span>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            sessionStorage.setItem(KEY, isLive ? 'live' : 'demo');
          } catch {
            /* private mode */
          }
          setDismissed(true);
        }}
        className="absolute right-3 grid size-7 cursor-pointer place-items-center rounded-[6px] opacity-80 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
