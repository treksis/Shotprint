import type { Route } from '../App';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface NavbarProps {
  route: Route;
  onNavigate: (route: Route) => void;
  projectName?: string;
  isJudgeMode: boolean;
  onRequestLive: () => void;
  onExitLive: () => void;
}

export function Navbar({ route, onNavigate, projectName, isJudgeMode, onRequestLive, onExitLive }: NavbarProps) {
  const section = route.view === 'templates' ? 'Templates' : 'Studio';
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {route.view === 'project' ? (
                <BreadcrumbLink className="cursor-pointer" onClick={() => onNavigate({ view: 'home' })}>
                  {section}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{section}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {route.view === 'project' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[320px] truncate">{projectName ?? 'Project'}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {isJudgeMode ? (
        <button
          type="button"
          onClick={onExitLive}
          title="Switch back to demo mode"
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[6px] bg-[var(--pill-positive-bg)] px-2.5 text-[12px] font-medium text-[var(--pill-positive-ink)]"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--positive)]" />
          Live
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestLive}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[6px] bg-muted px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Demo · Go live
        </button>
      )}
    </header>
  );
}

export default Navbar;
