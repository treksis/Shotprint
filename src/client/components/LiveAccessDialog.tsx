import React, { useState, useEffect, useRef } from 'react';
import { verifyJudgePasscode } from '../lib/api';

export interface LiveAccessDialogProps {
  isOpen: boolean;
  initialMode?: 'demo' | 'live';
  reason?: string;
  onClose: () => void;
  onSelectDemo: () => void;
  onUnlocked: () => void;
}

export function LiveAccessDialog({
  isOpen,
  initialMode = 'demo',
  reason,
  onClose,
  onSelectDemo,
  onUnlocked,
}: LiveAccessDialogProps) {
  const [mode, setMode] = useState<'demo' | 'live'>(initialMode);
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setMode(reason ? 'live' : initialMode);
      setCode('');
      setError(null);
      setChecking(false);
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen, initialMode, reason]);

  useEffect(() => {
    if (isOpen && mode === 'live') {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmitLive = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("That code didn't work. Check the submission notes and try again.");
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const result = await verifyJudgePasscode(trimmed);
      if (result.authorized) {
        onUnlocked();
        onClose();
      } else {
        setError("That code didn't work. Check the submission notes and try again.");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-access-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[460px] rounded-[12px] bg-[#ffffff] p-6 border border-[#eeeeee] text-[#111111]">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="studio-access-dialog-title"
            className="text-[22px] font-semibold tracking-[-0.02em] text-[#111111]"
          >
            Open studio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] text-[#6b6b6b] hover:text-[#111111] cursor-pointer"
          >
            Close
          </button>
        </div>

        {reason && (
          <p className="mt-3 text-[14px] font-medium text-[#111111] bg-[#f4f4f4] px-3 py-2 rounded-[8px]">
            {reason}
          </p>
        )}

        {/* Mode Switcher: Demo vs Live */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-[10px] bg-[#f4f4f4]">
          <button
            type="button"
            onClick={() => {
              setMode('demo');
              setError(null);
            }}
            className={`h-[40px] rounded-[8px] text-[16px] font-medium cursor-pointer btn-tactile ${
              mode === 'demo'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-transparent text-[#6b6b6b] hover:text-[#111111]'
            }`}
          >
            Demo
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('live');
              setError(null);
            }}
            className={`h-[40px] rounded-[8px] text-[16px] font-medium cursor-pointer btn-tactile ${
              mode === 'live'
                ? 'bg-[#1a4be0] text-[#ffffff]'
                : 'bg-transparent text-[#6b6b6b] hover:text-[#111111]'
            }`}
          >
            Live
          </button>
        </div>

        {mode === 'demo' ? (
          <div className="mt-5 space-y-5">
            <p className="text-[16px] leading-[1.55] text-[#6b6b6b]">
              Try ready-made templates and sample products for free.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onSelectDemo();
                  onClose();
                }}
                className="flex-1 h-[44px] px-5 rounded-[8px] bg-[#111111] text-[#ffffff] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Continue in demo
              </button>
              <button
                type="button"
                onClick={() => setMode('live')}
                className="h-[44px] px-4 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Switch to live
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitLive} className="mt-5 space-y-4">
            <p className="text-[16px] leading-[1.55] text-[#6b6b6b]">
              Enter the judge passcode to create new videos from your own links and photos.
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="reviewer-access-code-input"
                  className="text-[14px] font-medium text-[#111111]"
                >
                  Judge passcode
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-[14px] text-[#6b6b6b] hover:text-[#111111] cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <input
                id="reviewer-access-code-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter passcode"
                autoComplete="off"
                spellCheck={false}
                className="w-full h-[44px] rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3.5 text-[16px] text-[#111111] focus:outline-none focus:border-[#1a4be0]"
              />

              {error && (
                <p aria-live="polite" className="mt-2 text-[14px] text-[#b91c1c]">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="submit"
                disabled={checking}
                className="flex-1 h-[44px] px-4 rounded-[8px] bg-[#1a4be0] text-[#ffffff] text-[16px] font-medium cursor-pointer btn-tactile disabled:opacity-50"
              >
                {checking ? 'Checking…' : 'Enter live studio'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDemo();
                  onClose();
                }}
                className="h-[44px] px-4 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#111111] text-[16px] font-medium cursor-pointer btn-tactile"
              >
                Use demo instead
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default LiveAccessDialog;
