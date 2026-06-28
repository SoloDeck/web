import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, FileText, Flame, Mail, Snowflake, Sun } from "lucide-react";
import type React from "react";
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
  // Deal mới chưa qua bước sàng lọc nên không hiển thị phân loại Ấm/Nóng/Lạnh.
  const shouldShowLeadScore = deal.stage !== "new_lead";

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
        <div className="truncate font-mono text-xs font-bold text-primary">{formatVND(deal.value)}</div>
      </div>

      <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={stopPointer}
          aria-label={`Nhắn ${deal.client} qua Zalo`}
          title="Nhắn Zalo"
          className="rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          Zalo
        </button>
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={stopPointer}
          aria-label={`Gửi email cho ${deal.client}`}
          title="Email"
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          <Mail className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => {
            event.stopPropagation();
            onDraft(deal);
          }}
          aria-label={`Tạo báo giá AI cho ${deal.projectType}`}
          title="Tạo báo giá AI"
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15"
        >
          {deal.stage === "qualified" ? <FileText className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          AI
        </button>
      </div>
    </article>
  );
}
