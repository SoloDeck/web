import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
// Cột thật vẽ ra một cây khá nặng; ở đây chỉ cần đủ để BẤM vào thẻ và đọc được thẻ nào
// đang được đánh dấu "vừa cập nhật".
vi.mock("./KanbanColumn", () => ({
  KanbanColumn: ({
    deals,
    onCardClick,
    highlightedDealId,
    unseenDealIds,
  }: {
    deals: Deal[];
    onCardClick: (deal: Deal) => void;
    highlightedDealId: string | null;
    unseenDealIds?: ReadonlyMap<string, string>;
  }) => (
    <div>
      {deals.map((deal) => (
        <button key={deal.id} type="button" onClick={() => onCardClick(deal)}>
          {deal.id}
          {deal.id === highlightedDealId ? " (vừa cập nhật)" : ""}
          {unseenDealIds?.has(deal.id) ? " (mới · chưa xem)" : ""}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./DealCard", () => ({ DealCard: () => null }));
vi.mock("@/services/dealsService", () => ({
  updateDealStage: vi.fn(),
  // Chân cột "Hoàn Thành" đếm số dự án trong kho. Test này lo kéo-thả nên trả 0 — không có
  // dự án nào trong kho thì lối vào kho cũng không hiện.
  countArchivedDeals: vi.fn(async () => 0),
  getArchivedDeals: vi.fn(async () => ({ deals: [], total: 0, totalPages: 1 })),
}));

// Bảng đọc thông báo chưa đọc để biết deal nào khách vừa gửi mà chưa ai xem. Ở tầng test
// này chỉ quan tâm chuyện kéo-thả và highlight, nên trả về rỗng; test riêng cho phần "deal
// chưa xem" tự override.
const mockUnseenDeals = vi.fn(() => new Map<string, string>());
const mockMarkRead = vi.fn();
vi.mock("@/features/notifications/hooks/useNotifications", () => ({
  useUnseenDealNotifications: () => mockUnseenDeals(),
  useMarkNotificationRead: () => ({ mutate: (...args: unknown[]) => mockMarkRead(...args) }),
}));
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
  mockUnseenDeals.mockReturnValue(new Map());
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

  it("highlight ở lại tới khi bấm vào thẻ, KHÔNG tự tắt theo đồng hồ", async () => {
    // Bản trước tắt highlight sau 2,5 giây. Nhưng phần lớn thao tác đổi giai đoạn xảy ra ở
    // TRANG CHI TIẾT ("Lưu & chuyển sang Đã đánh giá"), lúc người dùng quay ra bảng thì hiệu
    // ứng đã tắt từ lâu — pháo hoa bắn vào chỗ không có ai xem.  #Huynh
    vi.useFakeTimers();
    try {
      vi.mocked(updateDealStage).mockResolvedValue(makeDeal({ stage: "qualified" }));
      const onCardClick = vi.fn();
      const deals = [makeDeal({ stage: "new_lead" })];
      useDealStore.setState({ deals, hydrated: true });
      render(<KanbanBoard deals={deals} onCardClick={onCardClick} onDraft={vi.fn()} />);

      await dragTo("qualified");
      expect(useDealStore.getState().recentlyMovedId).toBe("d1");

      // Đẩy đồng hồ đi thật xa — còn hẹn giờ nào tắt hộ là lộ ra ngay.
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      expect(useDealStore.getState().recentlyMovedId).toBe("d1");
      expect(screen.getByRole("button", { name: /vừa cập nhật/i })).toBeInTheDocument();

      // Bấm vào thẻ = đã nhìn thấy → mới tắt.
      fireEvent.click(screen.getByRole("button", { name: /d1/ }));
      expect(onCardClick).toHaveBeenCalledTimes(1);
      expect(useDealStore.getState().recentlyMovedId).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("deal khách vừa gửi mà chưa xem thì lên ĐẦU cột, bấm vào là đánh dấu đã đọc", async () => {
    // Khách gửi biểu mẫu → deal rơi vào cột "Deal Mới" lẫn giữa các thẻ cũ, freelancer mở
    // web lên không biết cái nào vừa tới. Deal nóng để vài ngày là mất khách.  #Huynh
    mockUnseenDeals.mockReturnValue(new Map([["d2", "notif-1"]]));
    const onCardClick = vi.fn();
    const deals = [
      makeDeal({ id: "d1", stage: "new_lead" }),
      makeDeal({ id: "d2", stage: "new_lead" }),
    ];
    useDealStore.setState({ deals, hydrated: true });
    render(<KanbanBoard deals={deals} onCardClick={onCardClick} onDraft={vi.fn()} />);

    // d2 chưa xem nên phải đứng TRƯỚC d1 dù server trả về sau.
    const cards = screen.getAllByRole("button");
    expect(cards[0]).toHaveTextContent("d2");
    expect(cards[0]).toHaveTextContent(/chưa xem/i);

    // Mở ra xem = đã xem → đánh dấu đúng dòng thông báo đó.
    fireEvent.click(cards[0]);
    expect(mockMarkRead).toHaveBeenCalledWith("notif-1");
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid (skipping) transition without calling the API", async () => {
    renderBoard([makeDeal({ stage: "new_lead" })]);

    await dragTo("active"); // new_lead -> active is not allowed

    expect(updateDealStage).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(useDealStore.getState().deals[0].stage).toBe("new_lead");
  });
});
