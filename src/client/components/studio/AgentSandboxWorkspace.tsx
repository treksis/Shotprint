import React, { useState, useEffect, useRef } from 'react';
import { Check, Copy, Terminal, FileJson, FileCode, Send, Upload } from 'lucide-react';
import type {
  AgentToolAction,
  RemixProject,
  SandboxWorkspaceSnapshot,
  ViralTemplate,
} from '../../../shared/types';
import {
  fetchSandboxSession,
  runAgentChatTurn,
  uploadMediaAsset,
} from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface AgentSandboxWorkspaceProps {
  templates: ViralTemplate[];
  projects: RemixProject[];
  activeTemplate: ViralTemplate | null;
  activeProject: RemixProject | null;
  isJudgeMode: boolean;
  onSwitchToApiMode: () => void;
  onTemplateUpdated?: (template: ViralTemplate) => void;
  onProjectUpdated?: (project: RemixProject) => void;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'agent';
  text: string;
  model?: string;
  actions?: AgentToolAction[];
}

const QUICK_AGENT_PROMPTS = [
  'Tighten Cut 1 to 1.8s with a fast macro push-in zoom',
  'Update Cut 2 camera movement to a 180-degree orbital sweep',
  'Rewrite Cut 3 motion prompt for high-contrast studio rim lighting',
  'Rebuild render_ffmpeg.sh with 30fps 9:16 H.264 concat pipeline',
];

