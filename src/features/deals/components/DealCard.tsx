import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, Flame, Snowflake, Sun } from "lucide-react";
import type React from "react";
import { BrandIcon } from "@/components/solodesk/BrandIcon";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Deal } from "@/features/deals/types";

const scoreCfg = {
  hot: {
    icon: Flame,
    label: "Nóng",
    cls: "border-red-200 bg-red-50 text-red-600",
  },
  warm: {
    icon: Sun,
    label: "Ấm",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  cold: {
    icon: Snowflake,
    label: "Lạnh",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
} as const;

export function DealCard({
  deal,
  onClick,
  onDraft,
}: {
  deal: Deal;
  onClick: () => void;
  onDraft: (d: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  const ScoreIcon = scoreCfg[deal.score].icon;
  const isNewLead = deal.stage === "new_lead";
  // Deal mới chưa qua bước sàng lọc nên không hiển thị phân loại Ấm/Nóng/Lạnh.
  const shouldShowLeadScore = !isNewLead;
  const budgetLabel = deal.budgetLabel || formatVND(deal.value);
  const aiActionLabel = isNewLead ? "Đánh giá" : "AI";

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group min-w-0 cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-[1.5deg] shadow-lg"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground">{deal.projectType}</h3>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{deal.client}</p>
        </div>
        {shouldShowLeadScore && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              scoreCfg[deal.score].cls
            )}
            title={
              deal.aiQualificationScore
                ? `AI score ${deal.aiQualificationScore}/100`
                : "Điểm AI đang dùng fallback"
            }
          >
            <ScoreIcon className="h-2.5 w-2.5" />
            {scoreCfg[deal.score].label}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="truncate text-xs font-bold text-primary">{budgetLabel}</div>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/35 p-1 transition-opacity",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={stopPointer}
          aria-label={`Nhắn ${deal.client} qua Zalo`}
          title="Nhắn Zalo"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-muted-foreground hover:border-emerald-300 hover:bg-emerald-100"
        >
          <BrandIcon name="zalo" className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={stopPointer}
          aria-label={`Gửi email cho ${deal.client}`}
          title="Gmail"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-red-100 bg-red-50 text-muted-foreground hover:border-red-300 hover:bg-red-100"
        >
          <BrandIcon name="email" className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            onDraft(deal);
          }}
          aria-label={isNewLead ? `Đánh giá AI cho ${deal.projectType}` : `Tạo báo giá AI cho ${deal.projectType}`}
          title={isNewLead ? "Đánh giá bằng AI" : "Tạo báo giá AI"}
          className={cn(
            "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
            isNewLead
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "bg-primary/10 text-primary hover:bg-primary/15"
          )}
        >
          <Bot className="size-3.5 shrink-0" />
          {aiActionLabel}
        </button>
      </div>
    </article>
  );
}
