import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import type {
  CreateProjectRequest,
  DissectVideoRequest,
  RemixProject,
  ViralTemplate,
} from '../../shared/types';
import { createProject, dissectVideo, LiveModeRequiredError } from '../lib/api';

export interface TemplateVaultProps {
  templates: ViralTemplate[];
  projects: RemixProject[];
  isJudgeMode?: boolean;
  onRequireLive?: (reason: string, retry: () => void) => void;
  onSelectProject: (projectId: string) => void;
  onProjectCreated: (project: RemixProject) => void;
  onTemplateCreated: (template: ViralTemplate) => void;
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

export function TemplateVault({
  templates,
  projects,
  isJudgeMode = false,
  onRequireLive,
  onSelectProject,
  onProjectCreated,
  onTemplateCreated,
}: TemplateVaultProps) {
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);

  // Add Video Modal
  const [showDissectModal, setShowDissectModal] = useState(false);
  const [dissectTitle, setDissectTitle] = useState(SAMPLE_VIDEO_PRESETS[0].title);
  const [dissectUrl, setDissectUrl] = useState(SAMPLE_VIDEO_PRESETS[0].sourceVideoUrl);
  const [dissectPlatform, setDissectPlatform] =
    useState<ViralTemplate['sourcePlatform']>('TikTok');
  const [isDissecting, setIsDissecting] = useState(false);
  const [dissectError, setDissectError] = useState<string | null>(null);

  // Swap Product Modal
  const [cloneTargetTemplate, setCloneTargetTemplate] = useState<ViralTemplate | null>(null);
  const [productName, setProductName] = useState(SAMPLE_PRODUCT_PRESETS[0].productName);
  const [productBrief, setProductBrief] = useState(SAMPLE_PRODUCT_PRESETS[0].productBrief);
  const [productImageUrl, setProductImageUrl] = useState(
    SAMPLE_PRODUCT_PRESETS[0].productImageUrl
  );
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const executeDissect = async () => {
    if (!dissectTitle.trim() || !dissectUrl.trim()) return;
    setIsDissecting(true);
    setDissectError(null);
    try {
      const payload: DissectVideoRequest = {
        title: dissectTitle.trim(),
        sourceVideoUrl: dissectUrl.trim(),
        category: 'Product Ad',
        sourcePlatform: dissectPlatform,
      };
      const newTemplate = await dissectVideo(payload);
      onTemplateCreated(newTemplate);
      setShowDissectModal(false);
    } catch (err) {
      if (err instanceof LiveModeRequiredError && onRequireLive) {
        onRequireLive('Analyzing a new video link needs live mode.', () => {
          void executeDissect();
        });
      } else {
        setDissectError(err instanceof Error ? err.message : 'Failed to analyze video');
      }
    } finally {
      setIsDissecting(false);
    }
  };