export const AgentSandboxWorkspace: React.FC<AgentSandboxWorkspaceProps> = ({
  templates,
  activeTemplate,
  activeProject,
  onSwitchToApiMode,
  onTemplateUpdated,
  onProjectUpdated,
}) => {
  const targetTemplate = activeTemplate || templates[0] || null;
  const sessionId = activeProject?.id || targetTemplate?.id || 'studio-session';

  const [sandbox, setSandbox] = useState<SandboxWorkspaceSnapshot | null>(null);
  const [loadingSandbox, setLoadingSandbox] = useState<boolean>(true);
  const [activeFileTab, setActiveFileTab] = useState<'hyperframe' | 'ffmpeg' | 'runtime'>('hyperframe');
  const [promptInput, setPromptInput] = useState<string>('');
  const [runningTurn, setRunningTurn] = useState<boolean>(false);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('');

  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome-turn',
      role: 'agent',
      model: 'muse-spark-1.3-contributor',
      text: `Connected to isolated MicroVM workspace (/workspace) for "${
        activeProject?.productName || targetTemplate?.title || 'Studio Session'
      }". Ask me to edit scene cuts in hyperframe.json or customize the FFmpeg assembly script in render_ffmpeg.sh.`,
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSandbox(true);
    fetchSandboxSession(sessionId)
      .then((snap) => {
        if (!cancelled) {
          setSandbox(snap);
        }
      })
      .catch(() => {
        // Ignore initial load error
      })
      .finally(() => {
        if (!cancelled) setLoadingSandbox(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendPrompt = async (textToRun: string) => {
    const trimmed = textToRun.trim();
    if (!trimmed || runningTurn) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setTurns((prev) => [...prev, userTurn]);
    setPromptInput('');
    setRunningTurn(true);

    try {
      const response = await runAgentChatTurn({
        sessionId,
        prompt: trimmed,
        templateId: targetTemplate?.id,
        projectId: activeProject?.id,
        videoTitle: uploadedVideoName || activeProject?.productName || targetTemplate?.title,
      });

      setSandbox(response.sandbox);
      if (response.updatedTemplate) {
        onTemplateUpdated?.(response.updatedTemplate);
      }
      if (response.updatedProject) {
        onProjectUpdated?.(response.updatedProject);
      }

      setTurns((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: 'agent',
          text: response.reply,
          model: response.model,
          actions: response.actions,
        },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'agent',
          text: err instanceof Error ? err.message : 'Agent execution failed.',
        },
      ]);
    } finally {
      setRunningTurn(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(promptInput);
  };

  const handleVideoDrop = async (file: File) => {
    if (!file.type.startsWith('video/')) return;
    const uploaded = await uploadMediaAsset(file);
    setUploadedVideoName(file.name);
    await sendPrompt(
      `Dissect uploaded video "${file.name}" (${uploaded.url}) into 4 vertical 9:16 cuts in /workspace/hyperframe.json and generate /workspace/render_ffmpeg.sh.`
    );
  };

  const formattedHyperframe = JSON.stringify(
    sandbox?.hyperframeJson || {
      sessionId,
      status: loadingSandbox ? 'loading' : 'ready',
    },
    null,
    2
  );

  const renderScriptText =
    sandbox?.renderScript ||
    '#!/usr/bin/env sh\n# Waiting for hyperframe.json synchronization...\n';

  const handleCopyActiveFile = async () => {
    const content =
      activeFileTab === 'hyperframe' ? formattedHyperframe : renderScriptText;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <section className="w-full max-w-[1160px] mx-auto px-6 py-5 space-y-5">
      {/* Header Bar Explaining Agent-Based MicroVM Mode */}
      <div className="rounded-[10px] bg-[#f6f6f4] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="default">2) Agent-based (MicroVM)</Badge>
          <span className="text-[13px] text-[#111111] font-medium">
            Session: <code className="font-mono">{sessionId}</code>
          </span>
          <span className="text-[13px] text-[#6b6b6b]">
            · Canonical state in <code className="font-mono">/workspace/hyperframe.json</code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleVideoDrop(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            <span>Drop video into /workspace</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSwitchToApiMode}
          >
            Switch to 1) API-based
          </Button>
        </div>
      </div>

      {/* 2-Column ChatGPT / Cowork Split Layout: Left = Agent Chat, Right = Live MicroVM Files */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Agent Conversation & Sandbox Tool Execution */}
        <div className="lg:col-span-6 rounded-[12px] bg-[#f6f6f4] p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#111111]">
                Agent chat &amp; tool loop
              </h2>
              <p className="text-[13px] text-[#6b6b6b]">
                Model: <code className="font-mono text-[#111111]">muse-spark-1.3-contributor</code>
              </p>
            </div>
            <Badge variant="secondary">Outbound internet: off</Badge>
          </div>

          {/* Conversation History */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-[8px] p-3.5 text-[14px] space-y-2.5 ${
                  turn.role === 'user'
                    ? 'bg-[#111111] text-[#ffffff] ml-6'
                    : 'bg-[#ffffff] text-[#111111]'
                }`}
              >
                <div className="flex items-center justify-between text-[12px] opacity-75">
                  <span className="font-semibold">
                    {turn.role === 'user' ? 'You' : 'Muse Sandbox Agent'}
                  </span>
                  {turn.model && <code>{turn.model}</code>}
                </div>
                <p className="leading-[1.5]">{turn.text}</p>

                {turn.actions && turn.actions.length > 0 && (
                  <div className="rounded-[6px] bg-[#f6f6f4] p-2.5 space-y-1.5 text-[#111111]">
                    <div className="text-[12px] font-semibold text-[#6b6b6b]">
                      Executed in MicroVM (/workspace):
                    </div>
                    {turn.actions.map((act) => (
                      <div key={act.id} className="text-[12px] space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[#111111]">
                          <Check className="size-3.5 text-[#247b50] shrink-0" />
                          <code>{act.command}</code>
                        </div>
                        <div className="pl-5 text-[#6b6b6b]">{act.output}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="space-y-1.5">
            <div className="text-[12px] font-medium text-[#6b6b6b]">
              Quick instructions:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AGENT_PROMPTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={runningTurn}
                  onClick={() => void sendPrompt(chip)}
                  className="px-2.5 py-1 rounded-[6px] bg-[#ffffff] text-[12px] font-medium text-[#111111] hover:bg-[#e9e9e7] cursor-pointer text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Bar */}
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 pt-1">
            <Input
              type="text"
              placeholder="Ask the agent to edit hyperframe.json or render_ffmpeg.sh…"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={runningTurn}
              className="bg-[#ffffff]"
            />
            <Button type="submit" disabled={runningTurn || !promptInput.trim()}>
              <Send className="size-3.5" />
              <span>{runningTurn ? 'Running…' : 'Send'}</span>
            </Button>
          </form>
        </div>

        {/* Right Column: Live MicroVM /workspace File & FFmpeg Inspector */}
        <div className="lg:col-span-6 rounded-[12px] bg-[#f6f6f4] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFileTab('hyperframe')}
                className={`h-8 px-3 rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  activeFileTab === 'hyperframe'
                    ? 'bg-[#111111] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#111111]'
                }`}
              >
                <FileJson className="size-3.5" />
                <span>hyperframe.json</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFileTab('ffmpeg')}
                className={`h-8 px-3 rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  activeFileTab === 'ffmpeg'
                    ? 'bg-[#111111] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#111111]'
                }`}
              >
                <FileCode className="size-3.5" />
                <span>render_ffmpeg.sh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFileTab('runtime')}
                className={`h-8 px-3 rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  activeFileTab === 'runtime'
                    ? 'bg-[#111111] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#111111]'
                }`}
              >
                <Terminal className="size-3.5" />
                <span>MicroVM runtime</span>
              </button>
            </div>

            {activeFileTab !== 'runtime' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyActiveFile}
              >
                {copiedFile ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy file</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {activeFileTab === 'hyperframe' && (
            <pre className="rounded-[8px] bg-[#111111] text-[#ffffff] p-4 text-[12px] leading-[1.5] overflow-x-auto max-h-[520px]">
              <code>{formattedHyperframe}</code>
            </pre>
          )}

          {activeFileTab === 'ffmpeg' && (
            <pre className="rounded-[8px] bg-[#111111] text-[#ffffff] p-4 text-[12px] leading-[1.5] overflow-x-auto max-h-[520px]">
              <code>{renderScriptText}</code>
            </pre>
          )}

          {activeFileTab === 'runtime' && (
            <div className="rounded-[8px] bg-[#ffffff] p-4 space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6b6b6b]">Sandbox runtime</span>
                <code className="font-semibold text-[#111111]">
                  {sandbox?.runtime || 'local_isolated_workspace'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b6b6b]">Workspace directory</span>
                <code className="text-[#111111]">
                  {sandbox?.workspaceDir || `/tmp/muse-sandbox/${sessionId}`}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b6b6b]">Direct outbound internet</span>
                <span className="font-medium text-[#247b50]">disabled (Worker proxy only)</span>
              </div>
              <div className="space-y-1">
                <div className="text-[#6b6b6b]">FFmpeg binary</div>
                <div className="rounded-[6px] bg-[#f6f6f4] px-3 py-2 text-[12px] text-[#111111]">
                  <code>{sandbox?.ffmpegVersion || 'ffmpeg 9.0.2'}</code>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[#6b6b6b]">Workspace files</div>
                <div className="rounded-[6px] bg-[#f6f6f4] p-2.5 space-y-1 text-[12px] text-[#111111]">
                  {(sandbox?.files || []).map((f) => (
                    <div key={f.name} className="flex items-center justify-between">
                      <code>/workspace/{f.name}</code>
                      <span className="text-[#6b6b6b]">{f.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AgentSandboxWorkspace;
