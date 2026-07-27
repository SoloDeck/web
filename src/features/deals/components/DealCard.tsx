import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, Clock, Flame, Snowflake, Sun } from "lucide-react";
import type React from "react";
import { BrandIcon } from "@/components/solodesk/BrandIcon";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Deal } from "@/features/deals/types";

const scoreCfg = {
  hot: {
    icon: Flame,
    label: "HOT",
    cls: "border-red-200 bg-red-50 text-red-600",
  },
  warm: {
    icon: Sun,
    label: "WARM",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  cold: {
    icon: Snowflake,
    label: "COLD",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
} as const;

export function DealCard({
  deal,
  onClick,
  onDraft,
  highlighted = false,
}: {
  deal: Deal;
  onClick: () => void;
  onDraft: (d: Deal) => void;
  /** Vừa được chuyển giai đoạn — làm nổi bật tạm thời để user thấy nó đã lên đầu cột. */
  highlighted?: boolean;
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
  const stage = deal.stage;
  const isNewLead = stage === "new_lead";
  // CHƯA CHẤM THÌ KHÔNG HIỆN NHÃN. Trước đây deal chưa có điểm vẫn hiện "Ấm" (vì
  // `mapScore(null)` mặc định trả "warm"), và chỉ thú nhận "đang dùng fallback" trong
  // TOOLTIP — không ai rê chuột để đọc. Nhãn mức độ là kết luận của AI; chưa chấm mà vẫn
  // dán nhãn là bịa.  #Huynh
  const shouldShowLeadScore = !isNewLead && typeof deal.aiQualificationScore === "number";
  const budgetLabel = deal.budgetLabel || formatVND(deal.value);

  const aiBtn =
    stage === "new_lead"       ? { label: "Đánh giá",       icon: Bot,   style: "primary",   action: "draft"    } :
    stage === "qualified"      ? { label: "Báo giá",         icon: Bot,   style: "secondary",  action: "draft"    } :
    stage === "proposal_sent"  ? { label: "Chờ khách",       icon: Clock, style: "disabled",   action: "none"     } :
    stage === "in_negotiation" ? { label: "Tạo hợp đồng",    icon: Bot,   style: "secondary",  action: "draft"    } :
    stage === "active"         ? { label: "Đang triển khai", icon: Bot,   style: "disabled",   action: "none"     } :
    null;

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
        "group min-w-0 cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-500",
        "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-[1.5deg] shadow-lg",
        highlighted && "border-primary bg-primary/[0.05] ring-2 ring-primary/50 shadow-md"
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
            title={`Điểm AI: ${deal.aiQualificationScore}/100`}
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
        {aiBtn && (
          <button
            type="button"
            disabled={aiBtn.action === "none"}
            onPointerDown={aiBtn.action !== "none" ? stopPointer : undefined}
            onClick={(event) => {
              event.stopPropagation();
              if (aiBtn.action === "draft") onDraft(deal);
              else if (aiBtn.action === "navigate") onClick();
            }}
            aria-label={aiBtn.label}
            title={aiBtn.label}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              aiBtn.style === "primary"   && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
              aiBtn.style === "secondary" && "bg-primary/10 text-primary hover:bg-primary/15",
              aiBtn.style === "disabled"  && "cursor-default bg-muted/60 text-muted-foreground",
            )}
          >
            <aiBtn.icon className="size-3.5 shrink-0" />
            {aiBtn.label}
          </button>
        )}
      </div>
    </article>
  );
}
