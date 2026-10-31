// Shared Data Contracts between Cloudflare Worker API & React Studio Client

export interface SamBoundingBox {
  label: string;
  confidence: number;
  // Normalized coordinates (0.0 to 1.0)
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface ViralSceneBlueprint {
  sceneIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  shotType: string;
  cameraMovement: string;
  originalAction: string;
  whyItWorks: string;
  samFocalRegion: SamBoundingBox;
  templateImagePrompt: string;   // Uses {{PRODUCT}} and {{BRAND_VIBE}} placeholders
  templateMotionPrompt: string;  // Camera & physics prompt for fal.ai
  audioCue: string;
}

export interface HookAnalysis {
  hookType: string;
  first3SecMechanic: string;
  psychologicalTrigger: string;
  hookScore: number; // 0-100
  retentionCurvePreview: number[]; // e.g. [100, 96, 94, 91, 89, 88]
}

export interface GlobalStyle {
  aspectRatio: '9:16' | '16:9' | '1:1';
  lighting: string;
  colorGrading: string;
  pacingCutsPer10s: number;
  bpm: number;
  audioCadence: string;
}

export interface ViralBlueprint {
  hookAnalysis: HookAnalysis;
  globalStyle: GlobalStyle;
  scenes: ViralSceneBlueprint[];
}

export interface ViralTemplate {
  id: string;
  title: string;
  category: string;
  viewsCount: string;
  sourcePlatform: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
  sourceVideoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  blueprint: ViralBlueprint;
  isPreset: boolean;
  createdAt: string;
}

export type SceneRenderStatus = 'pending' | 'keyframing' | 'keyframe_ready' | 'rendering_video' | 'completed';

export interface ProjectScene {
  id: string;
  projectId: string;
  sceneIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  shotType: string;
  cameraMovement: string;
  adaptedImagePrompt: string;
  adaptedMotionPrompt: string;
  scriptOverlay: string;
  keyframeUrl: string;
  videoClipUrl: string;
  status: SceneRenderStatus;
}

export interface FidelityReport {
  overallScore: number;
  pacingMatchScore: number;
  hookContrastScore: number;
  productProminenceScore: number;
  museCritique: string;
  verifiedByModel: string;
  timestamp: string;
}

export type ProjectStatus = 'dissecting' | 'storyboard_ready' | 'rendering_clips' | 'completed';

export interface PipelineStepLog {
  id: string;
  step: string;
  model: 'Muse Spark 1.3' | 'SAM 3.1' | 'Muse Image' | 'fal.ai Kling 1.6' | 'FFmpeg Container';
  status: 'completed' | 'running' | 'pending';
  latencyMs?: number;
  detail: string;
}

export interface RemixProject {
  id: string;
  templateId: string;
  templateTitle: string;
  productName: string;
  productCategory: string;
  productBrief: string;
  productImageUrl: string;
  status: ProjectStatus;
  scenes: ProjectScene[];
  finalVideoUrl: string;
  fidelityReport?: FidelityReport;
  pipelineLogs: PipelineStepLog[];
  createdAt: string;
}

export type ExecutionMode = 'api' | 'agent';

export interface DissectVideoRequest {
  title: string;
  sourceVideoUrl: string;
  category: string;
  sourcePlatform?: 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
  executionMode?: ExecutionMode;
}

export interface AgentToolAction {
  id: string;
  tool: 'inspect_video' | 'write_hyperframe' | 'write_ffmpeg_script' | 'exec_sandbox';
  command: string;
  status: 'completed' | 'failed';
  output: string;
}

export interface SandboxWorkspaceSnapshot {
  sessionId: string;
  runtime: 'cloudflare_microvm_do' | 'local_isolated_workspace';
  workspaceDir: string;
  outboundInternetEnabled: false;
  ffmpegVersion: string;
  files: Array<{ name: string; type: string }>;
  hyperframeJson?: unknown;
  renderScript?: string;
}

export interface AgentChatRequest {
  sessionId: string;
  prompt: string;
  templateId?: string;
  projectId?: string;
  videoUrl?: string;
  videoTitle?: string;
}

export interface AgentChatResponse {
  reply: string;
  model: string;
  actions: AgentToolAction[];
  sandbox: SandboxWorkspaceSnapshot;
  updatedTemplate?: ViralTemplate;
  updatedProject?: RemixProject;
}

export interface CreateProjectRequest {
  templateId: string;
  productName: string;
  productCategory?: string;
  productBrief: string;
  productImageUrl?: string;
}

export interface UpdateSceneRequest {
  adaptedImagePrompt?: string;
  adaptedMotionPrompt?: string;
  scriptOverlay?: string;
}
