import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { ArchivedDealsDrawer } from "@/features/deals/components/ArchivedDealsDrawer";
import { KanbanColumn } from "@/features/deals/components/KanbanColumn";
import { getArchivedDeals } from "@/services/dealsService";
import type { Deal } from "@/features/deals/types";

/**
 * Kho lưu trữ — dự án hoàn thành đã đóng quá 90 ngày.
 *
 * Cột "Hoàn Thành" phình vô tận khi freelancer làm nhiều dự án, nhưng không được xoá: chính
 * những dự án đó là hồ sơ khách cũ, là mốc neo giá, và là số liệu tỷ lệ thắng. Nên chúng chỉ
 * rời khỏi BẢNG, và vào đây.
 */

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

vi.mock("@/services/dealsService", () => ({
  getArchivedDeals: vi.fn(),
  countArchivedDeals: vi.fn(async () => 0),
}));

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock("@dnd-kit/utilities", () => ({ CSS: { Transform: { toString: () => "" } } }));

function deal(over: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    clientId: "c1",
    client: "Hoa Huynh",
    projectType: "Website bán hàng",
    value: 200_000_000,
    score: "hot",
    stage: "completed_and_billed",
    contact: "0900000000",
    channel: "Zalo",
    createdAt: "2025-01-01",
    closedAt: "2025-02-15T00:00:00Z",
    notes: "",
    paymentStatus: "Đã thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
    ...over,
  };
}

function renderDrawer(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ArchivedDealsDrawer open={open} onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("ngăn kéo kho lưu trữ", () => {
  beforeEach(() => {
    vi.mocked(getArchivedDeals).mockResolvedValue({
      deals: [deal()],
      total: 1,
      totalPages: 1,
    });
    mockNavigate.mockClear();
  });

  it("đóng thì không gọi API — kho chỉ tải khi mở ra", async () => {
    renderDrawer(false);
    expect(getArchivedDeals).not.toHaveBeenCalled();
  });

  it("mở ra thì liệt kê dự án kèm ngày đóng", async () => {
    renderDrawer();
    expect(await screen.findByText("Website bán hàng")).toBeInTheDocument();
    expect(screen.getByText(/đóng ngày 15\/02\/2025/)).toBeInTheDocument();
  });

  it("PHÂN TRANG THẬT, không tải hết", async () => {
    // Kho càng dùng lâu càng dài — tải hết là lặp lại đúng cái sai đang đi sửa.
    renderDrawer();
    await screen.findByText("Website bán hàng");
    expect(vi.mocked(getArchivedDeals).mock.calls[0][0]).toEqual(
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("bấm một dự án thì mở trang chi tiết như thường", async () => {
    // Dự án trong kho KHÔNG bị khoá — chỉ là không nằm trên bảng.
    renderDrawer();
    fireEvent.click(await screen.findByText("Website bán hàng"));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/deals/$dealId",
      params: { dealId: "d1" },
    });
  });

  it("nói rõ kho vẫn tính vào doanh thu và mốc giá", async () => {
    // Người dùng phải yên tâm là dự án không mất, nếu không họ sẽ ngại để nó rời bảng.
    renderDrawer();
    expect(screen.getByText(/tỷ lệ thắng và mốc\s+giá/)).toBeInTheDocument();
  });

  it("tìm theo tên thì gọi lại API kèm từ khoá, và về trang 1", async () => {
    renderDrawer();
    await screen.findByText("Website bán hàng");

    fireEvent.change(screen.getByLabelText("Tìm dự án trong kho"), {
      target: { value: "website" },
    });

    await waitFor(() =>
      expect(vi.mocked(getArchivedDeals)).toHaveBeenCalledWith(
        expect.objectContaining({ title: "website", page: 1 })
      )
    );
  });
});

describe("lối vào kho ở chân cột", () => {
  function renderColumn(archivedCount: number, onOpenArchive?: () => void) {
    render(
      <KanbanColumn
        stage="completed_and_billed"
        title="Hoàn Thành"
        hint=""
        deals={[]}
        onCardClick={vi.fn()}
        onDraft={vi.fn()}
        archivedCount={archivedCount}
        onOpenArchive={onOpenArchive}
      />
    );
  }

  it("có dự án trong kho thì hiện lối vào kèm số", () => {
    renderColumn(55, vi.fn());
    expect(screen.getByText(/55 dự án cũ hơn trong kho/)).toBeInTheDocument();
  });

  it("kho rỗng thì KHÔNG treo lối vào — đỡ rối", () => {
    renderColumn(0, vi.fn());
    expect(screen.queryByText(/trong kho/)).toBeNull();
  });

  it("cột không phải Hoàn Thành thì không có lối vào", () => {
    // `onOpenArchive` bỏ trống = bảng không truyền cho cột đó.
    renderColumn(55, undefined);
    expect(screen.queryByText(/trong kho/)).toBeNull();
  });

  it("bấm vào thì mở ngăn kéo", () => {
    const onOpenArchive = vi.fn();
    renderColumn(55, onOpenArchive);
    fireEvent.click(screen.getByText(/55 dự án cũ hơn trong kho/));
    expect(onOpenArchive).toHaveBeenCalled();
  });
});
