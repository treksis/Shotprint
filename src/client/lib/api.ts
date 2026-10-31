import type {
  AgentChatRequest,
  AgentChatResponse,
  CreateProjectRequest,
  DissectVideoRequest,
  RemixProject,
  SandboxWorkspaceSnapshot,
  UpdateSceneRequest,
  ViralTemplate,
} from '../../shared/types';

export const JUDGE_STORAGE_KEY = 'museclone_judge_mode';
export const JUDGE_PASSCODE_KEY = 'museclone_judge_key';

export interface JudgeVerificationResponse {
  authorized: boolean;
  mode: string;
  error?: string;
}

export class LiveModeRequiredError extends Error {
  constructor(message = 'Live mode is required for this action.') {
    super(message);
    this.name = 'LiveModeRequiredError';
  }
}

/**
 * Checks sessionStorage only to determine if Reviewer Live Mode is active.
 */
export function getJudgeModeState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(JUDGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isJudgeModeEnabled(): boolean {
  return getJudgeModeState();
}

export function getInitialJudgeMode(): boolean {
  return getJudgeModeState();
}

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
    window.localStorage.removeItem(JUDGE_STORAGE_KEY);
    if (enabled && passcode) {
      window.sessionStorage.setItem(JUDGE_PASSCODE_KEY, passcode.trim().toUpperCase());
    } else if (!enabled) {
      window.sessionStorage.removeItem(JUDGE_PASSCODE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const setJudgeMode = setJudgeModeState;

export function enableJudgeMode(passcode: string): void {
  setJudgeModeState(true, passcode);
}

export function disableJudgeMode(): void {
  setJudgeModeState(false);
}

export function toggleJudgeModeState(): boolean {
  const next = !getJudgeModeState();
  setJudgeModeState(next);
  return next;
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const judgeActive = getJudgeModeState();
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Judge-Mode': judgeActive ? 'true' : 'false',
  };
  if (judgeActive) {
    const key = getJudgePasscode();
    if (key) {
      base['X-Judge-Key'] = key;
    }
  }
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => {
        base[k] = v;
      });
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) {
        base[k] = v;
      }
    } else {
      Object.assign(base, extra);
    }
  }
  return base;
}

