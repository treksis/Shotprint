import React, { useState, useRef, useEffect } from 'react';
import { Lock, Upload, ImageIcon } from 'lucide-react';
import type {
  ViralTemplate,
  RemixProject,
  DissectVideoRequest,
  CreateProjectRequest,
} from '../../../shared/types';
import {
  updateScene,
  regenerateKeyframe,
  renderSceneClip,
  renderAllProjectClips,
  verifyProjectFidelity,
  dissectVideo,
  createProject,
  uploadMediaAsset,
  LiveModeRequiredError,
} from '../../lib/api';
import { DissectionLeftPanel } from './DissectionLeftPanel';
import { StoryboardCenterPanel } from './StoryboardCenterPanel';
import { SyncedRightPanel } from './SyncedRightPanel';

export interface StudioWorkspaceProps {
  template: ViralTemplate;
  templates?: ViralTemplate[];
  project: RemixProject;
  projects?: RemixProject[];
  activeSceneIndex?: number;
  onSelectScene?: (index: number) => void;
  onSelectTemplate?: (template: ViralTemplate) => void;
  onSelectProject?: (project: RemixProject) => void;
  onSelectProjectId?: (projectId: string) => void;
  onBackToVault?: () => void;
  onReturnToVault?: () => void;
  onNewRemix?: (template: ViralTemplate) => void;
  onCreateNewRemix?: (template: ViralTemplate) => void;
  onOpenRemixModal?: (template: ViralTemplate) => void;
  onTemplateCreated?: (template: ViralTemplate) => void;
  onProjectCreated?: (project: RemixProject) => void;
  onUpdateScenePrompt?: (
    sceneIndex: number,
    imagePrompt: string,
    motionPrompt: string,
    scriptOverlay: string
  ) => Promise<void>;
  onRegenerateKeyframe?: (sceneIndex: number, customPrompt?: string) => Promise<void>;
  onRenderSceneClip?: (sceneIndex: number) => Promise<void>;
  onRenderAllClips?: () => Promise<void>;
  onVerifyFidelity?: () => Promise<void>;
  onProjectUpdated?: (project: RemixProject) => void;
  onUpdateProject?: (project: RemixProject) => void;
  isJudgeMode?: boolean;
  onRequestLive?: (reason?: string, retry?: () => void) => void;
  isBusy?: boolean;
  isVerifying?: boolean;
}

const SAMPLE_VIDEO_PRESETS = [
  {
    title: 'Cold Brew Ice Splash Reveal',
    sourceVideoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-pouring-a-cold-drink-with-ice-in-slow-motion-41819-large.mp4',
    category: 'Beverage',
    sourcePlatform: 'TikTok' as const,
  },
  {
    title: 'Smartwatch Macro Unbox',
    sourceVideoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-modern-smartwatch-42874-large.mp4',
    category: 'Tech',
    sourcePlatform: 'Instagram Reels' as const,
  },
];

