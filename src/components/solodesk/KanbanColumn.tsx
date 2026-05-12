import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { DealCard } from "./DealCard";
import { formatVND, type Deal, type Stage } from "@/lib/mock-data";

export function KanbanColumn({
  stage,
  title,
  hint,
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
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className="px-1 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <span className="text-[11px] rounded-full bg-secondary text-secondary-foreground px-1.5 py-0.5 font-medium">
              {deals.length}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {hint} · <span className="font-medium">{formatVND(total)}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[400px] transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-border bg-muted/40"
        }`}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} onClick={() => onCardClick(d)} onDraft={onDraft} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Kéo deal vào đây</div>
        )}
      </div>
    </div>
  );
}
