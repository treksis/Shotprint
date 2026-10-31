import { Button, cn } from "@sns/ui";
import { ArrowUp, Check, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../../lib/i18n.tsx";
import { ASSET_DRAG_TYPE, type StudioItem, type StudioMessage } from "../types.ts";

export interface ChatPanelProps {
  messages: StudioMessage[];
  items: StudioItem[];
  attachments: string[];
  running: boolean;
  dropActive: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onDetach: (id: string) => void;
  onChip: (id: string) => void;
  onDropFiles: (files: File[], assetJson: string | null) => void;
}

function Chip({
  item,
  onClick,
  onRemove,
}: {
  item: StudioItem;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const t = useT("studio");
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-soft text-[12px] font-semibold">
      <button
        type="button"
        onClick={onClick}
        className="h-full rounded-full px-2.5 hover:bg-field focus-visible:outline-2 focus-visible:outline-ink"
      >
        {t(`kinds.${item.kind}`)}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={t("detach")}
          onClick={onRemove}
          className="mr-1 grid size-5 place-items-center rounded-full hover:bg-field"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export function ChatPanel({
  messages,
  items,
  attachments,
  running,
  dropActive,
  onSend,
  onStop,
  onDetach,
  onChip,
  onDropFiles,
}: ChatPanelProps) {
  const t = useT("studio");
  const [draft, setDraft] = useState("");
  const [over, setOver] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);
  const byId = new Map(items.map((item) => [item.id, item]));
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text || running) return;
    onSend(text);
    setDraft("");
  };

  return (
    <section
      data-chat-drop
      aria-label={t("chat")}
      className={cn(
        "relative flex min-h-0 flex-1 flex-col bg-canvas",
        (over || dropActive) && "bg-soft",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropFiles([...e.dataTransfer.files], e.dataTransfer.getData(ASSET_DRAG_TYPE) || null);
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="pt-10">
            <p className="text-[18px] font-[650]">{t("chatEmptyTitle")}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("chatEmptyDescription")}</p>
            <ul className="mt-4 space-y-1.5">
              {(["suggestion1", "suggestion2", "suggestion3"] as const).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setDraft(t(key))}
                    className="rounded-[12px] bg-soft px-3 py-2 text-left text-[14px] hover:bg-field"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex flex-col items-end gap-1.5">
              <p className="max-w-[88%] rounded-[16px] bg-soft px-3.5 py-2.5 text-[14px] whitespace-pre-wrap">
                {message.text}
              </p>
              {message.attachments.length > 0 && (
                <span className="flex flex-wrap justify-end gap-1">
                  {message.attachments.map((id) => {
                    const item = byId.get(id);
                    return item ? <Chip key={id} item={item} onClick={() => onChip(id)} /> : null;
                  })}
                </span>
              )}
            </div>
          ) : (
            <div key={message.id} className="space-y-2.5">
              <ul className="space-y-1.5 text-[13px]">
                {message.steps.map((step) => (
                  <li key={step.key} className="flex items-center gap-2 text-muted-foreground">
                    {step.status === "done" ? (
                      <Check className="size-3.5 text-ink" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 rounded-full",
                          step.status === "running" ? "bg-live" : "bg-faint",
                        )}
                      />
                    )}
                    <span className={cn(step.status !== "running" && "text-ink")}>
                      {t(`steps.${step.key}`, { count: step.count ?? 0 })}
                    </span>
                    {step.credits !== undefined && (
                      <span className="ml-auto tabular-nums">
                        {t("credits", { count: step.credits })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {message.state === "done" && (
                <>
                  <p className="text-[14px]">{t("runDone")}</p>
                  <span className="flex flex-wrap gap-1">
                    {message.created.map((id) => {
                      const item = byId.get(id);
                      return item ? <Chip key={id} item={item} onClick={() => onChip(id)} /> : null;
                    })}
                  </span>
                </>
              )}
              {message.state === "stopped" && (
                <p className="text-[14px] text-muted-foreground">{t("runStopped")}</p>
              )}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-hairline-soft p-3">
        {attachments.length > 0 && (
          <span className="mb-2 flex flex-wrap gap-1">
            {attachments.map((id) => {
              const item = byId.get(id);
              return item ? (
                <Chip
                  key={id}
                  item={item}
                  onClick={() => onChip(id)}
                  onRemove={() => onDetach(id)}
                />
              ) : null;
            })}
          </span>
        )}
        <div className="flex items-end gap-2 rounded-[20px] bg-field p-2 focus-within:outline-2 focus-within:outline-ink">
          <textarea
            value={draft}
            rows={2}
            aria-label={t("composerLabel")}
            placeholder={dropActive || over ? t("dropToAttach") : t("composerPlaceholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-muted-foreground"
          />
          {running ? (
            <Button size="icon" variant="outline" aria-label={t("stop")} onClick={onStop}>
              <Square />
            </Button>
          ) : (
            <Button size="icon" aria-label={t("send")} disabled={!draft.trim()} onClick={submit}>
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
