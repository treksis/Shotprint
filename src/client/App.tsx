import { useEffect, useState, useCallback, useRef } from 'react';
import type { ExecutionMode, ViralTemplate, RemixProject } from '../shared/types';
import {
  fetchTemplates,
  fetchProjects,
  getInitialJudgeMode,
  setJudgeModeState,
  updateScene,
  regenerateKeyframe,
  renderSceneClip,
  renderAllProjectClips,
  verifyProjectFidelity,
  LiveModeRequiredError,
} from './lib/api';
import { useLiveGate } from './lib/useLiveGate';
import { Navbar } from './components/Navbar';
import { AppSidebar } from './components/app-sidebar';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { LandingPage } from './components/LandingPage';
import { TemplateVault } from './components/TemplateVault';
import { StudioWorkspace } from './components/studio/StudioWorkspace';
import { EmptyStudioForm } from './components/studio/EmptyStudioForm';
import { AgentSandboxWorkspace } from './components/studio/AgentSandboxWorkspace';
import { LiveAccessDialog } from './components/LiveAccessDialog';

function parseViewFromUrl(): 'landing' | 'vault' | 'studio' {
  if (typeof window === 'undefined') return 'landing';
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/studio' || pathname.startsWith('/studio/')) {
    return 'studio';
  }
  if (pathname === '/templates' || pathname === '/vault') {
    return 'vault';
  }
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'studio') return 'studio';
  if (view === 'vault' || view === 'templates') return 'vault';
  return 'landing';
}

