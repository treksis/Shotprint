import * as React from 'react';
import {
  Clapperboard,
  LayoutGrid,
  FolderKanban,
} from 'lucide-react';
import type { RemixProject } from '../../shared/types';
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
  currentView: 'landing' | 'vault' | 'studio';
  onNavigate: (view: 'landing' | 'vault' | 'studio') => void;
  isJudgeMode: boolean;
  onRequestLive: () => void;
  onExitLive: () => void;
  projects?: RemixProject[];
  activeProjectId?: string | null;
  onSelectProjectId?: (id: string | null) => void;
}

export function AppSidebar({
  currentView,
  onNavigate,
  isJudgeMode,
  onRequestLive,
  onExitLive,
  projects = [],
  activeProjectId,
  onSelectProjectId,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => {
                onSelectProjectId?.(null);
                onNavigate('studio');
              }}
              tooltip="MuseClone Studio"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-[6px] bg-[#1a4be0] text-[#ffffff] shrink-0">
                <Clapperboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-[14px] leading-tight">
                <span className="truncate font-semibold">MuseClone</span>
                <span className="truncate text-[13px] text-muted-foreground">
                  Video Studio
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Studio"
                  isActive={currentView === 'studio' && !activeProjectId}
                  onClick={() => {
                    onSelectProjectId?.(null);
                    onNavigate('studio');
                  }}
                >
                  <Clapperboard />
                  <span>Studio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Templates"
                  isActive={currentView === 'vault'}
                  onClick={() => onNavigate('vault')}
                >
                  <LayoutGrid />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projects.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Product ads</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.map((proj) => {
                  const isSelected =
                    currentView === 'studio' && activeProjectId === proj.id;
                  return (
                    <SidebarMenuItem key={proj.id}>
                      <SidebarMenuButton
                        isActive={isSelected}
                        onClick={() => {
                          onSelectProjectId?.(proj.id);
                          onNavigate('studio');
                        }}
                      >
                        <FolderKanban />
                        <span>{proj.productName}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onNavigate('landing')}
              tooltip="Back to home"
            >
              <span>Back to home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
export default AppSidebar;