const SAMPLE_PRODUCT_PRESETS = [
  {
    productName: 'NovaPods Wireless Earbuds',
    productCategory: 'Audio',
    productBrief: 'Matte black wireless earbuds with charging case.',
    productImageUrl:
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
  },
  {
    productName: 'Matcha Sparkling Cold Brew',
    productCategory: 'Beverage',
    productBrief: 'Green matcha cold brew can with condensation.',
    productImageUrl:
      'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800&auto=format&fit=crop&q=80',
  },
  {
    productName: 'Aether Titanium Watch',
    productCategory: 'Accessories',
    productBrief: 'Brushed titanium wristwatch on dark surface.',
    productImageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  },
];

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  template,
  templates = [],
  project,
  projects = [],
  activeSceneIndex: controlledSceneIndex,
  onSelectScene: controlledOnSelectScene,
  onSelectTemplate,
  onSelectProject,
  onSelectProjectId,
  onTemplateCreated,
  onProjectCreated,
  onUpdateScenePrompt,
  onRegenerateKeyframe,
  onRenderSceneClip,
  onRenderAllClips,
  onVerifyFidelity,
  onProjectUpdated,
  onUpdateProject,
  isJudgeMode = false,
  onRequestLive,
  isBusy: externalBusy = false,
  isVerifying: externalVerifying = false,
}) => {
  const [step, setStep] = useState<'dissect' | 'storyboard' | 'player'>('dissect');
  const [internalSceneIndex, setInternalSceneIndex] = useState<number>(0);
  const [localProject, setLocalProject] = useState<RemixProject>(project);
  const [internalBusy, setInternalBusy] = useState<boolean>(false);
  const [internalVerifying, setInternalVerifying] = useState<boolean>(false);

  // Add Video Modal
  const [showAddVideoModal, setShowAddVideoModal] = useState<boolean>(false);
  const [videoTitle, setVideoTitle] = useState<string>(SAMPLE_VIDEO_PRESETS[0].title);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEO_PRESETS[0].sourceVideoUrl);
  const [videoPlatform, setVideoPlatform] =
    useState<ViralTemplate['sourcePlatform']>('TikTok');
  const [analyzingVideo, setAnalyzingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [prodName, setProdName] = useState<string>(SAMPLE_PRODUCT_PRESETS[0].productName);
  const [prodBrief, setProdBrief] = useState<string>(SAMPLE_PRODUCT_PRESETS[0].productBrief);
  const [prodImageUrl, setProdImageUrl] = useState<string>(
    SAMPLE_PRODUCT_PRESETS[0].productImageUrl
  );
  const [creatingProduct, setCreatingProduct] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);

  const referenceVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  const activeSceneIndex =
    controlledSceneIndex !== undefined ? controlledSceneIndex : internalSceneIndex;

  const handleSelectScene = (index: number) => {
    setInternalSceneIndex(index);
    controlledOnSelectScene?.(index);
  };

  const notifyProjectChanged = (updated: RemixProject) => {
    setLocalProject(updated);
    onProjectUpdated?.(updated);
    onUpdateProject?.(updated);
  };

  const handleUpdateScenePrompt = async (
    sceneIndex: number,
    imagePrompt: string,
    motionPrompt: string,
    scriptOverlay: string
  ) => {
    if (onUpdateScenePrompt) {
      await onUpdateScenePrompt(sceneIndex, imagePrompt, motionPrompt, scriptOverlay);
      return;
    }
    setInternalBusy(true);
    try {
      const updated = await updateScene(localProject.id, sceneIndex, {
        adaptedImagePrompt: imagePrompt,
        adaptedMotionPrompt: motionPrompt,
        scriptOverlay,
      });
      notifyProjectChanged(updated);
    } finally {
      setInternalBusy(false);
    }
  };

  const handleRegenerateKeyframe = async (sceneIndex: number, customPrompt?: string) => {
    if (onRegenerateKeyframe) {
      await onRegenerateKeyframe(sceneIndex, customPrompt);
      return;
    }
    setInternalBusy(true);
    try {
      const updated = await regenerateKeyframe(localProject.id, sceneIndex, customPrompt);
      notifyProjectChanged(updated);
    } finally {
      setInternalBusy(false);
    }
  };

  const handleRenderSceneClip = async (sceneIndex: number) => {
    if (onRenderSceneClip) {
      await onRenderSceneClip(sceneIndex);
      return;
    }
    setInternalBusy(true);
    try {
      const updated = await renderSceneClip(localProject.id, sceneIndex);
      notifyProjectChanged(updated);
    } finally {
      setInternalBusy(false);
    }
  };

  const handleRenderAllClips = async () => {
    if (onRenderAllClips) {
      await onRenderAllClips();
      return;
    }
    setInternalBusy(true);
    try {
      const updated = await renderAllProjectClips(localProject.id);
      notifyProjectChanged(updated);
    } finally {
      setInternalBusy(false);
    }
  };

  const handleVerifyFidelity = async () => {
    if (onVerifyFidelity) {
      await onVerifyFidelity();
      return;
    }
    setInternalVerifying(true);
    try {
      const updated = await verifyProjectFidelity(localProject.id);
      notifyProjectChanged(updated);
    } finally {
      setInternalVerifying(false);
    }
  };

  const runAnalyzeVideo = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) return;
    setAnalyzingVideo(true);
    setVideoError(null);
    try {
      const payload: DissectVideoRequest = {
        title: videoTitle.trim(),
        sourceVideoUrl: videoUrl.trim(),
        category: 'Product Ad',
        sourcePlatform: videoPlatform,
      };
      const created = await dissectVideo(payload);
      onTemplateCreated?.(created);
      onSelectTemplate?.(created);
      setShowAddVideoModal(false);
    } catch (err) {
      if (err instanceof LiveModeRequiredError && onRequestLive) {
        onRequestLive('Analyzing a new video link needs live mode.', () => {
          void runAnalyzeVideo();
        });
      } else {
        setVideoError(err instanceof Error ? err.message : 'Could not analyze video');
      }
    } finally {
      setAnalyzingVideo(false);
    }
  };

  const handleAnalyzeVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJudgeMode && onRequestLive) {
      onRequestLive('Analyzing a new video link needs live mode.', () => {
        void runAnalyzeVideo();
      });
      return;
    }
    await runAnalyzeVideo();
  };

  const runCreateProductSwap = async () => {
    if (!prodName.trim()) return;
    setCreatingProduct(true);
    setProductError(null);
    try {
      const payload: CreateProjectRequest = {
        templateId: template.id,
        productName: prodName.trim(),
        productCategory: 'Product Ad',
        productBrief: prodBrief.trim(),
        productImageUrl: prodImageUrl.trim(),
      };
      const created = await createProject(payload);
      notifyProjectChanged(created);
      onProjectCreated?.(created);
      setShowAddProductModal(false);
    } catch (err) {
      if (err instanceof LiveModeRequiredError && onRequestLive) {
        onRequestLive('Creating a new product swap needs live mode.', () => {
          void runCreateProductSwap();
        });
      } else {
        setProductError(err instanceof Error ? err.message : 'Could not create product swap');
      }
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJudgeMode && onRequestLive) {
      onRequestLive('Creating a new product swap needs live mode.', () => {
        void runCreateProductSwap();
      });
      return;
    }
    await runCreateProductSwap();
  };

  const allProjects =
    projects.length > 0
      ? projects.some((p) => p.id === localProject.id)
        ? projects
        : [localProject, ...projects]
      : [localProject];

  return (
    <div className="w-full flex-1 bg-[#ffffff] text-[#111111] overflow-hidden">
      {/* Clean 3-Step Studio Navigation Bar */}
      <div className="px-6 py-3 bg-[#f9f9f8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('dissect')}
            className={`h-9 px-4 rounded-[8px] text-[14px] font-medium cursor-pointer transition-colors ${
              step === 'dissect'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#6b6b6b] border border-[#e5e5e5] hover:text-[#111111]'
            }`}
          >
            1. Source video &amp; cuts
          </button>

          <span className="text-[#6b6b6b] text-[14px]" aria-hidden="true">
            →
          </span>

          <button
            type="button"
            onClick={() => setStep('storyboard')}
            className={`h-9 px-4 rounded-[8px] text-[14px] font-medium cursor-pointer transition-colors ${
              step === 'storyboard'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#6b6b6b] border border-[#e5e5e5] hover:text-[#111111]'
            }`}
          >
            2. Swap product
          </button>

          <span className="text-[#6b6b6b] text-[14px]" aria-hidden="true">
            →
          </span>

          <button
            type="button"
            onClick={() => setStep('player')}
            className={`h-9 px-4 rounded-[8px] text-[14px] font-medium cursor-pointer transition-colors ${
              step === 'player'
                ? 'bg-[#111111] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#6b6b6b] border border-[#e5e5e5] hover:text-[#111111]'
            }`}
          >
            3. Compare &amp; download
          </button>
        </div>

        <div className="text-[13px] text-[#6b6b6b]">
          Active ad: <strong className="text-[#111111]">{localProject.productName}</strong>
        </div>
      </div>

      {/* Active Step Content (Only ONE step visible at a time) */}
      {step === 'dissect' && (
        <DissectionLeftPanel
          template={template}
          templates={templates}
          project={localProject}
          activeSceneIndex={activeSceneIndex}
          onSelectScene={handleSelectScene}
          onSelectTemplate={(tpl) => {
            onSelectTemplate?.(tpl);
            const matchingProj = allProjects.find((p) => p.templateId === tpl.id);
            if (matchingProj) {
              onSelectProjectId?.(matchingProj.id);
              onSelectProject?.(matchingProj);
            }
          }}
          onOpenAddVideo={() => {
            setVideoError(null);
            setShowAddVideoModal(true);
          }}
          onNextStep={() => setStep('storyboard')}
          isJudgeMode={isJudgeMode}
          videoRef={referenceVideoRef}
        />
      )}

      {step === 'storyboard' && (
        <StoryboardCenterPanel
          template={template}
          project={localProject}
          projects={allProjects}
          activeSceneIndex={activeSceneIndex}
          onSelectScene={handleSelectScene}
          onSelectProject={(proj) => {
            onSelectProjectId?.(proj.id);
            onSelectProject?.(proj);
          }}
          onOpenNewProduct={() => {
            setProductError(null);
            setShowAddProductModal(true);
          }}
          onNextStep={() => setStep('player')}
          onUpdateScenePrompt={handleUpdateScenePrompt}
          onRegenerateKeyframe={handleRegenerateKeyframe}
          onRenderSceneClip={handleRenderSceneClip}
          onRenderAllClips={handleRenderAllClips}
          isJudgeMode={isJudgeMode}
          isBusy={externalBusy || internalBusy}
        />
      )}

      {step === 'player' && (
        <SyncedRightPanel
          template={template}
          project={localProject}
          activeSceneIndex={activeSceneIndex}
          onSelectScene={handleSelectScene}
          onVerifyFidelity={handleVerifyFidelity}
          isJudgeMode={isJudgeMode}
          isVerifying={externalVerifying || internalVerifying}
        />
      )}

      {/* Modal 1: Upload / Drop Video File */}
      {showAddVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !analyzingVideo) {
              setShowAddVideoModal(false);
            }
          }}
        >
          <div className="w-full max-w-[460px] rounded-[12px] bg-[#ffffff] border border-[#eaeaea] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111111]">
                Upload a video
              </h3>
              <button
                type="button"
                onClick={() => !analyzingVideo && setShowAddVideoModal(false)}
                className="text-[13px] text-[#6b6b6b] hover:text-[#111111] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_VIDEO_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setVideoTitle(preset.title);
                    setVideoUrl(preset.sourceVideoUrl);
                    setVideoPlatform(preset.sourcePlatform);
                  }}
                  className="px-3 py-1.5 rounded-[6px] bg-[#f4f4f2] text-[12px] font-medium text-[#111111] hover:bg-[#e5e5e5] cursor-pointer"
                >
                  Sample: {preset.title}
                </button>
              ))}
            </div>

            <form onSubmit={handleAnalyzeVideoSubmit} className="space-y-3.5">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('video/')) {
                    const uploaded = await uploadMediaAsset(file);
                    setVideoUrl(uploaded.url);
                    setVideoTitle(
                      file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                    );
                  }
                }}
                className="block rounded-[10px] border-2 border-dashed border-[#d1d5db] bg-[#f9f9f8] hover:border-[#111111] p-5 text-center cursor-pointer"
              >
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const uploaded = await uploadMediaAsset(file);
                      setVideoUrl(uploaded.url);
                      setVideoTitle(
                        file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                      );
                    }
                  }}
                />
                <Upload className="w-5 h-5 mx-auto mb-1.5 text-[#111111]" />
                <div className="text-[14px] font-semibold text-[#111111]">
                  Drag and drop your video here, or click to browse
                </div>
                <div className="text-[13px] text-[#6b6b6b] mt-0.5">
                  MP4, MOV, or WebM
                </div>
              </label>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Video title
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              {videoError && (
                <p className="text-[13px] text-[#b91c1c]">{videoError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="h-9 px-4 rounded-[8px] bg-[#f4f4f2] text-[14px] font-medium text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analyzingVideo}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-[14px] font-medium text-[#ffffff] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {!isJudgeMode && <Lock className="w-3.5 h-3.5" />}
                  <span>{analyzingVideo ? 'Analyzing…' : 'Break down into cuts'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add New Product */}
      {showAddProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingProduct) {
              setShowAddProductModal(false);
            }
          }}
        >
          <div className="w-full max-w-[460px] rounded-[12px] bg-[#ffffff] border border-[#eaeaea] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111111]">
                Add your product
              </h3>
              <button
                type="button"
                onClick={() => !creatingProduct && setShowAddProductModal(false)}
                className="text-[13px] text-[#6b6b6b] hover:text-[#111111] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_PRODUCT_PRESETS.map((preset) => (
                <button
                  key={preset.productName}
                  type="button"
                  onClick={() => {
                    setProdName(preset.productName);
                    setProdBrief(preset.productBrief);
                    setProdImageUrl(preset.productImageUrl);
                  }}
                  className="px-3 py-1.5 rounded-[6px] bg-[#f4f4f2] text-[12px] font-medium text-[#111111] hover:bg-[#e5e5e5] cursor-pointer"
                >
                  Sample: {preset.productName}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3.5">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const uploaded = await uploadMediaAsset(file);
                    setProdImageUrl(uploaded.url);
                  }
                }}
                className="block rounded-[10px] border-2 border-dashed border-[#d1d5db] bg-[#f9f9f8] hover:border-[#111111] p-4 text-center cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const uploaded = await uploadMediaAsset(file);
                      setProdImageUrl(uploaded.url);
                    }
                  }}
                />
                <ImageIcon className="w-5 h-5 mx-auto mb-1 text-[#111111]" />
                <div className="text-[14px] font-semibold text-[#111111]">
                  Drop product photo here, or click to browse
                </div>
                <div className="text-[13px] text-[#6b6b6b]">
                  PNG, JPG, or WebP
                </div>
              </label>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Product name
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  One-line description
                </label>
                <input
                  type="text"
                  required
                  value={prodBrief}
                  onChange={(e) => setProdBrief(e.target.value)}
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              {productError && (
                <p className="text-[13px] text-[#b91c1c]">{productError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="h-9 px-4 rounded-[8px] bg-[#f4f4f2] text-[14px] font-medium text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-[14px] font-medium text-[#ffffff] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {!isJudgeMode && <Lock className="w-3.5 h-3.5" />}
                  <span>{creatingProduct ? 'Creating…' : 'Swap in product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioWorkspace;
