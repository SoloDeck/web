import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { ArchivedDealsDrawer } from "@/features/deals/components/ArchivedDealsDrawer";
import { KanbanColumn } from "@/features/deals/components/KanbanColumn";
import {
  countArchivedDeals,
  countLostDeals,
  deleteDeal,
  getArchivedDeals,
  getLostDeals,
} from "@/services/dealsService";
import type { Deal } from "@/features/deals/types";

/**
 * Kho lưu trữ — hai mục:
 *  - Đã hoàn thành: dự án hoàn thành đã đóng quá 90 ngày.
 *  - Không thành công: dự án "Loại bỏ" kèm lý do — mục duy nhất cho phép xóa vĩnh viễn.
 *
 * Cột "Hoàn Thành" phình vô tận khi freelancer làm nhiều dự án, nhưng không được xoá: chính
 * những dự án đó là hồ sơ khách cũ, là mốc neo giá, và là số liệu tỷ lệ thắng. Nên chúng chỉ
 * rời khỏi BẢNG, và vào đây.
 */

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

vi.mock("@/services/dealsService", () => ({
  getArchivedDeals: vi.fn(),
  getLostDeals: vi.fn(),
  countArchivedDeals: vi.fn(async () => 0),
  countLostDeals: vi.fn(async () => 0),
  deleteDeal: vi.fn(),
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

function lostDeal(over: Partial<Deal> = {}): Deal {
  return deal({
    id: "l1",
    projectType: "Logo thương hiệu",
    stage: "lost",
    closedAt: "2026-09-20T00:00:00Z",
    lostReason: "Khách chọn bên khác",
    ...over,
  });
}

/**
 * `counts` = [số dự án mục "Đã hoàn thành", số dự án mục "Không thành công"], nạp sẵn vào bộ nhớ
 * đệm như khi mở từ chân cột (màn hình chính đã đếm xong trước khi người dùng thấy lối vào).
 */
function renderDrawer({
  open = true,
  onClose = vi.fn(),
  counts = [1, 0],
}: { open?: boolean; onClose?: () => void; counts?: [number, number] } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["deals", "archived", "count"], counts[0]);
  qc.setQueryData(["deals", "lost", "count"], counts[1]);
  vi.mocked(countArchivedDeals).mockResolvedValue(counts[0]);
  vi.mocked(countLostDeals).mockResolvedValue(counts[1]);
  const tree = (isOpen: boolean) => (
    <QueryClientProvider client={qc}>
      <ArchivedDealsDrawer open={isOpen} onClose={onClose} />
    </QueryClientProvider>
  );
  const view = render(tree(open));
  return { qc, onClose, setOpen: (isOpen: boolean) => view.rerender(tree(isOpen)) };
}

/**
 * Ô tìm kiếm đặt lại về trang 1 MỘT lần, 350ms sau khi kho mở ra (bộ chờ gõ xong). Test nào chuyển
 * trang phải chờ nó xong trước, không thì lần đặt lại đó che khuất lỗi chuyển trang đang kiểm.
 */
const choOTimLang = () => new Promise((resolve) => setTimeout(resolve, 400));

const tabCompleted = () => screen.getByRole("tab", { name: /Đã hoàn thành/ });
const tabLost = () => screen.getByRole("tab", { name: /Không thành công/ });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getArchivedDeals).mockResolvedValue({
    deals: [deal()],
    total: 1,
    totalPages: 1,
  });
  vi.mocked(getLostDeals).mockResolvedValue({
    deals: [lostDeal()],
    total: 1,
    totalPages: 1,
  });
  vi.mocked(deleteDeal).mockResolvedValue(undefined);
});

