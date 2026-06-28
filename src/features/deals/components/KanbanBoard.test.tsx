import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { toast } from "sonner";
import { KanbanBoard } from "./KanbanBoard";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { updateDealStage } from "@/services/dealsService";
import type { Deal, Stage } from "@/features/deals/types";

// Capture the DndContext onDragEnd handler so we can drive a drag deterministically
// (simulating real pointer-based dnd in jsdom is impractical). Children render
// through a plain wrapper; the column/card subtrees are stubbed out below.
let capturedOnDragEnd: ((e: unknown) => void | Promise<void>) | null = null;
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (e: unknown) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  useSensor: () => undefined,
  useSensors: () => [],
  closestCorners: () => [],
}));
vi.mock("./KanbanColumn", () => ({ KanbanColumn: () => null }));
vi.mock("./DealCard", () => ({ DealCard: () => null }));
vi.mock("@/services/dealsService", () => ({ updateDealStage: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    clientId: "c1",
    client: "Khách A",
    projectType: "Website",
    value: 1000,
    score: "warm",
    stage: "new_lead",
    contact: "Khách A",
    channel: "Zalo",
    createdAt: "2026-06-15",
    notes: "",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
    ...overrides,
  };
}

function renderBoard(deals: Deal[]) {
  useDealStore.setState({ deals, hydrated: true });
  render(<KanbanBoard deals={deals} onCardClick={vi.fn()} onDraft={vi.fn()} />);
}

function dragTo(stage: Stage) {
  return act(async () => {
    await capturedOnDragEnd?.({ active: { id: "d1" }, over: { id: stage } });
  });
}

beforeEach(() => {
  capturedOnDragEnd = null;
  useDealStore.setState({ deals: [], hydrated: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<KanbanBoard /> stage transition", () => {
  it("dispatches POST /deals/{id}/stage with the new stage on a valid drag", async () => {
    vi.mocked(updateDealStage).mockResolvedValue(makeDeal({ stage: "qualified" }));
    renderBoard([makeDeal({ stage: "new_lead" })]);

    await dragTo("qualified");

    expect(updateDealStage).toHaveBeenCalledWith("d1", "qualified");
    // Optimistic move persisted (no rollback on success).
    expect(useDealStore.getState().deals[0].stage).toBe("qualified");
  });

  it("rolls back the optimistic move and toasts when the server call fails", async () => {
    vi.mocked(updateDealStage).mockRejectedValue(new Error("network"));
    renderBoard([makeDeal({ stage: "new_lead" })]);

    await dragTo("qualified");

    expect(updateDealStage).toHaveBeenCalledWith("d1", "qualified");
    // Reverted to the original stage after the failure.
    expect(useDealStore.getState().deals[0].stage).toBe("new_lead");
    expect(toast.error).toHaveBeenCalled();
  });

  it("rejects an invalid (skipping) transition without calling the API", async () => {
    renderBoard([makeDeal({ stage: "new_lead" })]);

    await dragTo("active"); // new_lead -> active is not allowed

    expect(updateDealStage).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(useDealStore.getState().deals[0].stage).toBe("new_lead");
  });
});