function getPathForView(view: 'landing' | 'vault' | 'studio'): string {
  if (view === 'studio') return '/studio';
  if (view === 'vault') return '/templates';
  return '/';
}

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'vault' | 'studio'>(() =>
    parseViewFromUrl()
  );
  const [isJudgeMode, setIsJudgeMode] = useState<boolean>(() => getInitialJudgeMode());
  const [showLiveGate, setShowLiveGate] = useState<boolean>(false);
  const [dialogInitialMode, setDialogInitialMode] = useState<'demo' | 'live'>('demo');
  const [liveGateReason, setLiveGateReason] = useState<string | undefined>(undefined);
  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>(undefined);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const [templates, setTemplates] = useState<ViralTemplate[]>([]);
  const [projects, setProjects] = useState<RemixProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('api');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState<boolean>(false);
  const [studioVerifying, setStudioVerifying] = useState<boolean>(false);

  const navigateTo = useCallback((view: 'landing' | 'vault' | 'studio') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView(view);
      if (window.location.pathname !== targetPath || window.location.search !== '') {
        window.history.pushState({ view }, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView(currentView);
      if (window.location.search.includes('view=')) {
        window.history.replaceState({ view: currentView }, '', targetPath);
      }
    }
    const handlePopState = () => {
      setCurrentView(parseViewFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [loadedTemplates, loadedProjects] = await Promise.all([
        fetchTemplates(),
        fetchProjects(),
      ]);
      setTemplates(loadedTemplates);
      setProjects(loadedProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const openGate = useCallback((reason?: string, retry?: () => void) => {
    setLiveGateReason(reason);
    setDialogInitialMode('live');
    pendingActionRef.current = retry ?? null;
    setShowLiveGate(true);
  }, []);

  const guardLive = useLiveGate(isJudgeMode, openGate);

  /**
   * Clicking "Open studio" on the Landing Page navigates directly to /studio.
   * Only explicit "Enter judge passcode" opens the Live access dialog.
   */
  const handleOpenStudio = (projectId?: string, opts?: { openLiveGate?: boolean }) => {
    if (opts?.openLiveGate) {
      setPendingProjectId(projectId);
      setLiveGateReason(undefined);
      setDialogInitialMode('live');
      setShowLiveGate(true);
      return;
    }
    if (projectId) {
      setActiveProjectId(projectId);
    } else {
      setActiveProjectId(null);
    }
    navigateTo('studio');
  };

  const handleSelectDemo = () => {
    setIsJudgeMode(false);
    setJudgeModeState(false);
    if (pendingProjectId) {
      setActiveProjectId(pendingProjectId);
      setPendingProjectId(undefined);
    }
    setLiveGateReason(undefined);
    pendingActionRef.current = null;
    navigateTo('studio');
  };

  const handleExitLive = () => {
    setIsJudgeMode(false);
    setJudgeModeState(false);
  };

  const handleUnlocked = () => {
    setIsJudgeMode(true);
    if (pendingProjectId) {
      setActiveProjectId(pendingProjectId);
      setPendingProjectId(undefined);
    }
    if (currentView === 'landing') {
      navigateTo('studio');
    }
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    setLiveGateReason(undefined);
    if (pending) {
      pending();
    }
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    navigateTo('studio');
  };

  const handleProjectCreated = (newProject: RemixProject) => {
    setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
    setActiveProjectId(newProject.id);
    navigateTo('studio');
  };

  const handleTemplateCreated = (newTemplate: ViralTemplate) => {
    setTemplates((prev) => [newTemplate, ...prev.filter((t) => t.id !== newTemplate.id)]);
  };

  const handleProjectUpdated = (updatedProject: RemixProject) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) || null
    : null;

  const activeTemplate =
    (activeProject && templates.find((t) => t.id === activeProject.templateId)) ||
    templates[0] ||
    null;

  // Studio action handlers (prompt editing is open in demo; generation/rendering/audit require live)
  const handleUpdateScenePrompt = async (
    sceneIndex: number,
    imagePrompt: string,
    motionPrompt: string,
    scriptOverlay: string
  ) => {
    if (!activeProject) return;
    setStudioBusy(true);
    try {
      const updated = await updateScene(activeProject.id, sceneIndex, {
        adaptedImagePrompt: imagePrompt,
        adaptedMotionPrompt: motionPrompt,
        scriptOverlay,
      });
      handleProjectUpdated(updated);
    } finally {
      setStudioBusy(false);
    }
  };

  const runRegenerateKeyframe = async (sceneIndex: number, customPrompt?: string) => {
    if (!activeProject) return;
    setStudioBusy(true);
    try {
      const updated = await regenerateKeyframe(activeProject.id, sceneIndex, customPrompt);
      handleProjectUpdated(updated);
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        openGate('Generating new keyframes needs live mode.', () => {
          void runRegenerateKeyframe(sceneIndex, customPrompt);
        });
      }
    } finally {
      setStudioBusy(false);
    }
  };

  const runRenderSceneClip = async (sceneIndex: number) => {
    if (!activeProject) return;
    setStudioBusy(true);
    try {
      const updated = await renderSceneClip(activeProject.id, sceneIndex);
      handleProjectUpdated(updated);
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        openGate('Rendering new clips needs live mode.', () => {
          void runRenderSceneClip(sceneIndex);
        });
      }
    } finally {
      setStudioBusy(false);
    }
  };

  const runRenderAllClips = async () => {
    if (!activeProject) return;
    setStudioBusy(true);
    try {
      const updated = await renderAllProjectClips(activeProject.id);
      handleProjectUpdated(updated);
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        openGate('Rendering new clips needs live mode.', () => {
          void runRenderAllClips();
        });
      }
    } finally {
      setStudioBusy(false);
    }
  };

  const runVerifyFidelity = async () => {
    if (!activeProject) return;
    setStudioVerifying(true);
    try {
      const updated = await verifyProjectFidelity(activeProject.id);
      handleProjectUpdated(updated);
    } catch (err) {
      if (err instanceof LiveModeRequiredError) {
        openGate('Running a new fidelity check needs live mode.', () => {
          void runVerifyFidelity();
        });
      }
    } finally {
      setStudioVerifying(false);
    }
  };

  const guardedRegenerateKeyframe = guardLive(
    'Generating new keyframes needs live mode.',
    runRegenerateKeyframe
  );
  const guardedRenderSceneClip = guardLive(
    'Rendering new clips needs live mode.',
    runRenderSceneClip
  );
  const guardedRenderAllClips = guardLive(
    'Rendering new clips needs live mode.',
    runRenderAllClips
  );
  const guardedVerifyFidelity = guardLive(
    'Running a new fidelity check needs live mode.',
    runVerifyFidelity
  );

  return (
    <>
      {currentView === 'landing' ? (
        <div className="min-h-svh bg-[#ffffff] text-[#111111]">
          <LandingPage
            templates={templates}
            projects={projects}
            onEnterJudgeStudio={handleOpenStudio}
            onOpenVault={() => navigateTo('vault')}
          />
        </div>
      ) : (
        <SidebarProvider>
          <AppSidebar
            currentView={currentView}
            onNavigate={navigateTo}
            isJudgeMode={isJudgeMode}
            onRequestLive={() => openGate()}
            onExitLive={handleExitLive}
            projects={projects}
            activeProjectId={activeProject?.id}
            onSelectProjectId={(id) => setActiveProjectId(id)}
          />

          <SidebarInset>
            <Navbar
              currentView={currentView}
              onNavigate={navigateTo}
              onClearProject={() => setActiveProjectId(null)}
              isJudgeMode={isJudgeMode}
              onRequestLive={() => openGate()}
              onExitLive={handleExitLive}
              activeProjectName={activeProject?.productName}
              executionMode={executionMode}
              onChangeExecutionMode={setExecutionMode}
            />

            {/* Banner Below the Header for Demo / Meta Hackathon Review */}
            {!isJudgeMode ? (
              <div className="mx-4 mb-2 rounded-[8px] bg-[#111111] text-[#ffffff] px-4 py-2 text-[13px] sm:text-[14px] flex flex-wrap items-center justify-between gap-2">
                <span>
                  You&apos;re in demo mode. For Meta Hackathon review, please enter the judge passcode to enable live generation.
                </span>
                <button
                  type="button"
                  onClick={() => openGate()}
                  className="font-semibold text-[#ffffff] underline underline-offset-2 hover:opacity-85 cursor-pointer whitespace-nowrap"
                >
                  Go live →
                </button>
              </div>
            ) : (
              <div className="mx-4 mb-2 rounded-[8px] bg-[#dcfae5] text-[#04250e] px-4 py-2 text-[13px] sm:text-[14px] flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  Live mode enabled for Meta Hackathon review.
                </span>
                <button
                  type="button"
                  onClick={handleExitLive}
                  className="font-semibold text-[#04250e] underline underline-offset-2 hover:opacity-80 cursor-pointer whitespace-nowrap"
                >
                  Switch to demo
                </button>
              </div>
            )}

            {error && (
              <div className="mx-4 mb-2 rounded-[8px] bg-[#ffedea] px-4 py-2.5 text-[13px] text-[#831c1e] flex items-center justify-between">
                <span>Connection notice: {error}</span>
                <button
                  onClick={loadWorkspaceData}
                  className="px-3 py-1 rounded-[6px] bg-[#ffffff] text-[#831c1e] font-medium btn-tactile"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
            {loading && templates.length === 0 ? (
              <div className="flex-1 rounded-[16px] bg-[#ffffff] p-12 flex flex-col items-center justify-center gap-3">
                <p className="text-[15px] text-[#6b6b6b]">
                  Loading dissected templates and studio workspace…
                </p>
              </div>
            ) : currentView === 'vault' ? (
              <TemplateVault
                templates={templates}
                projects={projects}
                isJudgeMode={isJudgeMode}
                onRequireLive={openGate}
                onSelectProject={handleSelectProject}
                onProjectCreated={handleProjectCreated}
                onTemplateCreated={handleTemplateCreated}
              />
            ) : executionMode === 'agent' ? (
              <AgentSandboxWorkspace
                templates={templates}
                projects={projects}
                activeTemplate={activeTemplate}
                activeProject={activeProject}
                isJudgeMode={isJudgeMode}
                onSwitchToApiMode={() => setExecutionMode('api')}
                onTemplateUpdated={handleTemplateCreated}
                onProjectUpdated={handleProjectUpdated}
              />
            ) : activeTemplate && activeProject ? (
              <StudioWorkspace
                template={activeTemplate}
                templates={templates}
                project={activeProject}
                projects={projects}
                onSelectProject={(proj) => setActiveProjectId(proj.id)}
                onSelectProjectId={(id) => setActiveProjectId(id)}
                onTemplateCreated={handleTemplateCreated}
                onProjectCreated={handleProjectCreated}
                onBackToVault={() => navigateTo('vault')}
                onReturnToVault={() => navigateTo('vault')}
                onNewRemix={() => navigateTo('vault')}
                onCreateNewRemix={() => navigateTo('vault')}
                onUpdateScenePrompt={handleUpdateScenePrompt}
                onRegenerateKeyframe={async (idx, prompt) => {
                  await guardedRegenerateKeyframe(idx, prompt);
                }}
                onRenderSceneClip={async (idx) => {
                  await guardedRenderSceneClip(idx);
                }}
                onRenderAllClips={async () => {
                  await guardedRenderAllClips();
                }}
                onVerifyFidelity={async () => {
                  await guardedVerifyFidelity();
                }}
                onProjectUpdated={handleProjectUpdated}
                onUpdateProject={handleProjectUpdated}
                isJudgeMode={isJudgeMode}
                onRequestLive={(reason, retry) => openGate(reason, retry)}
                isBusy={studioBusy}
                isVerifying={studioVerifying}
              />
            ) : (
              <EmptyStudioForm
                templates={templates}
                projects={projects}
                isJudgeMode={isJudgeMode}
                onRequestLive={(reason, retry) => openGate(reason, retry)}
                onSelectProject={handleSelectProject}
                onTemplateCreated={handleTemplateCreated}
                onProjectCreated={handleProjectCreated}
                onOpenTemplates={() => navigateTo('vault')}
                onSwitchToAgentMode={() => setExecutionMode('agent')}
              />
            )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      )}

      <LiveAccessDialog
        isOpen={showLiveGate}
        initialMode={dialogInitialMode}
        reason={liveGateReason}
        onClose={() => {
          setShowLiveGate(false);
          setLiveGateReason(undefined);
          pendingActionRef.current = null;
        }}
        onSelectDemo={handleSelectDemo}
        onUnlocked={handleUnlocked}
      />
    </>
  );
}