async function requestWithFallback<T>(
  urls: string[],
  options: RequestInit = {},
  unwrapKey?: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const response = await fetch(url, {
        ...options,
        headers: buildHeaders(options.headers),
      });

      if ((response.status === 404 || response.status === 405) && i < urls.length - 1) {
        continue;
      }

      if (response.status === 402) {
        throw new LiveModeRequiredError('live_mode_required');
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let message = `API Error ${response.status} on ${url}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed.error === 'string') {
            message = parsed.error;
          } else if (parsed && typeof parsed.message === 'string') {
            message = parsed.message;
          }
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      const data = await response.json();
      if (
        unwrapKey &&
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        unwrapKey in data
      ) {
        return (data as Record<string, unknown>)[unwrapKey] as T;
      }
      return data as T;
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i === urls.length - 1) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('API request failed');
}

export async function uploadMediaAsset(
  file: File
): Promise<{ url: string; fileName: string; contentType: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const judgeActive = getJudgeModeState();
  const headers: Record<string, string> = {
    'X-Judge-Mode': judgeActive ? 'true' : 'false',
  };
  if (judgeActive) {
    const key = getJudgePasscode();
    if (key) {
      headers['X-Judge-Key'] = key;
    }
  }

  try {
    const res = await fetch('/api/assets/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        url: string;
        fileName: string;
        contentType: string;
      };
      return data;
    }
  } catch {
    // Fallback to browser object URL if upload fails
  }

  return {
    url: URL.createObjectURL(file),
    fileName: file.name,
    contentType: file.type,
  };
}

export async function fetchTemplates(): Promise<ViralTemplate[]> {
  return requestWithFallback<ViralTemplate[]>(['/api/templates'], { method: 'GET' }, 'templates');
}

export async function fetchTemplateById(id: string): Promise<ViralTemplate> {
  const safeId = encodeURIComponent(id);
  return requestWithFallback<ViralTemplate>(
    [`/api/templates/${safeId}`],
    { method: 'GET' },
    'template'
  );
}

export interface DissectStreamEvent {
  type: 'status' | 'hyperframes' | 'summary' | 'cut' | 'blueprint_json' | 'complete' | 'error';
  message?: string;
  hyperframes?: Array<{
    sceneIndex: number;
    timestampSec: number;
    window: string;
    shotType: string;
    focalRegion: { x: number; y: number; w: number; h: number };
  }>;
  overallHook?: string;
  pacingStyle?: string;
  sceneIndex?: number;
  scene?: ViralTemplate['blueprint']['scenes'][number];
  blueprint?: ViralTemplate['blueprint'];
  template?: ViralTemplate;
}

export async function streamDissectVideo(
  payload: DissectVideoRequest,
  onEvent: (event: DissectStreamEvent) => void
): Promise<ViralTemplate> {
  const response = await fetch('/api/templates/dissect-stream', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 402) {
    throw new LiveModeRequiredError('live_mode_required');
  }

  if (!response.ok || !response.body) {
    return dissectVideo(payload);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalTemplate: ViralTemplate | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const evt = JSON.parse(trimmed) as DissectStreamEvent;
        onEvent(evt);
        if (evt.type === 'complete' && evt.template) {
          finalTemplate = evt.template;
        }
      } catch {
        // Ignore malformed NDJSON chunk
      }
    }
  }

  if (finalTemplate) {
    return finalTemplate;
  }
  return dissectVideo(payload);
}

export async function dissectVideo(payload: DissectVideoRequest): Promise<ViralTemplate> {
  return requestWithFallback<ViralTemplate>(
    ['/api/templates/dissect', '/api/dissect', '/api/templates'],
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'template'
  );
}

export async function fetchProjects(): Promise<RemixProject[]> {
  return requestWithFallback<RemixProject[]>(['/api/projects'], { method: 'GET' }, 'projects');
}

export async function fetchProjectById(id: string): Promise<RemixProject> {
  const safeId = encodeURIComponent(id);
  return requestWithFallback<RemixProject>(
    [`/api/projects/${safeId}`],
    { method: 'GET' },
    'project'
  );
}

export async function createProject(payload: CreateProjectRequest): Promise<RemixProject> {
  return requestWithFallback<RemixProject>(
    ['/api/projects'],
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'project'
  );
}

export async function updateScene(
  projectId: string,
  sceneIndex: number,
  payload: UpdateSceneRequest
): Promise<RemixProject> {
  const safeId = encodeURIComponent(projectId);
  const path = `/api/projects/${safeId}/scenes/${sceneIndex}`;
  try {
    return await requestWithFallback<RemixProject>(
      [path],
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      'project'
    );
  } catch {
    return requestWithFallback<RemixProject>(
      [path],
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      'project'
    );
  }
}

export async function regenerateKeyframe(
  projectId: string,
  sceneIndex: number,
  prompt?: string
): Promise<RemixProject> {
  const safeId = encodeURIComponent(projectId);
  return requestWithFallback<RemixProject>(
    [
      `/api/projects/${safeId}/scenes/${sceneIndex}/keyframe`,
      `/api/projects/${safeId}/scenes/${sceneIndex}/regenerate-keyframe`,
    ],
    {
      method: 'POST',
      body: JSON.stringify({ prompt, adaptedImagePrompt: prompt }),
    },
    'project'
  );
}

export async function renderSceneClip(
  projectId: string,
  sceneIndex: number
): Promise<RemixProject> {
  const safeId = encodeURIComponent(projectId);
  return requestWithFallback<RemixProject>(
    [
      `/api/projects/${safeId}/scenes/${sceneIndex}/render`,
      `/api/projects/${safeId}/scenes/${sceneIndex}/render-clip`,
      `/api/projects/${safeId}/scenes/${sceneIndex}/clip`,
    ],
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'project'
  );
}

export async function renderAllProjectClips(projectId: string): Promise<RemixProject> {
  const safeId = encodeURIComponent(projectId);
  return requestWithFallback<RemixProject>(
    [
      `/api/projects/${safeId}/render-all`,
      `/api/projects/${safeId}/render`,
    ],
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'project'
  );
}

export async function verifyProjectFidelity(projectId: string): Promise<RemixProject> {
  const safeId = encodeURIComponent(projectId);
  return requestWithFallback<RemixProject>(
    [
      `/api/projects/${safeId}/verify`,
      `/api/projects/${safeId}/verify-fidelity`,
      `/api/projects/${safeId}/fidelity`,
    ],
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'project'
  );
}

export async function fetchSandboxSession(sessionId: string): Promise<SandboxWorkspaceSnapshot> {
  const safeId = encodeURIComponent(sessionId);
  return requestWithFallback<SandboxWorkspaceSnapshot>(
    [`/api/sandbox/${safeId}`],
    { method: 'GET' }
  );
}

export async function runAgentChatTurn(payload: AgentChatRequest): Promise<AgentChatResponse> {
  return requestWithFallback<AgentChatResponse>(
    ['/api/agent/chat', '/api/agent/run'],
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function verifyJudgePasscode(
  passcode: string
): Promise<JudgeVerificationResponse> {
  const normalized = passcode.trim().toUpperCase();
  if (!normalized) {
    return { authorized: false, mode: 'public_sandbox', error: 'invalid_access_code' };
  }
  try {
    const res = await requestWithFallback<JudgeVerificationResponse>(
      ['/api/judge/verify', '/api/auth/judge', '/api/judge'],
      {
        method: 'POST',
        body: JSON.stringify({ passcode: normalized, key: normalized }),
      }
    );
    if (res.authorized) {
      setJudgeModeState(true, normalized);
    }
    return res;
  } catch {
    return {
      authorized: false,
      mode: 'error',
    };
  }
}
