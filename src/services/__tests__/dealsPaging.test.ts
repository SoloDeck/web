import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bảng Kanban phải tải ĐỦ deal, không cắt im lặng ở 100.
 *
 * Lỗi thật đang có: backend chặn cứng `page_size <= 100`, còn frontend gọi đúng một lần với
 * `page_size: 100` và không hề phân trang. Deal thứ 101 trở đi biến mất khỏi bảng — không lỗi,
 * không cảnh báo, chỉ là không có ở đó. Freelancer làm nhiều dự án mất dữ liệu khỏi màn hình
 * TRƯỚC khi kịp thấy cột dài.  #Huynh
 */

const mockGet = vi.fn();
vi.mock("@/lib/axios", () => ({ default: { get: mockGet } }));
vi.mock("@/configs/axios", () => ({ default: { get: mockGet } }));

function dealRow(id: string) {
  return {
    id,
    client_id: "c1",
    title: `Deal ${id}`,
    stage: "new_lead",
    source: null,
    estimated_value: 1_000_000,
    actual_value: null,
    currency: "VND",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

/** Giả lập backend: `total` bản ghi, mỗi trang tối đa 100. */
function serveDeals(total: number) {
  mockGet.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === "/clients") return { data: { data: [] } };
    if (url === "/deals/intakes") return { data: { data: [] } };

    const page = Number(config?.params?.page ?? 1);
    const pageSize = Number(config?.params?.page_size ?? 100);
    const start = (page - 1) * pageSize;
    const rows = Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, i) =>
      dealRow(String(start + i + 1))
    );
    return {
      data: {
        data: rows,
        pagination: {
          total,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        },
      },
    };
  });
}

describe("tải deal cho bảng Kanban", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
  });

  it("dưới 100 deal thì chỉ gọi một trang", async () => {
    serveDeals(42);
    const { getDeals } = await import("@/services/dealsService");
    const deals = await getDeals();

    expect(deals).toHaveLength(42);
    const dealCalls = mockGet.mock.calls.filter(([url]) => url === "/deals");
    expect(dealCalls).toHaveLength(1);
  });

  it("150 deal thì tải ĐỦ 150, không dừng ở 100", async () => {
    serveDeals(150);
    const { getDeals } = await import("@/services/dealsService");
    const deals = await getDeals();

    expect(deals).toHaveLength(150);
  });

  it("luôn xin bảng KHÔNG kèm dự án đã lưu kho", async () => {
    serveDeals(10);
    const { getDeals } = await import("@/services/dealsService");
    await getDeals();

    const [, config] = mockGet.mock.calls.find(([url]) => url === "/deals")!;
    expect(config.params).toEqual(expect.objectContaining({ archived: false }));
  });

  it("hồ sơ khách hàng KHÔNG lọc kho — vẫn thấy đủ lịch sử hợp tác", async () => {
    // Chỗ dễ vỡ nhất: freelancer giữ dự án cũ chính là để nhớ khách.
    serveDeals(5);
    const { getDealsByClient } = await import("@/services/dealsService");
    await getDealsByClient("client-1");

    const [, config] = mockGet.mock.calls.find(([url]) => url === "/deals")!;
    expect(config.params.archived).toBeUndefined();
    expect(config.params.client_id).toBe("client-1");
  });

  it("vượt trần thì ĐÁNH DẤU đã cắt, không giấu", async () => {
    // Trần 10 trang để một tài khoản hỏng dữ liệu không kéo hàng trăm request. Nhưng cắt thì
    // phải nói ra — cả đợt này đi sửa đúng cái tật cắt im lặng.
    serveDeals(1500);
    const svc = await import("@/services/dealsService");
    const deals = await svc.getDeals();

    expect(deals).toHaveLength(1000);
    expect(svc.dealsTruncated).toBe(true);
  });
});
