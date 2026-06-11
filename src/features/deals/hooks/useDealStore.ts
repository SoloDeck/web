import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import { STAGES, type Deal, type Stage } from "@/features/deals/types";

const STAGE_IDS = STAGES.map((s) => s.id) as string[];

interface DealState {
  deals: Deal[];
  hydrated: boolean;
  /** Seed the board from the server payload (runs once). */
  hydrate: (deals: Deal[]) => void;
  /** Append a newly-created deal to the board (optimistic after POST /deals). */
  addDeal: (deal: Deal) => void;
  /** Move a deal to a stage, appending it to the end of that column. */
  moveToStage: (dealId: string, stage: Stage) => void;
  /**
   * Resolve a dnd-kit drag end into the new ordering. `overId` is either a
   * stage column id (dropped on empty area) or another deal's id.
   */
  handleDragEnd: (activeId: string, overId: string | null) => void;
}

export const useDealStore = create<DealState>((set) => ({
  deals: [],
  hydrated: false,

  hydrate: (deals) =>
    set((state) => (state.hydrated ? state : { deals, hydrated: true })),

  addDeal: (deal) =>
    set((state) => ({ deals: [deal, ...state.deals] })),

  moveToStage: (dealId, stage) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, stage } : d)),
    })),

  handleDragEnd: (activeId, overId) =>
    set((state) => {
      if (!overId) return state;
      const active = state.deals.find((d) => d.id === activeId);
      if (!active) return state;

      // Dropped onto a stage column (empty area) -> move to end of that stage.
      if (STAGE_IDS.includes(overId)) {
        const targetStage = overId as Stage;
        if (targetStage === active.stage) return state;
        return { deals: relocate(state.deals, active, targetStage) };
      }

      const over = state.deals.find((d) => d.id === overId);
      if (!over) return state;

      // Reorder within the same stage.
      if (over.stage === active.stage) {
        const stage = active.stage;
        const stageItems = state.deals.filter((d) => d.stage === stage);
        const fromIndex = stageItems.findIndex((d) => d.id === activeId);
        const toIndex = stageItems.findIndex((d) => d.id === overId);
        if (fromIndex === -1 || toIndex === -1) return state;
        const reordered = arrayMove(stageItems, fromIndex, toIndex);
        let si = 0;
        return {
          deals: state.deals.map((d) => (d.stage === stage ? reordered[si++] : d)),
        };
      }

      // Move to another stage, inserting at the hovered deal's position.
      const insertBefore = state.deals
        .filter((d) => d.stage === over.stage && d.id !== activeId)
        .findIndex((d) => d.id === overId);
      return { deals: relocate(state.deals, active, over.stage, insertBefore) };
    }),
}));

/**
 * Rebuild the deal list with `active` moved into `targetStage`. When
 * `insertIndex` is provided the deal is inserted at that position within the
 * target column, otherwise it is appended to the end of the column.
 */
function relocate(
  deals: Deal[],
  active: Deal,
  targetStage: Stage,
  insertIndex?: number
): Deal[] {
  const withoutActive = deals.filter((d) => d.id !== active.id);
  const targetItems = withoutActive.filter((d) => d.stage === targetStage);
  const moved = { ...active, stage: targetStage };
  if (insertIndex === undefined || insertIndex < 0) {
    targetItems.push(moved);
  } else {
    targetItems.splice(insertIndex, 0, moved);
  }

  const firstIndex = withoutActive.findIndex((d) => d.stage === targetStage);
  if (firstIndex === -1) return [...withoutActive, ...targetItems];

  const before = withoutActive.slice(0, firstIndex);
  const after = withoutActive.slice(firstIndex).filter((d) => d.stage !== targetStage);
  return [...before, ...targetItems, ...after];
}