  const handleRunDissect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJudgeMode && onRequireLive) {
      onRequireLive('Analyzing a new video link needs live mode.', () => {
        void executeDissect();
      });
      return;
    }
    await executeDissect();
  };

  const executeCloneProject = async () => {
    if (!cloneTargetTemplate || !productName.trim()) return;
    setIsCloning(true);
    setCloneError(null);
    try {
      const payload: CreateProjectRequest = {
        templateId: cloneTargetTemplate.id,
        productName: productName.trim(),
        productCategory: 'Product Ad',
        productBrief: productBrief.trim(),
        productImageUrl: productImageUrl.trim(),
      };
      const created = await createProject(payload);
      setCloneTargetTemplate(null);
      onProjectCreated(created);
    } catch (err) {
      if (err instanceof LiveModeRequiredError && onRequireLive) {
        onRequireLive('Creating a new product swap needs live mode.', () => {
          void executeCloneProject();
        });
      } else {
        setCloneError(err instanceof Error ? err.message : 'Failed to swap product');
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleRunCloneProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJudgeMode && onRequireLive) {
      onRequireLive('Creating a new product swap needs live mode.', () => {
        void executeCloneProject();
      });
      return;
    }
    await executeCloneProject();
  };

  return (
    <div className="w-full flex-1 bg-[#ffffff] text-[#111111] p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111111]">
            Video templates
          </h1>
          <p className="mt-1 text-[14px] text-[#6b6b6b]">
            Pick a ready-made template or paste a video link.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDissectError(null);
            setShowDissectModal(true);
          }}
          className="bg-[#111111] text-[#ffffff] h-9 px-4 rounded-[8px] text-[14px] font-medium btn-tactile cursor-pointer inline-flex items-center gap-1.5"
        >
          {!isJudgeMode && <Lock className="w-3.5 h-3.5" />}
          <span>Paste video link</span>
        </button>
      </div>

      {/* Ready Product Ads */}
      {projects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[18px] font-semibold text-[#111111]">
            Sample product ads
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-[#f4f4f2] rounded-[10px] p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      proj.productImageUrl ||
                      proj.scenes?.[0]?.keyframeUrl ||
                      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={proj.productName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-[6px] object-cover shrink-0 bg-[#e5e5e5]"
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111111] truncate">
                      {proj.productName}
                    </div>
                    <div className="text-[13px] text-[#6b6b6b] truncate">
                      {proj.scenes?.length || 4} cuts ready
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectProject(proj.id)}
                  className="shrink-0 h-8 px-3 rounded-[6px] bg-[#111111] text-[#ffffff] text-[13px] font-medium btn-tactile cursor-pointer"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Viral Video Templates Grid */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-semibold text-[#111111]">
          Viral reference videos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((tpl) => {
            const scenes = tpl.blueprint?.scenes ?? [];
            const isHovered = hoveredTemplateId === tpl.id;
            const matchingProj = projects.find((p) => p.templateId === tpl.id);

            return (
              <div
                key={tpl.id}
                onMouseEnter={() => setHoveredTemplateId(tpl.id)}
                onMouseLeave={() => setHoveredTemplateId(null)}
                className="bg-[#f4f4f2] rounded-[12px] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f4f4f2]">
                    {tpl.sourceVideoUrl && isHovered ? (
                      <video
                        src={tpl.sourceVideoUrl}
                        poster={tpl.thumbnailUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={
                          tpl.thumbnailUrl ||
                          'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={tpl.title}
                        width={640}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <div className="absolute top-3 left-3 bg-[#111111] text-[#ffffff] px-2.5 py-1 rounded-[4px] text-[12px] font-medium">
                      {tpl.sourcePlatform}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-[#111111] text-[#ffffff] px-2 py-1 rounded-[4px] text-[12px] tabular-nums">
                      {scenes.length} cuts · {tpl.durationSec}s
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="text-[17px] font-semibold text-[#111111]">
                      {tpl.title}
                    </h3>
                    <p className="text-[13px] text-[#6b6b6b] line-clamp-2">
                      {tpl.blueprint?.hookAnalysis?.first3SecMechanic}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex gap-2">
                  {matchingProj && (
                    <button
                      type="button"
                      onClick={() => onSelectProject(matchingProj.id)}
                      className="flex-1 h-9 px-3 rounded-[8px] bg-[#111111] text-[#ffffff] text-[13px] font-medium btn-tactile cursor-pointer"
                    >
                      Open in studio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCloneTargetTemplate(tpl);
                      setCloneError(null);
                    }}
                    className="flex-1 h-9 px-3 rounded-[8px] bg-[#f4f4f2] text-[#111111] text-[13px] font-medium btn-tactile cursor-pointer"
                  >
                    Swap product
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal 1: Paste Video Link */}
      {showDissectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDissecting) {
              setShowDissectModal(false);
            }
          }}
        >
          <div className="w-full max-w-[460px] rounded-[12px] bg-[#ffffff] border border-[#eaeaea] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111111]">
                Paste a video link
              </h3>
              <button
                type="button"
                onClick={() => !isDissecting && setShowDissectModal(false)}
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
                    setDissectTitle(preset.title);
                    setDissectUrl(preset.sourceVideoUrl);
                    setDissectPlatform(preset.sourcePlatform);
                  }}
                  className="px-3 py-1.5 rounded-[6px] bg-[#f4f4f2] text-[12px] font-medium text-[#111111] hover:bg-[#e5e5e5] cursor-pointer"
                >
                  Sample: {preset.title}
                </button>
              ))}
            </div>

            <form onSubmit={handleRunDissect} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Video title
                </label>
                <input
                  type="text"
                  value={dissectTitle}
                  onChange={(e) => setDissectTitle(e.target.value)}
                  required
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Video URL
                </label>
                <input
                  type="url"
                  value={dissectUrl}
                  onChange={(e) => setDissectUrl(e.target.value)}
                  required
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              {dissectError && (
                <p className="text-[13px] text-[#b91c1c]">{dissectError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDissecting}
                  onClick={() => setShowDissectModal(false)}
                  className="h-9 px-4 rounded-[8px] bg-[#f4f4f2] text-[#111111] text-[14px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDissecting}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-[#ffffff] text-[14px] font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {!isJudgeMode && <Lock className="w-3.5 h-3.5" />}
                  <span>{isDissecting ? 'Analyzing…' : 'Break down into cuts'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Swap Product */}
      {cloneTargetTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCloning) {
              setCloneTargetTemplate(null);
            }
          }}
        >
          <div className="w-full max-w-[460px] rounded-[12px] bg-[#ffffff] border border-[#eaeaea] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111111]">
                Swap in your product
              </h3>
              <button
                type="button"
                onClick={() => !isCloning && setCloneTargetTemplate(null)}
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
                    setProductName(preset.productName);
                    setProductBrief(preset.productBrief);
                    setProductImageUrl(preset.productImageUrl);
                  }}
                  className="px-3 py-1.5 rounded-[6px] bg-[#f4f4f2] text-[12px] font-medium text-[#111111] hover:bg-[#e5e5e5] cursor-pointer"
                >
                  Sample: {preset.productName}
                </button>
              ))}
            </div>

            <form onSubmit={handleRunCloneProject} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Product name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  Product photo URL
                </label>
                <input
                  type="url"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                  required
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-1">
                  One-line description
                </label>
                <input
                  type="text"
                  value={productBrief}
                  onChange={(e) => setProductBrief(e.target.value)}
                  required
                  className="w-full h-10 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] px-3 text-[14px] text-[#111111]"
                />
              </div>

              {cloneError && (
                <p className="text-[13px] text-[#b91c1c]">{cloneError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isCloning}
                  onClick={() => setCloneTargetTemplate(null)}
                  className="h-9 px-4 rounded-[8px] bg-[#f4f4f2] text-[#111111] text-[14px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-[#ffffff] text-[14px] font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {!isJudgeMode && <Lock className="w-3.5 h-3.5" />}
                  <span>{isCloning ? 'Creating…' : 'Swap in product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateVault;
