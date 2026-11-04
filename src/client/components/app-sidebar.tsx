import { ShotprintMark } from './ShotprintMark';
import * as React from 'react';
import { Hammer, Loader2, PenLine, Store } from 'lucide-react';
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
                <SidebarMenuButton tooltip="Make a template" isActive={route.view === 'build'} onClick={() => onNavigate({ view: 'build' })}>
                  <Hammer />
                  <span>Make a template</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Run a template" isActive={route.view === 'home'} onClick={() => onNavigate({ view: 'home' })}>
                  <PenLine />
                  <span>Run a template</span>
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
