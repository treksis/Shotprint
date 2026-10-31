import React, { useState, useRef } from 'react';
import { Lock, Upload, Film, X, Check, Copy } from 'lucide-react';
import type {
  ViralTemplate,
  RemixProject,
  DissectVideoRequest,
  ViralSceneBlueprint,
} from '../../../shared/types';
import {
  streamDissectVideo,
  uploadMediaAsset,
  LiveModeRequiredError,
  type DissectStreamEvent,
} from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface EmptyStudioFormProps {
  templates: ViralTemplate[];
  projects: RemixProject[];
  isJudgeMode: boolean;
  onRequestLive: (reason?: string, retry?: () => void) => void;
  onSelectProject: (projectId: string) => void;
  onTemplateCreated: (template: ViralTemplate) => void;
  onProjectCreated: (project: RemixProject) => void;
  onOpenTemplates: () => void;
  onSwitchToAgentMode?: () => void;
}

const SAMPLE_VIDEOS = [
  {
    label: 'Cold Drink Splash Reveal',
    videoTitle: 'Cold Drink Splash Reveal',
    videoFileName: 'cold-drink-splash.mp4',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-red-soda-can-with-water-drops-and-ice-41761-large.mp4',
    presetTemplateId: 'tpl-beverage-splash',
  },
  {
    label: 'Skincare Dropper Routine',
    videoTitle: 'Skincare Dropper Routine',
    videoFileName: 'skincare-dropper.mp4',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-woman-applying-cream-on-her-face-39884-large.mp4',
    presetTemplateId: 'tpl-skincare-dropper',
  },
  {
    label: 'Tech Gadget Unboxing',
    videoTitle: 'Tech Gadget Unboxing',
    videoFileName: 'tech-gadget-unbox.mp4',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41541-large.mp4',
    presetTemplateId: 'tpl-tech-unbox',
  },
];

