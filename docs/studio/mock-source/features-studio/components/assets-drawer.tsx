import type { MediaAsset } from "@sns/core/schemas";
import { Button, cn } from "@sns/ui";
import { X } from "lucide-react";
import { useT } from "../../../lib/i18n.tsx";
import { useMediaLibraryQuery } from "../../media/api.ts";
import { MediaThumb } from "../../media/components/media-thumb.tsx";
import { ASSET_DRAG_TYPE } from "../types.ts";

export interface AssetsDrawerProps {
  open: boolean;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
}

/** The Media library as a drawer over the canvas. Drag a file out, or press Enter to add it. */
export function AssetsDrawer({ open, onClose, onPick }: AssetsDrawerProps) {
  const t = useT("studio");
  const tCommon = useT("common");
  const query = useMediaLibraryQuery();
  const assets = (query.data?.pages.flatMap((page) => page.data) ?? []).filter(
    (asset) => asset.status === "ready" && asset.url,
  );

  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute inset-y-0 left-0 z-10 flex w-[264px] flex-col border-r border-hairline bg-canvas transition-transform",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[14px] font-[650]">{t("assets")}</h2>
        <Button variant="ghost" size="icon-sm" aria-label={tCommon("close")} onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="px-4 pb-3 text-[13px] text-muted-foreground">{t("assetsHint")}</p>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-4">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(asset));
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onPick(asset)}
            className="overflow-hidden rounded-[12px] focus-visible:outline-2 focus-visible:outline-ink"
          >
            <MediaThumb asset={asset} className="aspect-square w-full" />
          </button>
        ))}
        {assets.length === 0 && !query.isPending && (
          <p className="col-span-2 text-[13px] text-muted-foreground">{t("assetsEmpty")}</p>
        )}
      </div>
    </aside>
  );
}
