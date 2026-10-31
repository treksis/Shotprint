import React, { useState, useEffect } from 'react';
import {
  Clapperboard,
  RefreshCw,
  Loader2,
  Save,
  ArrowRight,
  Plus,
  Lock,
} from 'lucide-react';
import type {
  ViralTemplate,
  RemixProject,
  ProjectScene,
} from '../../../shared/types';

export interface StoryboardCenterPanelProps {
  template: ViralTemplate;
  project: RemixProject;
  projects?: RemixProject[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onSelectProject?: (project: RemixProject) => void;
  onOpenNewProduct?: () => void;
  onNextStep?: () => void;
  onUpdateScenePrompt: (
    sceneIndex: number,
    imagePrompt: string,
    motionPrompt: string,
    scriptOverlay: string
  ) => Promise<void>;
  onRegenerateKeyframe: (sceneIndex: number, customPrompt?: string) => Promise<void>;
  onRenderSceneClip: (sceneIndex: number) => Promise<void>;
  onRenderAllClips: () => Promise<void>;
  isJudgeMode?: boolean;
  isBusy: boolean;
}

interface SceneDraftState {
  imagePrompt: string;
  motionPrompt: string;
  scriptOverlay: string;
}

export const StoryboardCenterPanel: React.FC<StoryboardCenterPanelProps> = ({
  template,
  project,
  projects = [],
  activeSceneIndex,
  onSelectScene,
  onSelectProject,
  onOpenNewProduct,
  onNextStep,
  onUpdateScenePrompt,
  onRegenerateKeyframe,
  onRenderSceneClip,
  onRenderAllClips,
  isJudgeMode = false,
  isBusy,
}) => {
  const [drafts, setDrafts] = useState<Record<number, SceneDraftState>>({});
  const [busySceneAction, setBusySceneAction] = useState<Record<string, boolean>>({});
  const [renderingAll, setRenderingAll] = useState<boolean>(false);

  useEffect(() => {
    const nextDrafts: Record<number, SceneDraftState> = {};
    for (const s of project.scenes) {
      nextDrafts[s.sceneIndex] = {
        imagePrompt: s.adaptedImagePrompt,
        motionPrompt: s.adaptedMotionPrompt,
        scriptOverlay: s.scriptOverlay,
      };
    }
    setDrafts(nextDrafts);
  }, [project.id, project.scenes]);

  const activeScene: ProjectScene | undefined =
    project.scenes[activeSceneIndex] ?? project.scenes[0];

  const blueprintScene =
    template.blueprint?.scenes?.find((s) => s.sceneIndex === activeScene?.sceneIndex) ??
    template.blueprint?.scenes?.[activeSceneIndex];

  const updateDraftField = (
    sceneIndex: number,
    field: keyof SceneDraftState,
    value: string
  ) => {
    setDrafts((prev) => {
      const current = prev[sceneIndex] ?? {
        imagePrompt: '',
        motionPrompt: '',
        scriptOverlay: '',
      };
      return {
        ...prev,
        [sceneIndex]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const isSceneDirty = (scene: ProjectScene): boolean => {
    const draft = drafts[scene.sceneIndex];
    if (!draft) return false;
    return (
      draft.imagePrompt !== scene.adaptedImagePrompt ||
      draft.motionPrompt !== scene.adaptedMotionPrompt ||
      draft.scriptOverlay !== scene.scriptOverlay
    );
  };

  const handleSavePrompt = async (scene: ProjectScene) => {
    const draft = drafts[scene.sceneIndex];
    if (!draft) return;
    const key = `save-${scene.sceneIndex}`;
    setBusySceneAction((prev) => ({ ...prev, [key]: true }));
    try {
      await onUpdateScenePrompt(
        scene.sceneIndex,
        draft.imagePrompt,
        draft.motionPrompt,
        draft.scriptOverlay
      );
    } finally {
      setBusySceneAction((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRerollKeyframe = async (scene: ProjectScene) => {
    const draft = drafts[scene.sceneIndex];
    const customPrompt = draft?.imagePrompt || scene.adaptedImagePrompt;
    const key = `keyframe-${scene.sceneIndex}`;
    setBusySceneAction((prev) => ({ ...prev, [key]: true }));
    try {
      await onRegenerateKeyframe(scene.sceneIndex, customPrompt);
    } finally {
      setBusySceneAction((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRenderClip = async (scene: ProjectScene) => {
    const key = `render-${scene.sceneIndex}`;
    setBusySceneAction((prev) => ({ ...prev, [key]: true }));
    try {
      await onRenderSceneClip(scene.sceneIndex);
    } finally {
      setBusySceneAction((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRenderAll = async () => {
    setRenderingAll(true);
    try {
      await onRenderAllClips();
    } finally {
      setRenderingAll(false);
    }
  };

  if (!activeScene) return null;

  const draft = drafts[activeScene.sceneIndex] ?? {
    imagePrompt: activeScene.adaptedImagePrompt,
    motionPrompt: activeScene.adaptedMotionPrompt,
    scriptOverlay: activeScene.scriptOverlay,
  };
  const dirty = isSceneDirty(activeScene);
  const isSavingThis = !!busySceneAction[`save-${activeScene.sceneIndex}`];
  const isKeyframingThis =
    !!busySceneAction[`keyframe-${activeScene.sceneIndex}`] ||
    activeScene.status === 'keyframing';
  const isRenderingThis =
    !!busySceneAction[`render-${activeScene.sceneIndex}`] ||
    activeScene.status === 'rendering_video';

  return (
    <div className="p-6 space-y-6 bg-[#ffffff] text-[#111111]">
      {/* Top Bar: Active Product + Product Switcher + Next Step */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={project.productImageUrl}
            alt={project.productName}
            className="w-12 h-12 rounded-[8px] object-cover bg-[#f4f4f2] border border-[#e5e5e5] shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold text-[#111111] truncate">
              2. Swap in your product ({project.productName})
            </h1>
            <p className="text-[16px] text-[#6b6b6b] truncate">
              Select a cut below to preview and edit what appears on screen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {projects.length > 1 && onSelectProject && (
            <select
              value={project.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              aria-label="Switch sample product"
              className="h-9 px-3 rounded-[8px] bg-[#f4f4f2] border border-[#e5e5e5] text-[14px] font-medium text-[#111111] cursor-pointer focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName}
                </option>
              ))}
            </select>
          )}

          {onOpenNewProduct && (
            <button
              type="button"
              onClick={onOpenNewProduct}
              className="h-9 px-3.5 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[14px] font-medium text-[#111111] hover:bg-[#f4f4f2] inline-flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              {!isJudgeMode ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
              <span>Add new product</span>
            </button>
          )}

          {onNextStep && (
            <button
              type="button"
              onClick={onNextStep}
              className="h-9 px-4 rounded-[8px] bg-[#111111] text-[#ffffff] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <span>Next: Compare &amp; download</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Cut Selector Tabs (Focus on ONE cut at a time) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {project.scenes.map((scene, idx) => {
            const isSelected = idx === activeSceneIndex;
            return (
              <button
                key={scene.id || scene.sceneIndex}
                type="button"
                onClick={() => onSelectScene(idx)}
                className={`h-10 px-4 rounded-[8px] text-[14px] font-medium tabular-nums cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#111111] text-[#ffffff]'
                    : 'bg-[#f4f4f2] text-[#111111] hover:bg-[#e5e5e5]'
                }`}
              >
                Cut {scene.sceneIndex} ({scene.startTime}s–{scene.endTime}s)
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={isBusy || renderingAll}
          onClick={handleRenderAll}
          className="h-9 px-3.5 rounded-[8px] bg-[#f4f4f2] hover:bg-[#e5e5e5] text-[13px] font-medium text-[#111111] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 btn-tactile"
        >
          {!isJudgeMode ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Clapperboard className="w-3.5 h-3.5" />
          )}
          <span>{renderingAll ? 'Generating all cuts…' : 'Generate all 4 cuts'}</span>
        </button>
      </div>

      {/* Active Cut Editor: Left = Visuals, Right = Simple Text/Prompt Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Starting Photo + Video Clip for this Cut */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card A: Starting Photo */}
          <div className="rounded-[12px] bg-[#f4f4f2] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#111111]">
                Starting photo
              </span>
              <span className="text-[13px] text-[#6b6b6b]">
                Cut {activeScene.sceneIndex}
              </span>
            </div>

            <div className="relative aspect-[9/16] max-h-[300px] w-full rounded-[8px] overflow-hidden bg-[#111111] mx-auto">
              {activeScene.keyframeUrl ? (
                <img
                  src={activeScene.keyframeUrl}
                  alt={`Cut ${activeScene.sceneIndex} photo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[13px] text-[#ffffff]">
                  No photo yet
                </div>
              )}

              {isKeyframingThis && (
                <div className="absolute inset-0 bg-[#111111]/80 flex flex-col items-center justify-center gap-2 text-[#ffffff]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[13px]">Creating photo…</span>
                </div>
              )}

              {draft.scriptOverlay && (
                <div className="absolute bottom-2.5 inset-x-2.5 px-2.5 py-1 rounded-[4px] bg-[#111111]/85 text-center">
                  <span className="text-[13px] font-medium text-[#ffffff] block">
                    {draft.scriptOverlay}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isKeyframingThis || isBusy}
              onClick={() => handleRerollKeyframe(activeScene)}
              className="w-full h-9 px-3 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[13px] font-medium text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-tactile"
            >
              {!isJudgeMode ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <RefreshCw className={`w-3.5 h-3.5 ${isKeyframingThis ? 'animate-spin' : ''}`} />
              )}
              <span>Redo photo</span>
            </button>
          </div>

          {/* Card B: Animated Video Clip */}
          <div className="rounded-[12px] bg-[#f4f4f2] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#111111]">
                Video clip
              </span>
              <span className="text-[13px] text-[#6b6b6b] tabular-nums">
                {activeScene.duration}s
              </span>
            </div>

            <div className="relative aspect-[9/16] max-h-[300px] w-full rounded-[8px] overflow-hidden bg-[#111111] mx-auto flex items-center justify-center">
              {activeScene.videoClipUrl ? (
                <video
                  src={activeScene.videoClipUrl}
                  poster={activeScene.keyframeUrl}
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  {activeScene.keyframeUrl && (
                    <img
                      src={activeScene.keyframeUrl}
                      alt="Pending clip"
                      className="w-full h-full object-cover opacity-40"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#111111]/60">
                    <span className="text-[13px] font-medium text-[#ffffff]">
                      Ready to animate
                    </span>
                  </div>
                </div>
              )}

              {isRenderingThis && (
                <div className="absolute inset-0 bg-[#111111]/80 flex flex-col items-center justify-center gap-2 text-[#ffffff]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[13px]">Generating video…</span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isRenderingThis || isBusy}
              onClick={() => handleRenderClip(activeScene)}
              className="w-full h-9 px-3 rounded-[8px] bg-[#111111] text-[13px] font-medium text-[#ffffff] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-tactile"
            >
              {!isJudgeMode ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Clapperboard className="w-3.5 h-3.5" />
              )}
              <span>Generate clip</span>
            </button>
          </div>
        </div>

        {/* Right: Simple Text & Scene Editor for this Cut */}
        <div className="lg:col-span-6 rounded-[12px] bg-[#f4f4f2] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-[#111111]">
              Edit Cut {activeScene.sceneIndex} ({activeScene.shotType})
            </h3>
            {dirty && (
              <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-[4px] bg-[#fffbeb] text-[#92400e]">
                Unsaved
              </span>
            )}
          </div>

          {blueprintScene && (
            <div className="bg-[#ffffff] rounded-[8px] p-3 text-[13px] text-[#6b6b6b]">
              <strong className="text-[#111111]">Original shot:</strong>{' '}
              {blueprintScene.originalAction}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">
              On-screen text / what is said
            </label>
            <input
              type="text"
              value={draft.scriptOverlay}
              onChange={(e) =>
                updateDraftField(activeScene.sceneIndex, 'scriptOverlay', e.target.value)
              }
              className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] focus:border-[#1a4be0] focus:outline-none px-3 text-[14px] text-[#111111]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">
              How your product looks in this shot
            </label>
            <textarea
              rows={3}
              value={draft.imagePrompt}
              onChange={(e) =>
                updateDraftField(activeScene.sceneIndex, 'imagePrompt', e.target.value)
              }
              className="w-full rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] focus:border-[#1a4be0] focus:outline-none p-3 text-[14px] text-[#111111] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">
              Camera movement
            </label>
            <textarea
              rows={2}
              value={draft.motionPrompt}
              onChange={(e) =>
                updateDraftField(activeScene.sceneIndex, 'motionPrompt', e.target.value)
              }
              className="w-full rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] focus:border-[#1a4be0] focus:outline-none p-3 text-[14px] text-[#111111] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={isSavingThis || !dirty}
              onClick={() => handleSavePrompt(activeScene)}
              className={`h-9 px-4 rounded-[8px] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                dirty
                  ? 'bg-[#111111] text-[#ffffff]'
                  : 'bg-[#e5e5e5] text-[#6b6b6b] cursor-not-allowed'
              }`}
            >
              {isSavingThis ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardCenterPanel;
