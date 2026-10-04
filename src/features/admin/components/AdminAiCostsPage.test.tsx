import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAiCostsPage } from "@/features/admin/components/AdminDashboard";
import { useAiCosts } from "@/features/admin/hooks/useAdmin";
import type { AdminAiCost } from "@/services/adminService";

vi.mock("@/features/admin/hooks/useAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/admin/hooks/useAdmin")>()),
  useAiCosts: vi.fn(),
}));

/**
 * Trang Chi phí AI: tìm theo tên/email người dùng, lọc theo tính năng, phân trang — tất cả làm ở
 * MÁY CHỦ. Trước đây trang chỉ tải đúng 50 dòng đầu, không có ô tìm hay bộ lọc nên từ dòng 51 trở đi
 * vô hình, và càng dùng lâu càng không tìm được ai.
 */

function dong(over: Partial<AdminAiCost> = {}): AdminAiCost {
  return {
    id: "r1",
    user_id: "u1",
    user_email: "an@example.com",
    user_full_name: "An Nguyen",
    ai_module: "lead_qualifier",
    model_used: "gemini-2.5-flash",
    input_tokens: 1000,
    output_tokens: 500,
    estimated_cost_usd: "0.003274",
    status: "completed",
    occurred_at: "2026-10-03T12:21:00Z",
    ...over,
  };
}

