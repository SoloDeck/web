import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { DealCard } from "./DealCard";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { STAGES, type Deal, type Stage } from "@/features/deals/types";

/**
 * Drag-and-drop pipeline board. Rendering is driven by the (already filtered)
 * `deals` prop; reordering is delegated to the deal store, which owns the
 * stage-transition and ordering logic.
 */
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStage = (stage: Stage) => deals.filter((d) => d.stage === stage);
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={(e: DragEndEvent) => {
        setActiveId(null);
        handleDragEnd(String(e.active.id), e.over ? String(e.over.id) : null);
      }}
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
