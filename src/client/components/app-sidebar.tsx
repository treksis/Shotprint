import { ShotprintMark } from './ShotprintMark';
import * as React from 'react';
import { Loader2, PenLine, Store } from 'lucide-react';
import type { Route } from '../App';
import type { StudioProjectSummary } from '../../shared/studio';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  route: Route;
  onNavigate: (route: Route) => void;
  onTour?: () => void;
  projects: StudioProjectSummary[];
}

export function AppSidebar({ route, onNavigate, projects, onTour, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onNavigate({ view: 'templates' })} tooltip="Shotprint">
              <ShotprintMark className="size-8 shrink-0" />
              <div className="grid flex-1 text-left text-[14px] leading-tight">
                <span className="truncate font-semibold">Shotprint</span>
                <span className="truncate text-[13px] text-muted-foreground">Templates for AI agents</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Marketplace" isActive={route.view === 'templates'} onClick={() => onNavigate({ view: 'templates' })}>
                  <Store />
                  <span>Marketplace</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton data-tour="nav-studio" tooltip="Studio" isActive={route.view === 'home'} onClick={() => onNavigate({ view: 'home' })}>
                  <PenLine />
                  <span>Studio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projects.length > 0 && (
          <SidebarGroup data-tour="projects" className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton
                      isActive={route.view === 'project' && route.id === p.id}
                      onClick={() => onNavigate({ view: 'project', id: p.id })}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.status === 'running' && <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {onTour && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Take the tour" onClick={onTour}>
                <span>Take the tour</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton data-tour="nav-tech" tooltip="Technical details" isActive={route.view === 'technical'} onClick={() => onNavigate({ view: 'technical' })}>
              <span>Technical details</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onNavigate({ view: 'landing' })} tooltip="Back to the website">
              <span>Back to the website</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
export default AppSidebar;
