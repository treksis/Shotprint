// Judge (Live mode) access: the passcode lives in sessionStorage and rides on Studio requests.

const JUDGE_STORAGE_KEY = 'museclone_judge_mode';
const JUDGE_PASSCODE_KEY = 'museclone_judge_key';

export interface JudgeVerificationResponse {
  authorized: boolean;
  mode: string;
  error?: string;
}

export function getJudgeModeState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(JUDGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const getInitialJudgeMode = getJudgeModeState;

export function getJudgePasscode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(JUDGE_PASSCODE_KEY) || '';
  } catch {
    return '';
  }
}

export function setJudgeModeState(enabled: boolean, passcode: string = ''): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(JUDGE_STORAGE_KEY, enabled ? 'true' : 'false');
    if (enabled && passcode) window.sessionStorage.setItem(JUDGE_PASSCODE_KEY, passcode.trim().toUpperCase());
    else if (!enabled) window.sessionStorage.removeItem(JUDGE_PASSCODE_KEY);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export async function verifyJudgePasscode(passcode: string): Promise<JudgeVerificationResponse> {
  const normalized = passcode.trim().toUpperCase();
  if (!normalized) return { authorized: false, mode: 'public', error: 'invalid_access_code' };
  try {
    const res = await fetch('/api/judge/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: normalized }),
    });
    const body = (await res.json().catch(() => ({ authorized: false, mode: 'error' }))) as JudgeVerificationResponse;
    if (body.authorized) setJudgeModeState(true, normalized);
    return body;
  } catch {
    return { authorized: false, mode: 'error' };
  }
}
