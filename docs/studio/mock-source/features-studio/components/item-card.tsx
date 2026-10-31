import { cn, PlatformIcon } from "@sns/ui";
import { ImageIcon } from "lucide-react";
import { useT } from "../../../lib/i18n.tsx";
import { MediaThumb } from "../../media/components/media-thumb.tsx";
import { ITEM_SIZE, type StudioItem } from "../types.ts";

export interface ItemCardProps {
  item: StudioItem;
  selected: boolean;
}

function ItemImage({ item, className }: { item: StudioItem; className: string }) {
  if (item.localUrl)
    return <img src={item.localUrl} alt="" className={cn("object-cover", className)} />;
  if (item.asset) return <MediaThumb asset={item.asset} className={className} />;
  return (
    <span className={cn("grid place-items-center bg-soft text-muted-foreground", className)}>
      <ImageIcon className="size-6" aria-hidden="true" />
    </span>
  );
}

/** What one item looks like on the board. Position and drag handling live in the canvas. */
export function ItemCard({ item, selected }: ItemCardProps) {
  const t = useT("studio");
  const { w, h } = ITEM_SIZE[item.kind];
  const frame = cn(
    "block overflow-hidden rounded-[16px] border bg-canvas text-left transition-colors",
    selected ? "border-ink" : "border-hairline",
  );

  if (item.kind === "note") {
    return (
      <span className={cn(frame, "p-3.5")} style={{ width: w, height: h }}>
        <span className="block text-[11px] font-semibold text-muted-foreground">
          {t("kinds.note")}
        </span>
        <span className="mt-1.5 line-clamp-4 block text-[14px] leading-snug">{item.text}</span>
      </span>
    );
  }

  if (item.kind === "image") {
    return (
      <span className={frame} style={{ width: w, height: h }}>
        <ItemImage item={item} className="aspect-square w-full" />
        <span className="block px-3 py-2 text-[12px] font-semibold text-muted-foreground">
          {t("kinds.image")}
        </span>
      </span>
    );
  }

  return (
    <span className={frame} style={{ width: w, height: h }}>
      <span className="flex items-center justify-between px-3.5 pt-3">
        <span className="text-[11px] font-semibold text-muted-foreground">{t("kinds.post")}</span>
        <span className="flex gap-1">
          <PlatformIcon id="instagram" size={13} />
          <PlatformIcon id="pinterest" size={13} />
        </span>
      </span>
      <span className="mt-2 flex gap-3 px-3.5">
        <ItemImage item={item} className="size-[84px] shrink-0 rounded-[12px]" />
        <span className="line-clamp-4 block text-[13px] leading-snug">{item.text}</span>
      </span>
      <span className="mt-3 block px-3.5 text-[12px] text-muted-foreground">
        {t("postDraftHint")}
      </span>
    </span>
  );
}
