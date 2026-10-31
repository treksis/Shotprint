import { useCallback, useEffect, useState } from 'react';
import type { RemixProject, ViralTemplate } from '../shared/types';
import type { StudioProjectSummary } from '../shared/studio';
import { fetchProjects, fetchTemplates, getInitialJudgeMode, setJudgeModeState } from './lib/api';
import { Navbar } from './components/Navbar';
import { AppSidebar } from './components/app-sidebar';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar';
import { LandingPage } from './components/LandingPage';
import { LiveAccessDialog } from './components/LiveAccessDialog';
import { AnnouncementBar } from './components/AnnouncementBar';
import { createProject, listProjects, listTemplates } from './features/studio/api';
import { seedProjects } from './features/studio/lib';
import { StudioHome } from './features/studio/components/studio-home';
import { StudioProjectPage } from './features/studio/components/studio-project';
import { TemplatesPage } from './features/studio/components/templates-page';

export type Route =
  | { view: 'landing' }
  | { view: 'home' }
  | { view: 'templates' }
  | { view: 'project'; id: string };

function parseRoute(): Route {
  if (typeof window === 'undefined') return { view: 'landing' };
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/studio\/([\w-]+)$/);
  if (m) return { view: 'project', id: m[1] };
  if (path === '/studio') return { view: 'home' };
  if (path === '/templates') return { view: 'templates' };
  return { view: 'landing' };
}

export const pathFor = (r: Route) =>
  r.view === 'project' ? `/studio/${r.id}` : r.view === 'home' ? '/studio' : r.view === 'templates' ? '/templates' : '/';

const SEEDED_KEY = 'museclone.studio.seeded';

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [isJudgeMode, setIsJudgeMode] = useState<boolean>(() => getInitialJudgeMode());
  const [showLiveGate, setShowLiveGate] = useState(false);
  const [liveGateReason, setLiveGateReason] = useState<string | undefined>(undefined);
  const [studioProjects, setStudioProjects] = useState<StudioProjectSummary[]>([]);
  // The landing page still shows the original pipeline's sample data.
  const [landingTemplates, setLandingTemplates] = useState<ViralTemplate[]>([]);
  const [landingProjects, setLandingProjects] = useState<RemixProject[]>([]);

  const navigate = useCallback((next: Route) => {
    setRoute(next);
    const target = pathFor(next);
    if (window.location.pathname !== target) window.history.pushState({}, '', target);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshProjects = useCallback(() => {
    listProjects()
      .then(async (ps) => {
        // First visit: seed sample projects so the workspace isn't empty for a reviewer.
        if (ps.length === 0 && !localStorage.getItem(SEEDED_KEY)) {
          localStorage.setItem(SEEDED_KEY, '1');
          const seeds = await seedProjects(await listTemplates());
          for (const s of seeds) await createProject(s);
          ps = await listProjects();
        }
        setStudioProjects(ps);
      })
      .catch(() => setStudioProjects([]));
  }, []);

  useEffect(() => {
    if (route.view !== 'landing') refreshProjects();
  }, [route, refreshProjects]);

  useEffect(() => {
    if (route.view !== 'landing') return;
    Promise.all([fetchTemplates(), fetchProjects()])
      .then(([t, p]) => {
        setLandingTemplates(t);
        setLandingProjects(p);
      })
      .catch(() => undefined);
  }, [route.view]);

  const openGate = useCallback((reason?: string) => {
    setLiveGateReason(reason);
    setShowLiveGate(true);
  }, []);

  const exitLive = () => {
    setIsJudgeMode(false);
    setJudgeModeState(false);
  };

  const activeProject = route.view === 'project' ? studioProjects.find((p) => p.id === route.id) : undefined;

  return (
    <>
      {route.view === 'landing' ? (
        <div className="min-h-svh bg-[#ffffff] text-[#111111]">
          <LandingPage
            templates={landingTemplates}
            projects={landingProjects}
            onEnterJudgeStudio={() => navigate({ view: 'home' })}
            onOpenVault={() => navigate({ view: 'templates' })}
          />
        </div>
      ) : (
        <>
        <AnnouncementBar isLive={isJudgeMode} onGoLive={() => openGate()} onExitLive={exitLive} />
        <SidebarProvider>
          <AppSidebar route={route} onNavigate={navigate} projects={studioProjects} />
          <SidebarInset className="h-[calc(100svh-var(--top-offset,0px))] min-h-0 overflow-hidden lg:h-[calc(100svh-var(--top-offset,0px)-1rem)]">
            <Navbar
              route={route}
              onNavigate={navigate}
              projectName={activeProject?.name}
              isJudgeMode={isJudgeMode}
              onRequestLive={() => openGate()}
              onExitLive={exitLive}
            />
            {route.view === 'home' && (
              <StudioHome
                projects={studioProjects}
                isLive={isJudgeMode}
                onOpenProject={(id) => navigate({ view: 'project', id })}
                onProjectsChanged={refreshProjects}
              />
            )}
            {route.view === 'templates' && (
              <TemplatesPage
                onUseTemplate={(templateId) => {
                  sessionStorage.setItem('studio.template', templateId);
                  navigate({ view: 'home' });
                }}
              />
            )}
            {route.view === 'project' && (
              <StudioProjectPage
                key={route.id}
                projectId={route.id}
                isLive={isJudgeMode}
                onRequestLive={openGate}
                onProjectsChanged={refreshProjects}
                onMissing={() => navigate({ view: 'home' })}
              />
            )}
          </SidebarInset>
        </SidebarProvider>
        </>
      )}

      <LiveAccessDialog
        isOpen={showLiveGate}
        initialMode="live"
        reason={liveGateReason}
        onClose={() => {
          setShowLiveGate(false);
          setLiveGateReason(undefined);
        }}
        onSelectDemo={() => {
          setShowLiveGate(false);
          exitLive();
        }}
        onUnlocked={() => {
          setShowLiveGate(false);
          setIsJudgeMode(true);
          if (route.view === 'landing') navigate({ view: 'home' });
        }}
      />
    </>
  );
}
