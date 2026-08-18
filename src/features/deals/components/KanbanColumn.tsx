import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Archive, Inbox } from "lucide-react";
import { DealCard } from "./DealCard";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";
import { STAGE_BY_ID, type Deal, type Stage } from "@/features/deals/types";

export function KanbanColumn({
  stage,
  title,
  deals,
  onCardClick,
  onDraft,
  isDropTarget = false,
  highlightedDealId = null,
  unseenDealIds,
  archivedCount,
  onOpenArchive,
}: {
  stage: Stage;
  title: string;
  hint: string;
  deals: Deal[];
  onCardClick: (d: Deal) => void;
  onDraft: (d: Deal) => void;
  onAddDeal?: () => void;
  isDropTarget?: boolean;
  highlightedDealId?: string | null;
  /** Deal khách vừa gửi mà freelancer chưa mở xem (map dealId -> id thông báo). */
  unseenDealIds?: ReadonlyMap<string, string>;
  /** Số dự án đã vào kho. Chỉ cột "Hoàn Thành" truyền — các cột khác bỏ trống. */
  archivedCount?: number;
  onOpenArchive?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  const meta = STAGE_BY_ID[stage];
  const highlighted = isOver || isDropTarget;

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`stage-${stage}`}>
      <header className="mb-2 rounded-lg px-1 py-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotClass)} />
            <h2
              id={`stage-${stage}`}
              className="truncate text-[11px] font-bold uppercase tracking-wide text-foreground"
            >
              {title}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {deals.length}
          </span>
        </div>
        <div className="mt-1 truncate text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{formatVND(total)}</span> tổng giá trị
        </div>
      </header>

      <div
        ref={setNodeRef}
        role="list"
        aria-label={title}
        className={cn(
          "min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-dashed p-2 transition-all duration-150",
          highlighted
            ? "border-primary bg-primary/5 shadow-[0_0_0_2px_hsl(var(--primary)/0.12)]"
            : "border-border bg-background"
        )}
      >
        <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onCardClick(deal)}
              onDraft={onDraft}
              highlighted={deal.id === highlightedDealId}
              isNew={Boolean(unseenDealIds?.has(deal.id))}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-border/80 px-4 text-center">
            <div className="space-y-2 text-xs text-muted-foreground">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/65" />
              <div>Kéo dự án vào đây</div>
            </div>
          </div>
        )}
      </div>

      {/* CHÂN CỘT — lối vào kho lưu trữ.
        Nằm NGOÀI vùng cuộn để không trôi mất khi cột dài. Chỉ hiện khi thật sự có dự án trong
        kho: cột trống trơn mà treo sẵn "0 dự án trong kho" thì chỉ tổ làm rối.

        Đây cũng là câu trả lời cho thắc mắc "mấy dự án cũ đâu rồi" — đặt đúng chỗ người dùng
        đang nhìn lúc thắc mắc, thay vì bắt họ đi tìm trong một tab khác.  #Huynh */}
      {onOpenArchive && (archivedCount ?? 0) > 0 && (
        <button
          type="button"
          onClick={onOpenArchive}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <Archive className="h-3.5 w-3.5" />
          {archivedCount} dự án cũ hơn trong kho →
        </button>
      )}
    </section>
  );
}
