import * as React from 'react';
import { Clapperboard, LayoutGrid, Loader2, PenLine } from 'lucide-react';
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
  projects: StudioProjectSummary[];
}

export function AppSidebar({ route, onNavigate, projects, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onNavigate({ view: 'home' })} tooltip="MuseClone Studio">
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#1a4be0] text-[#ffffff]">
                <Clapperboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-[14px] leading-tight">
                <span className="truncate font-semibold">MuseClone</span>
                <span className="truncate text-[13px] text-muted-foreground">Agent video studio</span>
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
                <SidebarMenuButton tooltip="New project" isActive={route.view === 'home'} onClick={() => onNavigate({ view: 'home' })}>
                  <PenLine />
                  <span>New project</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Templates" isActive={route.view === 'templates'} onClick={() => onNavigate({ view: 'templates' })}>
                  <LayoutGrid />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projects.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
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
