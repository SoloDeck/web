import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { DealCard } from "./DealCard";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { STAGES, VALID_TRANSITIONS, type Deal, type Stage } from "@/features/deals/types";
import { updateDealStage } from "@/services/dealsService";

const STAGE_IDS = STAGES.map((s) => s.id) as string[];
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.title])) as Record<Stage, string>;

// closestCorners misses empty columns (no items to measure corners against).
// pointerWithin uses the actual cursor position → reliable for any column state.
const multiContainerCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

export function KanbanBoard({
  deals,
  onCardClick,
  onDraft,
}: {
  deals: Deal[];
  onCardClick: (d: Deal) => void;
  onDraft: (d: Deal) => void;
}) {
  const handleDragEnd = useDealStore((s) => s.handleDragEnd);
  const moveToStage = useDealStore((s) => s.moveToStage);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStage = (stage: Stage) => deals.filter((d) => d.stage === stage);
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  const onDragEnd = async (e: DragEndEvent) => {
    const draggedId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);

    if (!overId) return;

    const draggedDeal = deals.find((d) => d.id === draggedId);
    if (!draggedDeal) return;
    const oldStage = draggedDeal.stage;

    // Determine new stage from drop target
    let newStage: Stage | undefined;
    if (STAGE_IDS.includes(overId)) {
      newStage = overId as Stage;
    } else {
      newStage = deals.find((d) => d.id === overId)?.stage;
    }

    // Same stage → just reorder locally, no API needed
    if (!newStage || newStage === oldStage) {
      handleDragEnd(draggedId, overId);
      return;
    }

    // Validate against backend transition rules
    const allowed = VALID_TRANSITIONS[oldStage] ?? [];
    if (!allowed.includes(newStage)) {
      toast.error(
        `Không thể chuyển từ "${STAGE_LABEL[oldStage]}" sang "${STAGE_LABEL[newStage]}". Vui lòng di chuyển từng bước.`
      );
      return;
    }

    // Optimistic update
    handleDragEnd(draggedId, overId);

    // Persist to server
    try {
      await updateDealStage(draggedId, newStage);
    } catch {
      // Revert optimistic update
      moveToStage(draggedId, oldStage);
      toast.error("Không thể cập nhật trạng thái dự án. Đã hoàn tác.");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={multiContainerCollision}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 p-4 lg:p-6 h-full min-w-max">
        {STAGES.map((s) => (
          <KanbanColumn
            key={s.id}
            stage={s.id}
            title={s.title}
            hint={s.hint}
            deals={byStage(s.id)}
            onCardClick={onCardClick}
            onDraft={onDraft}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && (
          <div className="rotate-3">
            <DealCard deal={activeDeal} onClick={() => {}} onDraft={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
