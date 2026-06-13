import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, User, Clock } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";

/** Thời gian cập nhật tương đối bằng tiếng Việt */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 7)  return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DealCard({
  deal,
  onClick,
  onDraft,
}: {
  deal:    Deal;
  onClick: () => void;
  onDraft: (d: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { stage: deal.stage } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-grab active:cursor-grabbing rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      {/* Tên dự án — nổi bật */}
      <p className="text-sm font-semibold text-card-foreground line-clamp-2 leading-snug mb-1">
        {deal.projectType}
      </p>

      {/* Tên khách hàng — nhỏ, mờ */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2.5">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{deal.client}</span>
      </div>

      {/* Footer: giá trị + thời gian cập nhật */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-primary">{formatVND(deal.value)}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          {relativeTime(deal.updatedAt)}
        </span>
      </div>

      {/* Nút tạo báo giá AI — chỉ ở cột Đã Sàng Lọc */}
      {deal.stage === "qualified" && (
        <button
          onClick={(e) => { e.stopPropagation(); onDraft(deal); }}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-md bg-accent text-accent-foreground text-[11px] font-medium py-1.5 hover:bg-accent/80 transition"
        >
          <FileText className="h-3 w-3" /> Tạo Báo Giá AI
        </button>
      )}
    </div>
  );
}