describe("ngăn kéo kho lưu trữ", () => {
  it("đóng thì không gọi API — kho chỉ tải khi mở ra", async () => {
    renderDrawer({ open: false });
    expect(getArchivedDeals).not.toHaveBeenCalled();
    expect(getLostDeals).not.toHaveBeenCalled();
    expect(countArchivedDeals).not.toHaveBeenCalled();
    expect(countLostDeals).not.toHaveBeenCalled();
  });

  it("mở ra thì liệt kê dự án kèm ngày đóng", async () => {
    renderDrawer();
    expect(await screen.findByText("Website bán hàng")).toBeInTheDocument();
    expect(screen.getByText(/đóng ngày 15\/02\/2025/)).toBeInTheDocument();
    // Dự án hoàn thành không có "lý do" — dòng đó chỉ dành cho mục Không thành công.
    expect(screen.queryByText(/Lý do/)).toBeNull();
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

  it("mục Đã hoàn thành ghi rõ là các dự án hoàn thành", async () => {
    renderDrawer();
    expect(screen.getByText("Các dự án hoàn thành")).toBeInTheDocument();
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

describe("hai mục của kho", () => {
  it("có hai mục kèm số dự án; có dự án ở cả hai thì mở vào Đã hoàn thành", async () => {
    renderDrawer({ counts: [12, 3] });

    expect(tabCompleted()).toHaveAttribute("aria-selected", "true");
    expect(tabLost()).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /Đã hoàn thành\s*12/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Không thành công\s*3/ })).toBeInTheDocument();
    await screen.findByText("Website bán hàng");
    expect(getLostDeals).not.toHaveBeenCalled();
  });

  it("bấm mục Không thành công thì tải đúng các dự án thất bại, kèm lý do", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [12, 3] });
    await screen.findByText("Website bán hàng");

    await user.click(tabLost());

    expect(await screen.findByText("Logo thương hiệu")).toBeInTheDocument();
    expect(screen.getByText("Khách chọn bên khác")).toBeInTheDocument();
    expect(screen.getByText(/loại bỏ ngày 20\/09\/2026/)).toBeInTheDocument();
    expect(screen.queryByText("Website bán hàng")).toBeNull();
    expect(vi.mocked(getLostDeals).mock.calls[0][0]).toEqual(
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("đổi mục thì giải thích đúng mục đó", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [12, 3] });
    expect(screen.getByText("Các dự án hoàn thành")).toBeInTheDocument();

    await user.click(tabLost());

    expect(screen.queryByText("Các dự án hoàn thành")).toBeNull();
    expect(screen.getByText("Các dự án bị loại bỏ")).toBeInTheDocument();
  });

  it("đổi mục thì về trang 1 — không mang số trang của mục kia sang", async () => {
    const user = userEvent.setup();
    vi.mocked(getArchivedDeals).mockResolvedValue({ deals: [deal()], total: 25, totalPages: 3 });
    renderDrawer({ counts: [25, 3] });
    await screen.findByText("Website bán hàng");
    await choOTimLang();
    await user.click(screen.getByLabelText("Trang sau"));
    await waitFor(() =>
      expect(getArchivedDeals).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );

    await user.click(tabLost());

    await waitFor(() => expect(getLostDeals).toHaveBeenCalled());
    expect(getLostDeals).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    expect(getLostDeals).not.toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });

  it("tìm theo tên ở mục Không thành công thì tìm trong mục đó", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [12, 3] });
    await user.click(tabLost());
    await screen.findByText("Logo thương hiệu");

    fireEvent.change(screen.getByLabelText("Tìm dự án trong kho"), { target: { value: "logo" } });

    await waitFor(() =>
      expect(getLostDeals).toHaveBeenCalledWith(expect.objectContaining({ title: "logo", page: 1 }))
    );
  });

  it("kho chỉ có dự án không thành công thì mở thẳng vào mục đó, không bắt đi tìm", async () => {
    renderDrawer({ counts: [0, 2] });

    expect(tabLost()).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Logo thương hiệu")).toBeInTheDocument();
    expect(getArchivedDeals).not.toHaveBeenCalled();
  });

  it("đóng rồi mở lại thì bắt đầu từ đầu, không giữ mục cũ", async () => {
    const user = userEvent.setup();
    const { setOpen } = renderDrawer({ counts: [12, 3] });
    await user.click(tabLost());
    expect(tabLost()).toHaveAttribute("aria-selected", "true");

    setOpen(false);
    setOpen(true);

    expect(tabCompleted()).toHaveAttribute("aria-selected", "true");
  });

  it("dự án không thành công cũ chưa ghi lý do thì nói rõ là chưa ghi, không để trống", async () => {
    const user = userEvent.setup();
    vi.mocked(getLostDeals).mockResolvedValue({
      deals: [lostDeal({ lostReason: null })],
      total: 1,
      totalPages: 1,
    });
    renderDrawer({ counts: [12, 1] });

    await user.click(tabLost());

    expect(await screen.findByText("Chưa ghi lý do")).toBeInTheDocument();
  });

  it("bấm một dự án không thành công thì đóng kho và mở trang chi tiết", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer({ counts: [0, 1] });

    await user.click(await screen.findByText("Logo thương hiệu"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/deals/$dealId",
      params: { dealId: "l1" },
    });
  });
});

