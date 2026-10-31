import React from 'react';
import type { ExecutionMode } from '../../shared/types';
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
import { Badge } from '@/components/ui/badge';

export interface NavbarProps {
  currentView: 'landing' | 'vault' | 'studio';
  onNavigate: (view: 'landing' | 'vault' | 'studio') => void;
  onClearProject?: () => void;
  isJudgeMode: boolean;
  onRequestLive: () => void;
  onExitLive: () => void;
  activeProjectName?: string;
  executionMode?: ExecutionMode;
  onChangeExecutionMode?: (mode: ExecutionMode) => void;
}

export function Navbar({
  currentView,
  onNavigate,
  onClearProject,
  isJudgeMode,
  onRequestLive,
  onExitLive,
  activeProjectName,
  executionMode = 'api',
  onChangeExecutionMode,
}: NavbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => {
                  if (currentView === 'studio') {
                    onClearProject?.();
                  }
                  onNavigate(currentView);
                }}
              >
                {currentView === 'studio' ? 'Studio' : 'Templates'}
              </BreadcrumbLink>
            </BreadcrumbItem>

            {activeProjectName && currentView === 'studio' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-[240px]">
                    {activeProjectName}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {currentView === 'studio' && onChangeExecutionMode && (
          <div
            role="group"
            aria-label="Execution mode"
            className="inline-flex items-center rounded-[8px] bg-[#f4f4f2] p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeExecutionMode('api')}
              className={`h-7 px-2.5 rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors ${
                executionMode === 'api'
                  ? 'bg-[#111111] text-[#ffffff]'
                  : 'text-[#6b6b6b] hover:text-[#111111]'
              }`}
            >
              1) API-based
            </button>
            <button
              type="button"
              onClick={() => onChangeExecutionMode('agent')}
              className={`h-7 px-2.5 rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors ${
                executionMode === 'agent'
                  ? 'bg-[#111111] text-[#ffffff]'
                  : 'text-[#6b6b6b] hover:text-[#111111]'
              }`}
            >
              2) Agent-based
            </button>
          </div>
        )}

        {isJudgeMode ? (
          <button
            type="button"
            onClick={onExitLive}
            title="Click to switch back to Demo"
            className="cursor-pointer"
          >
            <Badge variant="success">Live</Badge>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestLive}
            title="Click to enter Live mode"
            className="cursor-pointer"
          >
            <Badge variant="secondary">Demo</Badge>
          </button>
        )}
      </div>
    </header>
  );
}

export default Navbar;
