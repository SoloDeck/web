import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";
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
}: {
  stage: Stage;
  title: string;
  hint: string;
  deals: Deal[];
  onCardClick: (d: Deal) => void;
  onDraft: (d: Deal) => void;
  onAddDeal?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  const meta = STAGE_BY_ID[stage];

  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={`stage-${stage}`}>
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
          "min-h-[440px] min-w-0 flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border bg-background"
        )}
      >
        <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onCardClick(deal)} onDraft={onDraft} />
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
    </section>
  );
}