describe("xóa vĩnh viễn — chỉ ở mục Không thành công", () => {
  const nutXoa = () => screen.getByRole("button", { name: "Xóa vĩnh viễn dự án Logo thương hiệu" });
  const hopXacNhan = () => screen.getByRole("alertdialog");

  it("mục Đã hoàn thành KHÔNG có nút xóa — dự án đã hoàn thành là hồ sơ, không xóa ở đây", async () => {
    renderDrawer({ counts: [12, 3] });
    await screen.findByText("Website bán hàng");

    expect(screen.queryByRole("button", { name: /Xóa vĩnh viễn/ })).toBeNull();
  });

  it("mục Không thành công có nút xóa trên từng dự án", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [12, 3] });
    await user.click(tabLost());
    await screen.findByText("Logo thương hiệu");

    expect(nutXoa()).toBeInTheDocument();
  });

  it("bấm nút xóa chỉ hỏi lại — chưa xóa gì, và không mở trang chi tiết", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [0, 1] });
    await screen.findByText("Logo thương hiệu");

    await user.click(nutXoa());

    expect(within(hopXacNhan()).getByText("Xóa vĩnh viễn dự án?")).toBeInTheDocument();
    expect(within(hopXacNhan()).getByText(/Logo thương hiệu/)).toBeInTheDocument();
    expect(deleteDeal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("bấm Giữ lại thì không xóa", async () => {
    const user = userEvent.setup();
    renderDrawer({ counts: [0, 1] });
    await screen.findByText("Logo thương hiệu");
    await user.click(nutXoa());

    await user.click(within(hopXacNhan()).getByRole("button", { name: "Giữ lại" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(deleteDeal).not.toHaveBeenCalled();
    expect(screen.getByText("Logo thương hiệu")).toBeInTheDocument();
  });

  it("xác nhận thì xóa đúng dự án đó và danh sách tải lại", async () => {
    const user = userEvent.setup();
    vi.mocked(getLostDeals)
      .mockResolvedValueOnce({ deals: [lostDeal()], total: 1, totalPages: 1 })
      .mockResolvedValue({ deals: [], total: 0, totalPages: 1 });
    renderDrawer({ counts: [0, 1] });
    await screen.findByText("Logo thương hiệu");
    await user.click(nutXoa());

    await user.click(within(hopXacNhan()).getByRole("button", { name: "Xóa vĩnh viễn" }));

    await waitFor(() => expect(deleteDeal).toHaveBeenCalledTimes(1));
    expect(vi.mocked(deleteDeal).mock.calls[0][0]).toBe("l1");
    expect(await screen.findByText("Chưa có dự án nào không thành công.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("xóa đúng dự án được chọn, không phải dự án đầu danh sách", async () => {
    const user = userEvent.setup();
    vi.mocked(getLostDeals).mockResolvedValue({
      deals: [lostDeal(), lostDeal({ id: "l2", projectType: "Banner quảng cáo" })],
      total: 2,
      totalPages: 1,
    });
    renderDrawer({ counts: [0, 2] });
    await screen.findByText("Banner quảng cáo");

    await user.click(screen.getByRole("button", { name: "Xóa vĩnh viễn dự án Banner quảng cáo" }));
    expect(within(hopXacNhan()).getByText(/Banner quảng cáo/)).toBeInTheDocument();
    await user.click(within(hopXacNhan()).getByRole("button", { name: "Xóa vĩnh viễn" }));

    await waitFor(() => expect(deleteDeal).toHaveBeenCalledTimes(1));
    expect(vi.mocked(deleteDeal).mock.calls[0][0]).toBe("l2");
  });

  it("xóa dòng cuối của trang cuối thì lùi một trang, không đứng lại ở trang trống", async () => {
    const user = userEvent.setup();
    vi.mocked(getLostDeals).mockImplementation(async ({ page }) => ({
      deals: [page === 1 ? lostDeal({ id: "l0", projectType: "Dự án đầu" }) : lostDeal()],
      total: 11,
      totalPages: 2,
    }));
    renderDrawer({ counts: [0, 11] });
    await screen.findByText("Dự án đầu");
    await choOTimLang();
    await user.click(screen.getByLabelText("Trang sau"));
    await screen.findByText("Logo thương hiệu");
    await user.click(nutXoa());

    await user.click(within(hopXacNhan()).getByRole("button", { name: "Xóa vĩnh viễn" }));

    await waitFor(() =>
      expect(getLostDeals).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
    );
  });

  it("Esc khi đang hỏi xóa chỉ đóng hộp hỏi, KHÔNG đóng luôn cả kho phía sau", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer({ counts: [0, 1] });
    await screen.findByText("Logo thương hiệu");
    await user.click(nutXoa());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onClose).not.toHaveBeenCalled();

    // Hộp hỏi đã đóng thì Esc lại đóng kho như bình thường.
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText(/55 dự án trong kho/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByText(/55 dự án trong kho/));
    expect(onOpenArchive).toHaveBeenCalled();
  });
});
