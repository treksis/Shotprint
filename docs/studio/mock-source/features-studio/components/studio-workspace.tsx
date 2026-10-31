import { cn } from "@sns/ui";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../../lib/i18n.tsx";
import { useMediaLibraryQuery } from "../../media/api.ts";
import { mockRunItems, newItemId, RUN_STEPS, STEP_DELAY_MS } from "../lib.ts";
import type { AgentStep, StudioItem, StudioMessage } from "../types.ts";
import { ITEM_SIZE } from "../types.ts";
import { CanvasPanel } from "./canvas-panel.tsx";
import { ChatPanel } from "./chat-panel.tsx";

const MIN_CHAT = 320;
const MAX_CHAT = 640;
const SPLIT_KEY = "sns.studio.split";

/**
 * Phase 0 mock: chat on the left, canvas on the right, all in memory.
 * "Generated" images are existing library files, and nothing is saved or spent.
 */
export function StudioWorkspace() {
  const t = useT("studio");
  const library = useMediaLibraryQuery();
  const pool = (library.data?.pages.flatMap((page) => page.data) ?? []).filter(
    (asset) => asset.kind === "image" && asset.url,
  );

  const [items, setItems] = useState<StudioItem[]>([]);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [chatDrop, setChatDrop] = useState(false);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"chat" | "canvas">("chat");
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SPLIT_KEY));
    return saved >= MIN_CHAT && saved <= MAX_CHAT ? saved : 400;
  });
  const timers = useRef<number[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const poolRef = useRef(pool);
  poolRef.current = pool;
  const credits = messages.reduce(
    (sum, m) =>
      m.role === "agent"
        ? sum + m.steps.reduce((s, st) => s + (st.status === "done" ? (st.credits ?? 0) : 0), 0)
        : sum,
    0,
  );

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const addItem = (item: StudioItem) => {
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item) => ({ ...item, inputs: item.inputs.filter((i) => i !== id) })),
    );
    setAttachments((prev) => prev.filter((a) => a !== id));
    setSelectedId(null);
  };

  const attach = (id: string) =>
    setAttachments((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const send = (text: string) => {
    const agentId = newItemId();
    const attached = attachments;
    setAttachments([]);
    setMessages((prev) => [
      ...prev,
      { id: newItemId(), role: "user", text, attachments: attached },
      { id: agentId, role: "agent", steps: [], state: "running", created: [] },
    ]);
    setRunning(true);

    const patch = (
      fn: (
        m: Extract<StudioMessage, { role: "agent" }>,
      ) => Extract<StudioMessage, { role: "agent" }>,
    ) =>
      setMessages((prev) => prev.map((m) => (m.id === agentId && m.role === "agent" ? fn(m) : m)));

    RUN_STEPS.forEach((step, index) => {
      timers.current.push(
        window.setTimeout(() => {
          const next: AgentStep = {
            key: step.key,
            status: "running",
            credits: step.credits,
            count: itemsRef.current.length,
          };
          patch((m) => ({
            ...m,
            steps: [...m.steps.map((s): AgentStep => ({ ...s, status: "done" })), next],
          }));
        }, index * STEP_DELAY_MS),
      );
    });

    timers.current.push(
      window.setTimeout(() => {
        const created = mockRunItems(
          text,
          itemsRef.current,
          poolRef.current,
          t("mockCaption", { prompt: text }),
        );
        setItems((prev) => [...prev, ...created]);
        patch((m) => ({
          ...m,
          state: "done",
          steps: m.steps.map((s): AgentStep => ({ ...s, status: "done" })),
          created: created.map((c) => c.id),
        }));
        setRunning(false);
        const middle = created[1];
        if (middle) setFocus({ id: middle.id, n: Date.now() });
      }, RUN_STEPS.length * STEP_DELAY_MS),
    );
  };

  const stop = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "agent" && m.state === "running"
          ? {
              ...m,
              state: "stopped",
              steps: m.steps.map(
                (s): AgentStep => ({ ...s, status: s.status === "running" ? "stopped" : s.status }),
              ),
            }
          : m,
      ),
    );
    setRunning(false);
  };

  const dropOnChat = (files: File[], assetJson: string | null) => {
    const base = Math.max(40, ...itemsRef.current.map((i) => i.x + ITEM_SIZE[i.kind].w + 40));
    const make = (extra: Partial<StudioItem>, n: number): StudioItem => ({
      id: newItemId(),
      kind: "image",
      x: base + n * 30,
      y: 40 + n * 30,
      inputs: [],
      ...extra,
    });
    const created: StudioItem[] = [];
    if (assetJson) created.push(make({ asset: JSON.parse(assetJson) }, 0));
    for (const file of files) {
      if (file.type.startsWith("image/"))
        created.push(make({ localUrl: URL.createObjectURL(file) }, created.length));
    }
    if (created.length === 0) return;
    setItems((prev) => [...prev, ...created]);
    for (const item of created) attach(item.id);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    let latest = startW;
    const move = (ev: PointerEvent) => {
      latest = Math.min(MAX_CHAT, Math.max(MIN_CHAT, startW + ev.clientX - startX));
      setChatWidth(latest);
    };
    const up = () => {
      localStorage.setItem(SPLIT_KEY, String(latest));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-[calc(100dvh-132px)] min-h-[560px] flex-col overflow-hidden rounded-[24px] border border-hairline-soft bg-canvas">
      <div className="flex items-center gap-3 border-b border-hairline-soft px-4 py-2.5">
        <h1 className="text-[16px] font-[650]">{t("projectName")}</h1>
        <span className="text-[12px] font-semibold text-muted-foreground">{t("mockBadge")}</span>
        <span className="ml-auto text-[13px] tabular-nums text-muted-foreground">
          {t("creditsUsed", { count: credits })}
        </span>
        <fieldset className="m-0 inline-flex rounded-full border-0 bg-soft p-0.5 lg:hidden">
          <legend className="sr-only">{t("view")}</legend>
          {(["chat", "canvas"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-semibold",
                tab === key ? "bg-canvas text-ink" : "text-muted-foreground",
              )}
            >
              {t(key)}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex min-h-0 w-full flex-col lg:w-[var(--chat-w)]",
            tab !== "chat" && "max-lg:hidden",
          )}
          style={{ "--chat-w": `${chatWidth}px` } as React.CSSProperties}
        >
          <ChatPanel
            messages={messages}
            items={items}
            attachments={attachments}
            running={running}
            dropActive={chatDrop}
            onSend={send}
            onStop={stop}
            onDetach={(id) => setAttachments((prev) => prev.filter((a) => a !== id))}
            onChip={(id) => {
              setSelectedId(id);
              setFocus({ id, n: Date.now() });
              setTab("canvas");
            }}
            onDropFiles={dropOnChat}
          />
        </div>
        <button
          type="button"
          aria-label={t("resize")}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setChatWidth((w) => Math.max(MIN_CHAT, w - 24));
            if (e.key === "ArrowRight") setChatWidth((w) => Math.min(MAX_CHAT, w + 24));
          }}
          className="w-px shrink-0 cursor-col-resize bg-hairline-soft hover:bg-ink focus-visible:bg-ink max-lg:hidden"
        />
        <div className={cn("flex min-h-0 min-w-0 flex-1", tab !== "canvas" && "max-lg:hidden")}>
          <CanvasPanel
            items={items}
            selectedId={selectedId}
            focusId={focus}
            onSelect={setSelectedId}
            onMove={(id, x, y) =>
              setItems((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)))
            }
            onAdd={addItem}
            onRemove={removeItem}
            onAttach={attach}
            onDragToChat={setChatDrop}
          />
        </div>
      </div>
    </div>
  );
}
