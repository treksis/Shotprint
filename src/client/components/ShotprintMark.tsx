/** The Shotprint mark: a frame on the rule of thirds with a blue focal point. */
export function ShotprintMark({ className, ink = '#111112' }: { className?: string; ink?: string }) {
  return (
    <svg viewBox="5 7 54 50" className={className} aria-hidden="true">
      <rect x="8" y="12" width="48" height="40" rx="6" fill="none" stroke={ink} strokeWidth="4.5" />
      <path d="M24 12v40M40 12v40M8 25.3h48M8 38.6h48" stroke={ink} strokeWidth="2" opacity=".35" />
      <circle cx="40" cy="25.3" r="5.5" fill="#0866ff" />
    </svg>
  );
}