function trang(over: { rows?: AdminAiCost[]; total?: number; isError?: boolean } = {}) {
  const rows = over.rows ?? [dong()];
  vi.mocked(useAiCosts).mockReturnValue({
    data: {
      data: rows,
      total: over.total ?? rows.length,
      page: 1,
      page_size: 20,
      totals: { input_tokens: 602_296, output_tokens: 126_946, estimated_cost_usd: "0.2005" },
    },
    isLoading: false,
    isError: over.isError ?? false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAiCosts>);
}

const boLocGanNhat = () => vi.mocked(useAiCosts).mock.calls.at(-1)?.[0];
const oTim = () => screen.getByPlaceholderText("Tìm theo tên hoặc email người dùng");
const oTinhNang = () => screen.getByRole("combobox", { name: "Lọc tính năng" });

beforeEach(() => {
  vi.clearAllMocks();
  trang();
});

describe("<AdminAiCostsPage /> — dữ liệu", () => {
  it("hiện từng lượt gọi, kèm tổng token và chi phí lấy từ máy chủ", () => {
    render(<AdminAiCostsPage />);

    expect(screen.getByText("an@example.com")).toBeInTheDocument();
    expect(screen.getByText("Chấm điểm deal")).toBeInTheDocument();
    expect(screen.getByText("602.296")).toBeInTheDocument();
    expect(screen.getByText("126.946")).toBeInTheDocument();
    expect(screen.getByText("$0.2005")).toBeInTheDocument();
  });

  it("lần đầu hỏi máy chủ trang 1, 20 dòng, chưa lọc gì", () => {
    render(<AdminAiCostsPage />);

    expect(boLocGanNhat()).toEqual({ page: 1, page_size: 20 });
  });

  it("lỗi tải thì báo lỗi và cho thử lại, không bày bảng trống", () => {
    trang({ isError: true });
    render(<AdminAiCostsPage />);

    expect(screen.queryByPlaceholderText("Tìm theo tên hoặc email người dùng")).toBeNull();
    expect(screen.getByRole("button", { name: /làm mới|thử lại/i })).toBeInTheDocument();
  });
});

describe("<AdminAiCostsPage /> — phân trang", () => {
  it("báo đang xem dòng mấy trên tổng bao nhiêu và có thanh chuyển trang", () => {
    trang({ rows: Array.from({ length: 20 }, (_, i) => dong({ id: `r${i}` })), total: 45 });
    render(<AdminAiCostsPage />);

    expect(screen.getByText("1-20 / 45 kết quả")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 1-20 trong 45 lượt gọi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang 3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trang 4" })).toBeNull();
  });

  it("bấm sang trang 2 thì hỏi máy chủ trang 2", async () => {
    trang({ rows: Array.from({ length: 20 }, (_, i) => dong({ id: `r${i}` })), total: 45 });
    render(<AdminAiCostsPage />);

    await userEvent.click(screen.getByRole("button", { name: "Trang 2" }));

    expect(boLocGanNhat()).toEqual({ page: 2, page_size: 20 });
  });

  it("một trang đủ chứa hết thì vẫn có thanh nhưng không có trang 2", () => {
    trang({ total: 1 });
    render(<AdminAiCostsPage />);

    expect(screen.getByText("Hiển thị 1-1 trong 1 lượt gọi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trang 2" })).toBeNull();
  });
});

describe("<AdminAiCostsPage /> — tìm kiếm và lọc", () => {
  it("gõ tên thì hỏi máy chủ theo tên đó SAU KHI ngừng gõ, kèm về trang 1", async () => {
    trang({ rows: Array.from({ length: 20 }, (_, i) => dong({ id: `r${i}` })), total: 45 });
    render(<AdminAiCostsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Trang 2" }));

    await userEvent.type(oTim(), "  an  ");

    await waitFor(() =>
      expect(boLocGanNhat()).toEqual({ search: "an", page: 1, page_size: 20 })
    );
  });

  it("chưa ngừng gõ thì chưa gọi máy chủ — không bắn một request cho mỗi chữ", async () => {
    render(<AdminAiCostsPage />);
    vi.mocked(useAiCosts).mockClear();

    await userEvent.type(oTim(), "ngu");

    const lanGoi = vi.mocked(useAiCosts).mock.calls.map(([f]) => f?.search);
    expect(lanGoi.every((search) => search === undefined)).toBe(true);
  });

  it("chọn tính năng thì ô chọn ghi nhãn tiếng Việt (không ghi mã) và lọc theo tính năng đó", async () => {
    render(<AdminAiCostsPage />);
    expect(oTinhNang()).toHaveTextContent("Tất cả tính năng");

    await userEvent.click(oTinhNang());
    await userEvent.click(await screen.findByRole("option", { name: "Soạn báo giá" }));

    expect(oTinhNang()).toHaveTextContent("Soạn báo giá");
    expect(oTinhNang()).not.toHaveTextContent("proposal_generator");
    expect(boLocGanNhat()).toEqual({ ai_module: "proposal_generator", page: 1, page_size: 20 });
  });

  it("có đủ bốn tính năng AI để lọc", async () => {
    render(<AdminAiCostsPage />);

    await userEvent.click(oTinhNang());

    const mucs = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(mucs).toEqual([
      "Tất cả tính năng",
      "Chấm điểm deal",
      "Soạn báo giá",
      "Soạn hợp đồng",
      "Nhắc khách",
    ]);
  });

  it("đổi tính năng khi đang ở trang 3 thì về trang 1", async () => {
    trang({ rows: Array.from({ length: 20 }, (_, i) => dong({ id: `r${i}` })), total: 45 });
    render(<AdminAiCostsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Trang 3" }));
    expect(boLocGanNhat()?.page).toBe(3);

    await userEvent.click(oTinhNang());
    await userEvent.click(await screen.findByRole("option", { name: "Nhắc khách" }));

    expect(boLocGanNhat()).toEqual({ ai_module: "followup_generator", page: 1, page_size: 20 });
  });

  it("đang lọc thì thẻ 'Lượt gọi AI' ghi là khớp bộ lọc; không lọc thì ghi toàn hệ thống", async () => {
    render(<AdminAiCostsPage />);
    expect(screen.getByText("Toàn hệ thống")).toBeInTheDocument();

    await userEvent.click(oTinhNang());
    await userEvent.click(await screen.findByRole("option", { name: "Soạn hợp đồng" }));

    expect(screen.getByText("Khớp bộ lọc hiện tại")).toBeInTheDocument();
    expect(screen.queryByText("Toàn hệ thống")).toBeNull();
  });

  it("lọc mà không có dòng nào thì nói rõ là không khớp, kèm nút Xóa lọc đưa về như ban đầu", async () => {
    trang({ rows: [], total: 0 });
    render(<AdminAiCostsPage />);
    await userEvent.click(oTinhNang());
    await userEvent.click(await screen.findByRole("option", { name: "Nhắc khách" }));

    expect(screen.getByText("Không có lượt gọi AI nào khớp bộ lọc.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));

    expect(boLocGanNhat()).toEqual({ page: 1, page_size: 20 });
    expect(oTinhNang()).toHaveTextContent("Tất cả tính năng");
    expect(screen.queryByRole("button", { name: "Xóa lọc" })).toBeNull();
  });

  it("Xóa lọc cũng xóa luôn chữ trong ô tìm và quay về như ban đầu", async () => {
    render(<AdminAiCostsPage />);
    await userEvent.type(oTim(), "binh");
    await waitFor(() => expect(boLocGanNhat()?.search).toBe("binh"));

    await userEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));

    expect(oTim()).toHaveValue("");
    await waitFor(() => expect(boLocGanNhat()).toEqual({ page: 1, page_size: 20 }));
  });

  it("chưa lọc mà bảng rỗng thì nói là chưa có lượt gọi nào, không đổ lỗi cho bộ lọc", () => {
    trang({ rows: [], total: 0 });
    render(<AdminAiCostsPage />);

    expect(screen.getByText("Chưa có lượt gọi AI nào được ghi nhận.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa lọc" })).toBeNull();
  });
});
