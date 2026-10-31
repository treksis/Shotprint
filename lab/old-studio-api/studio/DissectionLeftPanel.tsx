import React, { useState, useRef, useEffect } from 'react';
import { Scan, ArrowRight, Plus, Lock } from 'lucide-react';
import type {
  ViralTemplate,
  ViralSceneBlueprint,
  RemixProject,
} from '../../../shared/types';

export interface DissectionLeftPanelProps {
  template: ViralTemplate;
  templates?: ViralTemplate[];
  project?: RemixProject;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onSelectTemplate?: (template: ViralTemplate) => void;
  onOpenAddVideo?: () => void;
  onNextStep?: () => void;
  isJudgeMode?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value <= 1
    ? Math.max(0, Math.min(100, value * 100))
    : Math.max(0, Math.min(100, value));
}

export const DissectionLeftPanel: React.FC<DissectionLeftPanelProps> = ({
  template,
  templates = [],
  project,
  activeSceneIndex,
  onSelectScene,
  onSelectTemplate,
  onOpenAddVideo,
  onNextStep,
  isJudgeMode = false,
  videoRef: externalVideoRef,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const resolvedVideoRef = externalVideoRef ?? internalVideoRef;

  const [showProductBox, setShowProductBox] = useState<boolean>(true);

  const scenes: ViralSceneBlueprint[] = template.blueprint?.scenes ?? [];
  const activeScene: ViralSceneBlueprint | undefined =
    scenes[activeSceneIndex] ??
    scenes.find((s) => s.sceneIndex === activeSceneIndex) ??
    scenes[0];

  useEffect(() => {
    const vid = resolvedVideoRef.current;
    if (!vid || !activeScene) return;
    if (
      Math.abs(vid.currentTime - activeScene.startTime) > 0.35 &&
      vid.readyState >= 1
    ) {
      try {
        vid.currentTime = activeScene.startTime;
      } catch {
        // Ignore seek errors on unbuffered streams
      }
    }
  }, [activeSceneIndex, activeScene, resolvedVideoRef]);

  const handleSceneClick = (idx: number, scene: ViralSceneBlueprint) => {
    onSelectScene(idx);
    const vid = resolvedVideoRef.current;
    if (vid) {
      try {
        vid.currentTime = scene.startTime;
      } catch {
        // Ignore seek error
      }
    }
  };

  const samBox = activeScene?.samFocalRegion;
  const boxX = samBox ? toPercent(samBox.x) : 22;
  const boxY = samBox ? toPercent(samBox.y) : 18;
  const boxW = samBox ? toPercent(samBox.w) : 56;
  const boxH = samBox ? toPercent(samBox.h) : 58;

  const matchingProjectScene = project?.scenes?.[activeSceneIndex];

  return (
    <div className="p-6 space-y-6 bg-[#ffffff] text-[#111111]">
      {/* Top Bar: Choose Reference Video or Paste a Link */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111111]">
            1. Pick a viral video &amp; review its cuts
          </h1>
          <p className="text-[16px] text-[#6b6b6b] mt-0.5">
            Click any cut on the timeline to see what happens and what text appears on screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {templates.length > 1 && onSelectTemplate && (
            <select
              value={template.id}
              onChange={(e) => {
                const found = templates.find((t) => t.id === e.target.value);
                if (found) onSelectTemplate(found);
              }}
              aria-label="Choose reference video"
              className="h-9 px-3 rounded-[8px] bg-[#f4f4f2] border border-[#e5e5e5] text-[14px] font-medium text-[#111111] cursor-pointer focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.sourcePlatform})
                </option>
              ))}
            </select>
          )}

          {onOpenAddVideo && (
            <button
              type="button"
              onClick={onOpenAddVideo}
              className="h-9 px-3.5 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[14px] font-medium text-[#111111] hover:bg-[#f4f4f2] inline-flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              {!isJudgeMode ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
              <span>Upload video</span>
            </button>
          )}

          {onNextStep && (
            <button
              type="button"
              onClick={onNextStep}
              className="h-9 px-4 rounded-[8px] bg-[#111111] text-[#ffffff] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <span>Next: Swap product</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout: Video Left, Cut Breakdown Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Source Video Player */}
        <div className="lg:col-span-5 bg-[#f4f4f2] rounded-[12px] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-medium text-[#111111] truncate">
              {template.title}
            </span>
            <button
              type="button"
              onClick={() => setShowProductBox((prev) => !prev)}
              className={`h-8 px-3 rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                showProductBox
                  ? 'bg-[#1a4be0] text-[#ffffff]'
                  : 'bg-[#ffffff] text-[#6b6b6b]'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Product box: {showProductBox ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="relative bg-[#111111] rounded-[8px] overflow-hidden aspect-[9/16] max-h-[420px] mx-auto w-full">
            <video
              ref={resolvedVideoRef}
              src={template.sourceVideoUrl}
              poster={template.thumbnailUrl}
              muted
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            />

            {showProductBox && activeScene && (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                <div
                  data-ui
                  style={{
                    left: `${boxX}%`,
                    top: `${boxY}%`,
                    width: `${boxW}%`,
                    height: `${boxH}%`,
                  }}
                  className="absolute border-2 border-[#1a4be0] bg-[#1a4be0]/15 rounded-[6px]"
                >
                  <div className="absolute -top-7 left-0 bg-[#1a4be0] text-[#ffffff] text-[13px] px-2 py-0.5 rounded-[4px] font-medium whitespace-nowrap">
                    Product focus
                  </div>
                </div>
              </div>
            )}

            {activeScene && (
              <div className="pointer-events-none absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-[4px] bg-[#111111]/85 text-[#ffffff] text-[13px] tabular-nums">
                Cut {activeScene.sceneIndex} · {activeScene.startTime.toFixed(1)}s–
                {activeScene.endTime.toFixed(1)}s
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean Cut Timeline + Active Cut Details */}
        <div className="lg:col-span-7 space-y-5">
          {/* Horizontal Cut Selector Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-semibold text-[#111111]">
                Video timeline ({scenes.length} cuts · {template.durationSec}s total)
              </span>
              <span className="text-[13px] text-[#6b6b6b]">
                Click a cut to inspect
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {scenes.map((scene, idx) => {
                const isSelected = idx === activeSceneIndex;
                return (
                  <button
                    key={scene.sceneIndex ?? idx}
                    type="button"
                    onClick={() => handleSceneClick(idx, scene)}
                    className={`text-left p-3 rounded-[8px] border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#111111] text-[#ffffff] border-[#111111]'
                        : 'bg-[#f4f4f2] text-[#111111] border-transparent hover:border-[#d1d5db]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[13px] font-semibold tabular-nums">
                      <span>Cut {scene.sceneIndex}</span>
                      <span className={isSelected ? 'text-[#bdbdbd]' : 'text-[#6b6b6b]'}>
                        {scene.startTime.toFixed(1)}s–{scene.endTime.toFixed(1)}s
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-[13px] truncate ${
                        isSelected ? 'text-[#ffffff]' : 'text-[#6b6b6b]'
                      }`}
                    >
                      {scene.shotType}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Cut Simple Explanation Card */}
          {activeScene && (
            <div className="rounded-[12px] bg-[#f4f4f2] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[18px] font-semibold text-[#111111]">
                  Cut {activeScene.sceneIndex}: {activeScene.shotType}
                </h3>
                <span className="text-[13px] font-medium tabular-nums px-2.5 py-1 rounded-[6px] bg-[#ffffff] text-[#111111]">
                  {activeScene.startTime.toFixed(1)}s – {activeScene.endTime.toFixed(1)}s
                </span>
              </div>

              <div className="space-y-3 text-[16px]">
                <div className="bg-[#ffffff] rounded-[8px] p-3.5">
                  <div className="text-[13px] font-medium text-[#6b6b6b] mb-1">
                    What happens in this shot
                  </div>
                  <div className="text-[#111111] leading-[1.5]">
                    {activeScene.originalAction}
                  </div>
                </div>

                {matchingProjectScene?.scriptOverlay && (
                  <div className="bg-[#ffffff] rounded-[8px] p-3.5">
                    <div className="text-[13px] font-medium text-[#6b6b6b] mb-1">
                      On-screen text / what is said
                    </div>
                    <div className="text-[#111111] font-medium leading-[1.5]">
                      &ldquo;{matchingProjectScene.scriptOverlay}&rdquo;
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#ffffff] rounded-[8px] p-3.5">
                    <div className="text-[13px] font-medium text-[#6b6b6b] mb-1">
                      Camera movement
                    </div>
                    <div className="text-[#111111]">{activeScene.cameraMovement}</div>
                  </div>

                  <div className="bg-[#ffffff] rounded-[8px] p-3.5">
                    <div className="text-[13px] font-medium text-[#6b6b6b] mb-1">
                      Why this cut works
                    </div>
                    <div className="text-[#111111]">{activeScene.whyItWorks}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DissectionLeftPanel;
