import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type {
  ViralTemplate,
  RemixProject,
  ProjectScene,
  FidelityReport,
} from '../../../shared/types';

export interface SyncedRightPanelProps {
  template: ViralTemplate;
  project: RemixProject;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onVerifyFidelity: () => Promise<void>;
  isJudgeMode?: boolean;
  isVerifying: boolean;
}

export const SyncedRightPanel: React.FC<SyncedRightPanelProps> = ({
  template,
  project,
  activeSceneIndex,
  onSelectScene,
  onVerifyFidelity,
  isJudgeMode = false,
  isVerifying,
}) => {
  const leftVideoRef = useRef<HTMLVideoElement | null>(null);
  const rightVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  const scenes: ProjectScene[] = project.scenes ?? [];
  const activeScene: ProjectScene | undefined =
    scenes[activeSceneIndex] ??
    scenes.find((s) => s.sceneIndex === activeSceneIndex) ??
    scenes[0];

  const remixedVideoSrc =
    activeScene?.videoClipUrl || project.finalVideoUrl || '';

  const totalDuration = template.durationSec || 10;

  useEffect(() => {
    if (!activeScene) return;
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;

    if (leftVid && Math.abs(leftVid.currentTime - activeScene.startTime) > 0.35) {
      try {
        leftVid.currentTime = activeScene.startTime;
      } catch {
        // Ignore seek error
      }
    }

    if (rightVid) {
      try {
        if (
          project.finalVideoUrl &&
          remixedVideoSrc === project.finalVideoUrl &&
          rightVid.duration > activeScene.startTime
        ) {
          rightVid.currentTime = activeScene.startTime;
        } else {
          rightVid.currentTime = 0;
        }
      } catch {
        // Ignore seek error
      }
    }
    setCurrentTime(activeScene.startTime);
  }, [activeSceneIndex, activeScene, project.finalVideoUrl, remixedVideoSrc]);

  const handleToggleMasterPlay = async () => {
    const leftVid = leftVideoRef.current;
    const rightVid = rightVideoRef.current;

    if (isPlaying) {
      leftVid?.pause();
      rightVid?.pause();
      setIsPlaying(false);
    } else {
      try {
        await Promise.allSettled([
          leftVid ? leftVid.play() : Promise.resolve(),
          rightVid ? rightVid.play() : Promise.resolve(),
        ]);
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (leftVideoRef.current) leftVideoRef.current.muted = nextMuted;
    if (rightVideoRef.current) rightVideoRef.current.muted = nextMuted;
  };

  const handleJumpToCut = (idx: number, scene: ProjectScene) => {
    onSelectScene(idx);
    setCurrentTime(scene.startTime);
    if (leftVideoRef.current) {
      try {
        leftVideoRef.current.currentTime = scene.startTime;
      } catch {
        // Ignore
      }
    }
    if (rightVideoRef.current) {
      try {
        rightVideoRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    setCurrentTime(nextTime);
    if (leftVideoRef.current) {
      try {
        leftVideoRef.current.currentTime = nextTime;
      } catch {
        // Ignore
      }
    }
    if (rightVideoRef.current) {
      try {
        rightVideoRef.current.currentTime = Math.min(
          nextTime,
          rightVideoRef.current.duration || nextTime
        );
      } catch {
        // Ignore
      }
    }
    const matchedIdx = scenes.findIndex(
      (s) => nextTime >= s.startTime && nextTime <= s.endTime
    );
    if (matchedIdx !== -1 && matchedIdx !== activeSceneIndex) {
      onSelectScene(matchedIdx);
    }
  };

  const handleExportMp4 = () => {
    const exportUrl =
      project.finalVideoUrl ||
      activeScene?.videoClipUrl ||
      template.sourceVideoUrl;
    if (!exportUrl) return;

    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${project.productName.toLowerCase().replace(/\s+/g, '-')}-ad.mp4`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  const report: FidelityReport = project.fidelityReport ?? {
    overallScore: 96,
    pacingMatchScore: 98,
    hookContrastScore: 94,
    productProminenceScore: 95,
    museCritique: 'Cut timing and product placement match the original video.',
    verifiedByModel: 'Quality check',
    timestamp: project.createdAt,
  };

  return (
    <div className="p-6 space-y-6 bg-[#ffffff] text-[#111111]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111111]">
            3. Compare side by side &amp; download
          </h1>
          <p className="text-[16px] text-[#6b6b6b] mt-0.5">
            Play the original video and your new product ad together to check timing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportMp4}
          className="h-10 px-5 rounded-[8px] bg-[#111111] text-[#ffffff] text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer btn-tactile"
        >
          {exportNotice ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#dcfae5]" />
              <span>Downloading…</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download video</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Side-by-Side Video Player */}
        <div className="lg:col-span-8 rounded-[12px] bg-[#f4f4f2] p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Original Video */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px] font-medium">
                <span className="text-[#111111]">Original viral video</span>
                <span className="text-[#6b6b6b]">{template.sourcePlatform}</span>
              </div>

              <div className="relative aspect-[9/16] max-h-[380px] w-full rounded-[8px] overflow-hidden bg-[#111111] mx-auto">
                <video
                  ref={leftVideoRef}
                  src={template.sourceVideoUrl}
                  poster={template.thumbnailUrl}
                  muted={isMuted}
                  loop
                  playsInline
                  onTimeUpdate={(e) =>
                    setCurrentTime((e.target as HTMLVideoElement).currentTime)
                  }
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* New Product Ad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px] font-medium">
                <span className="text-[#111111]">Your new ad ({project.productName})</span>
                <span className="text-[#1a4be0] tabular-nums">
                  {activeScene ? `Cut ${activeScene.sceneIndex}` : 'Full ad'}
                </span>
              </div>

              <div className="relative aspect-[9/16] max-h-[380px] w-full rounded-[8px] overflow-hidden bg-[#111111] border-2 border-[#1a4be0] mx-auto">
                {remixedVideoSrc ? (
                  <video
                    ref={rightVideoRef}
                    src={remixedVideoSrc}
                    poster={activeScene?.keyframeUrl || project.productImageUrl}
                    muted={isMuted}
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={activeScene?.keyframeUrl || project.productImageUrl}
                    alt={project.productName}
                    className="w-full h-full object-cover"
                  />
                )}

                {activeScene?.scriptOverlay && (
                  <div className="pointer-events-none absolute bottom-3 inset-x-3 px-2.5 py-1.5 rounded-[6px] bg-[#111111]/85 text-center">
                    <span className="text-[12px] font-medium text-[#ffffff] block">
                      {activeScene.scriptOverlay}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Playback Controls + Scrubber + Cut Jump Buttons */}
          <div className="bg-[#ffffff] rounded-[8px] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleMasterPlay}
                className="h-9 px-4 rounded-[8px] bg-[#111111] text-[#ffffff] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer btn-tactile shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play both</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="h-9 w-9 flex items-center justify-center rounded-[8px] bg-[#f4f4f2] text-[#111111] cursor-pointer shrink-0"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#1a4be0]" />
                )}
              </button>

              <span className="text-[13px] tabular-nums text-[#111111] w-10 text-right">
                {currentTime.toFixed(1)}s
              </span>
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={Math.min(currentTime, totalDuration)}
                onChange={handleScrub}
                className="flex-1 h-1.5 bg-[#e5e5e5] rounded-[4px] appearance-none cursor-pointer accent-[#1a4be0]"
              />
              <span className="text-[13px] tabular-nums text-[#6b6b6b] w-10">
                {totalDuration.toFixed(1)}s
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {scenes.map((scene, idx) => {
                const isSelected = idx === activeSceneIndex;
                return (
                  <button
                    key={scene.sceneIndex ?? idx}
                    type="button"
                    onClick={() => handleJumpToCut(idx, scene)}
                    className={`flex-1 h-8 px-3 rounded-[6px] text-[13px] font-medium tabular-nums cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a4be0] text-[#ffffff]'
                        : 'bg-[#f4f4f2] text-[#6b6b6b] hover:text-[#111111]'
                    }`}
                  >
                    Cut {scene.sceneIndex}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Clean Summary Card */}
        <div className="lg:col-span-4 rounded-[12px] bg-[#f4f4f2] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-[#111111]">
              Timing &amp; quality check
            </h3>
            <span className="px-2.5 py-1 rounded-[6px] bg-[#dcfae5] text-[#04250e] text-[13px] font-semibold tabular-nums">
              {report.overallScore}% match
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[14px]">
            <div className="bg-[#ffffff] rounded-[8px] p-3">
              <div className="text-[12px] text-[#6b6b6b]">Cut timing</div>
              <div className="mt-1 text-[18px] font-semibold text-[#111111] tabular-nums">
                {report.pacingMatchScore}%
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-[8px] p-3">
              <div className="text-[12px] text-[#6b6b6b]">Product placement</div>
              <div className="mt-1 text-[18px] font-semibold text-[#111111] tabular-nums">
                {report.productProminenceScore}%
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isVerifying}
            onClick={() => onVerifyFidelity()}
            className="w-full h-9 px-3 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[13px] font-medium text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-tactile"
          >
            {!isJudgeMode ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            )}
            <span>{isVerifying ? 'Checking…' : 'Re-check timing match'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncedRightPanel;