function formatTitleFromFileName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Uploaded Video';
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const EmptyStudioForm: React.FC<EmptyStudioFormProps> = ({
  templates,
  isJudgeMode,
  onRequestLive,
  onTemplateCreated,
  onOpenTemplates,
  onSwitchToAgentMode,
}) => {
  const [stage, setStage] = useState<'upload' | 'dissecting' | 'template'>('upload');

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState<boolean>(false);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming & Dissection State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [hyperframes, setHyperframes] = useState<
    Array<{
      sceneIndex: number;
      timestampSec: number;
      window: string;
      shotType: string;
      focalRegion: { x: number; y: number; w: number; h: number };
    }>
  >([]);
  const [streamedScenes, setStreamedScenes] = useState<ViralSceneBlueprint[]>([]);
  const [dissectedTemplate, setDissectedTemplate] = useState<ViralTemplate | null>(null);
  const [activeCutIdx, setActiveCutIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'stream' | 'json' | 'hyperframes'>('stream');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const loadSampleVideo = (sample: (typeof SAMPLE_VIDEOS)[number]) => {
    setVideoTitle(sample.videoTitle);
    setVideoFileName(sample.videoFileName);
    setVideoUrl(sample.videoUrl);
    setSelectedPresetId(sample.presetTemplateId);
    setError(null);
  };

  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please drop a video file (MP4, MOV, or WebM).');
      return;
    }
    setError(null);
    setSelectedPresetId(null);
    setUploadingVideo(true);
    try {
      const uploaded = await uploadMediaAsset(file);
      setVideoUrl(uploaded.url);
      setVideoFileName(file.name);
      if (!videoTitle.trim()) {
        setVideoTitle(formatTitleFromFileName(file.name));
      }
    } finally {
      setUploadingVideo(false);
    }
  };

  const runStreamingDissection = async () => {
    if (!videoUrl.trim()) {
      setError('Please drop a video file or load a sample video first.');
      return;
    }

    setError(null);
    setStage('dissecting');
    setIsStreaming(true);
    setStreamLogs([]);
    setHyperframes([]);
    setStreamedScenes([]);
    setDissectedTemplate(null);
    setActiveCutIdx(0);

    // If in Demo mode and using a pre-seeded sample video, stream its dissection locally
    const matchingPreset =
      selectedPresetId && templates.find((t) => t.id === selectedPresetId);

    if (!isJudgeMode && matchingPreset) {
      const steps: DissectStreamEvent[] = [
        {
          type: 'status',
          message: `Reading video container and extracting hyperframes for "${matchingPreset.title}"…`,
        },
        {
          type: 'hyperframes',
          message: `Extracted ${matchingPreset.blueprint.scenes.length} hyperframe anchor points across ${matchingPreset.durationSec}s.`,
          hyperframes: matchingPreset.blueprint.scenes.map((s) => ({
            sceneIndex: s.sceneIndex,
            timestampSec: s.startTime,
            window: `${s.startTime.toFixed(1)}s–${s.endTime.toFixed(1)}s`,
            shotType: s.shotType,
            focalRegion: s.samFocalRegion,
          })),
        },
        {
          type: 'summary',
          message: `Hook: ${matchingPreset.blueprint.hookAnalysis.first3SecMechanic} · Style: ${matchingPreset.blueprint.globalStyle.lighting}`,
          overallHook: matchingPreset.blueprint.hookAnalysis.first3SecMechanic,
          pacingStyle: matchingPreset.blueprint.globalStyle.lighting,
        },
        ...matchingPreset.blueprint.scenes.map(
          (scene): DissectStreamEvent => ({
            type: 'cut',
            sceneIndex: scene.sceneIndex,
            message: `Cut ${scene.sceneIndex} (${scene.startTime.toFixed(1)}s–${scene.endTime.toFixed(1)}s) — ${scene.shotType}: ${scene.originalAction}`,
            scene,
          })
        ),
        {
          type: 'blueprint_json',
          message: 'Built structured template JSON blueprint.',
          blueprint: matchingPreset.blueprint,
        },
        {
          type: 'complete',
          message: 'Template ready.',
          template: matchingPreset,
        },
      ];

      for (const evt of steps) {
        await new Promise((r) => setTimeout(r, 260));
        if (evt.message) {
          setStreamLogs((prev) => [...prev, evt.message!]);
        }
        if (evt.type === 'hyperframes' && evt.hyperframes) {
          setHyperframes(evt.hyperframes);
        }
        if (evt.type === 'cut' && evt.scene) {
          setStreamedScenes((prev) => [...prev, evt.scene!]);
        }
        if (evt.type === 'complete' && evt.template) {
          setDissectedTemplate(evt.template);
          setStage('template');
        }
      }
      setIsStreaming(false);
      return;
    }

    try {
      const payload: DissectVideoRequest = {
        title:
          videoTitle.trim() ||
          formatTitleFromFileName(videoFileName || 'Uploaded Video'),
        sourceVideoUrl: videoUrl.trim(),
        category: 'Product Ad',
        sourcePlatform: 'TikTok',
      };

      const created = await streamDissectVideo(payload, (evt) => {
        if (evt.message) {
          setStreamLogs((prev) => [...prev, evt.message!]);
        }
        if (evt.type === 'hyperframes' && evt.hyperframes) {
          setHyperframes(evt.hyperframes);
        }
        if (evt.type === 'cut' && evt.scene) {
          setStreamedScenes((prev) => [...prev, evt.scene!]);
        }
        if (evt.type === 'complete' && evt.template) {
          setDissectedTemplate(evt.template);
        }
      });

      setDissectedTemplate(created);
      onTemplateCreated(created);
      setStage('template');
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        setStage('upload');
        onRequestLive('Analyzing a new uploaded video requires live mode.', () => {
          void runStreamingDissection();
        });
      } else {
        setError(
          err instanceof Error ? err.message : 'Could not analyze video.'
        );
        setStage('upload');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError('Please drop a video file first (or click a sample video above).');
      return;
    }
    if (!isJudgeMode && !selectedPresetId) {
      onRequestLive('Analyzing a new uploaded video requires live mode.', () => {
        void runStreamingDissection();
      });
      return;
    }
    await runStreamingDissection();
  };

  const seekToTimestamp = (sec: number, idx: number) => {
    setActiveCutIdx(idx);
    if (playerRef.current) {
      try {
        playerRef.current.currentTime = sec;
      } catch {
        // Ignore seek on unbuffered video
      }
    }
  };

  const blueprintJsonObject = dissectedTemplate
    ? {
        id: dissectedTemplate.id,
        title: dissectedTemplate.title,
        durationSec: dissectedTemplate.durationSec,
        overallHook: dissectedTemplate.blueprint.hookAnalysis.first3SecMechanic,
        lighting: dissectedTemplate.blueprint.globalStyle.lighting,
        hyperframes,
        scenes: dissectedTemplate.blueprint.scenes.map((s) => ({
          sceneIndex: s.sceneIndex,
          startTime: s.startTime,
          endTime: s.endTime,
          shotType: s.shotType,
          cameraMovement: s.cameraMovement,
          originalAction: s.originalAction,
          whyItWorks: s.whyItWorks,
          focalRegion: s.samFocalRegion,
        })),
      }
    : {
        title: videoTitle || 'Analyzing video…',
        status: isStreaming ? 'streaming' : 'ready',
        hyperframes,
        scenes: streamedScenes,
      };

  const formattedJson = JSON.stringify(blueprintJsonObject, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <section className="w-full max-w-[1040px] mx-auto px-6 py-6 space-y-6">
      {/* Multi-Step Process Indicator */}
      <div className="rounded-[10px] bg-[#f6f6f4] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStage('upload')}
            className={`h-8 px-3.5 rounded-[6px] text-[13px] font-medium cursor-pointer ${
              stage === 'upload'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#111111]'
            }`}
          >
            1. Bring your own video
          </button>
          <span className="text-[#6b6b6b] text-[13px]">→</span>
          <button
            type="button"
            disabled={stage === 'upload'}
            onClick={() => stage !== 'upload' && setStage('dissecting')}
            className={`h-8 px-3.5 rounded-[6px] text-[13px] font-medium ${
              stage === 'dissecting'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#6b6b6b]'
            }`}
          >
            2. Stream analysis &amp; JSON
          </button>
          <span className="text-[#6b6b6b] text-[13px]">→</span>
          <button
            type="button"
            disabled={!dissectedTemplate}
            onClick={() => dissectedTemplate && setStage('template')}
            className={`h-8 px-3.5 rounded-[6px] text-[13px] font-medium ${
              stage === 'template'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#6b6b6b]'
            }`}
          >
            3. Hyperframes &amp; template
          </button>
        </div>

        <Badge variant="secondary">
          {stage === 'upload'
            ? 'Step 1 of 3'
            : stage === 'dissecting'
              ? 'Streaming analysis…'
              : 'Template ready'}
        </Badge>
      </div>

      {/* STAGE 1: Bring Your Own Video + Analyze */}
      {stage === 'upload' && (
        <div className="max-w-[760px] space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111111]">
              Reverse engineer any video
            </h1>
            <p className="text-[15px] text-[#6b6b6b]">
              Drop a short-form video to dissect its cuts, extract hyperframes, and build a reusable JSON template.
            </p>
          </div>

          <form
            onSubmit={handleAnalyzeSubmit}
            className="rounded-[12px] bg-[#f6f6f4] p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-[#111111]">
                Source video file
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SAMPLE_VIDEOS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => loadSampleVideo(sample)}
                    className="px-2.5 py-1 rounded-[6px] bg-[#ffffff] text-[13px] font-medium text-[#111111] hover:bg-[#e9e9e7] cursor-pointer"
                  >
                    Sample: {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleVideoFile(file);
              }}
            />

            {!videoUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(true);
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleVideoFile(file);
                }}
                onClick={() => videoInputRef.current?.click()}
                className={`rounded-[10px] border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                  isDraggingVideo
                    ? 'border-[#1a4be0] bg-[#f4f6fc]'
                    : 'border-[#d1d5db] bg-[#ffffff] hover:border-[#111111]'
                }`}
              >
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-[8px] bg-[#f6f6f4] text-[#111111]">
                  <Upload className="size-5" />
                </div>
                <div className="text-[15px] font-semibold text-[#111111]">
                  {uploadingVideo
                    ? 'Uploading video…'
                    : 'Drag and drop your video here, or click to browse'}
                </div>
                <div className="mt-1 text-[13px] text-[#6b6b6b]">
                  MP4, MOV, or WebM · Dissects cuts, hyperframes, and template JSON
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] bg-[#ffffff] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <video
                    src={videoUrl}
                    muted
                    playsInline
                    className="w-24 h-16 rounded-[6px] bg-[#111111] object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#111111] truncate">
                      <Film className="size-4 shrink-0 text-[#1a4be0]" />
                      <span className="truncate">
                        {videoFileName || 'Video loaded'}
                      </span>
                    </div>
                    <div className="text-[13px] text-[#6b6b6b]">
                      {selectedPresetId
                        ? 'Sample video ready to analyze'
                        : 'Custom video ready for LLM dissection'}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVideoUrl('');
                    setVideoFileName('');
                    setSelectedPresetId(null);
                    if (videoInputRef.current) videoInputRef.current.value = '';
                  }}
                >
                  <X className="size-3.5" />
                  <span>Remove</span>
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#111111]">
                Template title
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Cold Drink Splash Reveal"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="bg-[#ffffff]"
              />
            </div>

            {error && <p className="text-[13px] text-[#c4242a]">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onOpenTemplates}
              >
                View saved templates
              </Button>

              <Button type="submit" size="lg">
                {!isJudgeMode && !selectedPresetId && (
                  <Lock className="size-3.5" />
                )}
                <span>Analyze video →</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* STAGE 2 & 3: Live Streaming Dissection, Hyperframes & JSON Blueprint */}
      {(stage === 'dissecting' || stage === 'template') && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111111]">
                {isStreaming
                  ? `Analyzing "${videoTitle || 'Video'}"…`
                  : `Dissected Template: ${dissectedTemplate?.title || videoTitle}`}
              </h1>
              <p className="text-[15px] text-[#6b6b6b]">
                {isStreaming
                  ? 'Streaming cut detection, what happens in each shot, and building the JSON template.'
                  : 'Inspect extracted hyperframes, what happens in each cut, and the structured JSON blueprint.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage('upload')}
              >
                Analyze another video
              </Button>
              <Button type="button" onClick={onOpenTemplates}>
                Open in Templates →
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Video Player + Extracted Hyperframes Strip */}
            <div className="lg:col-span-5 rounded-[12px] bg-[#f6f6f4] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[#111111]">
                  Source video &amp; hyperframes
                </span>
                <span className="text-[13px] text-[#6b6b6b] tabular-nums">
                  {hyperframes.length} hyperframes
                </span>
              </div>

              <div className="relative rounded-[8px] overflow-hidden bg-[#111111] aspect-[9/16] max-h-[380px] mx-auto w-full">
                <video
                  ref={playerRef}
                  src={dissectedTemplate?.sourceVideoUrl || videoUrl}
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Hyperframes Timeline Strip */}
              {hyperframes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[13px] font-medium text-[#111111]">
                    Hyperframes (click to seek)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                    {hyperframes.map((hf, idx) => {
                      const isSelected = activeCutIdx === idx;
                      return (
                        <button
                          key={hf.sceneIndex}
                          type="button"
                          onClick={() => seekToTimestamp(hf.timestampSec, idx)}
                          className={`text-left rounded-[8px] p-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#111111] text-[#ffffff]'
                              : 'bg-[#ffffff] text-[#111111] hover:bg-[#e9e9e7]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[13px] font-semibold tabular-nums">
                            <span>Frame #{hf.sceneIndex}</span>
                            <span
                              className={
                                isSelected ? 'text-[#d1d5db]' : 'text-[#6b6b6b]'
                              }
                            >
                              {hf.window}
                            </span>
                          </div>
                          <div
                            className={`text-[13px] truncate mt-0.5 ${
                              isSelected ? 'text-[#ffffff]' : 'text-[#6b6b6b]'
                            }`}
                          >
                            {hf.shotType}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Stream Breakdown + Structured Template JSON */}
            <div className="lg:col-span-7 rounded-[12px] bg-[#f6f6f4] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('stream')}
                    className={`h-8 px-3 rounded-[6px] text-[13px] font-medium cursor-pointer ${
                      activeTab === 'stream'
                        ? 'bg-[#111111] text-[#ffffff]'
                        : 'bg-[#ffffff] text-[#111111]'
                    }`}
                  >
                    What&apos;s happening (Stream)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('json')}
                    className={`h-8 px-3 rounded-[6px] text-[13px] font-medium cursor-pointer ${
                      activeTab === 'json'
                        ? 'bg-[#111111] text-[#ffffff]'
                        : 'bg-[#ffffff] text-[#111111]'
                    }`}
                  >
                    Template JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hyperframes')}
                    className={`h-8 px-3 rounded-[6px] text-[13px] font-medium cursor-pointer ${
                      activeTab === 'hyperframes'
                        ? 'bg-[#111111] text-[#ffffff]'
                        : 'bg-[#ffffff] text-[#111111]'
                    }`}
                  >
                    Hyperframe specs
                  </button>
                </div>

                {activeTab === 'json' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJson}
                  >
                    {copiedJson ? (
                      <>
                        <Check className="size-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Tab 1: Live Stream Log + Cut-by-Cut Cards */}
              {activeTab === 'stream' && (
                <div className="space-y-4">
                  <div className="rounded-[8px] bg-[#ffffff] p-4 space-y-2">
                    <div className="text-[13px] font-semibold text-[#111111]">
                      Live dissection stream
                    </div>
                    <div className="space-y-1.5 text-[14px] text-[#111111]">
                      {streamLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="size-4 text-[#247b50] shrink-0 mt-0.5" />
                          <span>{log}</span>
                        </div>
                      ))}
                      {isStreaming && (
                        <div className="text-[13px] text-[#1a4be0] font-medium">
                          Streaming next cut from analyzer…
                        </div>
                      )}
                    </div>
                  </div>

                  {(dissectedTemplate?.blueprint.scenes || streamedScenes).map(
                    (scene, idx) => (
                      <div
                        key={scene.sceneIndex}
                        onClick={() => seekToTimestamp(scene.startTime, idx)}
                        className={`rounded-[8px] p-4 cursor-pointer transition-colors space-y-2 ${
                          activeCutIdx === idx
                            ? 'bg-[#ffffff] ring-2 ring-[#111111]'
                            : 'bg-[#ffffff]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-semibold text-[#111111]">
                            Cut {scene.sceneIndex}: {scene.shotType}
                          </span>
                          <span className="text-[13px] text-[#6b6b6b] tabular-nums">
                            {scene.startTime.toFixed(1)}s – {scene.endTime.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-[14px] text-[#111111]">
                          {scene.originalAction}
                        </p>
                        <div className="flex flex-wrap gap-3 text-[13px] text-[#6b6b6b]">
                          <span>Camera: {scene.cameraMovement}</span>
                          <span>·</span>
                          <span>Why it works: {scene.whyItWorks}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Tab 2: Structured JSON Blueprint */}
              {activeTab === 'json' && (
                <pre className="rounded-[8px] bg-[#111111] text-[#ffffff] p-4 text-[13px] leading-[1.5] overflow-x-auto max-h-[520px]">
                  <code>{formattedJson}</code>
                </pre>
              )}

              {/* Tab 3: Hyperframe Spatial Specs */}
              {activeTab === 'hyperframes' && (
                <div className="space-y-3">
                  {hyperframes.map((hf, idx) => (
                    <div
                      key={hf.sceneIndex}
                      onClick={() => seekToTimestamp(hf.timestampSec, idx)}
                      className="rounded-[8px] bg-[#ffffff] p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="text-[14px] font-semibold text-[#111111]">
                          Hyperframe #{hf.sceneIndex} · {hf.shotType}
                        </div>
                        <div className="text-[13px] text-[#6b6b6b] tabular-nums">
                          Window: {hf.window} · Anchor: {hf.timestampSec.toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-[13px] text-[#111111] tabular-nums bg-[#f6f6f4] px-3 py-1.5 rounded-[6px]">
                        Focal box: x={hf.focalRegion.x}, y={hf.focalRegion.y}, w=
                        {hf.focalRegion.w}, h={hf.focalRegion.h}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EmptyStudioForm;
