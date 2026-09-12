import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Khoá lỗi: "mở deal cũ ra thì tab Hóa đơn TRỐNG TRƠN".
 *
 * Bản trước gọi `GET /invoices` trần — backend trả mặc định 20 hóa đơn mới nhất — rồi lọc
 * `deal_id` ngay trong trình duyệt. Freelancer nào có quá 20 hóa đơn thì hóa đơn của deal cũ
 * không bao giờ lọt vào trang đầu để mà lọc: dữ liệu còn nguyên trong CSDL, chỉ là màn hình
 * không thấy. Nay `deal_id` đi thẳng xuống câu truy vấn.  #Huynh
 */

const mockGet = vi.fn();
vi.mock("@/configs/axios", () => ({ default: { get: mockGet } }));

type Row = { id: string; deal_id: string };

function hoaDon(id: string, dealId: string): Row {
  return { id, deal_id: dealId };
}

/** Giả lập backend: xếp mới → cũ, có lọc `deal_id`, có phân trang, mặc định 20 bản ghi. */
function phucVuHoaDon(rows: Row[]) {
  mockGet.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url !== "/invoices") return { data: { data: [] } };

    const params = config?.params ?? {};
    const dealId = params.deal_id as string | undefined;
    const khop = dealId ? rows.filter((r) => r.deal_id === dealId) : rows;
    const page = Number(params.page ?? 1);
    const pageSize = Number(params.page_size ?? 20);
    const start = (page - 1) * pageSize;

    return {
      data: {
        data: khop.slice(start, start + pageSize),
        pagination: {
          total: khop.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(khop.length / pageSize) || 1,
        },
      },
    };
  });
}

function dungBoc(qc: QueryClient) {
  return function Boc({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("hóa đơn của một deal", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
  });

  it("lọc theo deal_id NGAY TRÊN SERVER, không lọc ở trình duyệt", async () => {
    phucVuHoaDon([hoaDon("inv-1", "deal-a"), hoaDon("inv-2", "deal-b")]);
    const { listInvoices } = await import("@/services/invoicesService");

    const ds = await listInvoices({ dealId: "deal-a" });

    expect(ds.map((i) => i.id)).toEqual(["inv-1"]);
    const [, config] = mockGet.mock.calls.find(([url]) => url === "/invoices")!;
    expect(config.params).toEqual(expect.objectContaining({ deal_id: "deal-a" }));
  });

  it("hóa đơn cũ bị 30 hóa đơn mới đẩy khỏi trang đầu vẫn phải hiện", async () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => hoaDon(`moi-${i + 1}`, `deal-khac-${i + 1}`)),
      hoaDon("inv-cu", "deal-cu"),
    ];
    phucVuHoaDon(rows);

    const { useDealInvoices } = await import("@/features/deals/hooks/useInvoices");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDealInvoices("deal-cu"), { wrapper: dungBoc(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((i) => i.id)).toEqual(["inv-cu"]);
  });

  it("deal có hơn 100 hóa đơn thì tải ĐỦ, không cắt ở trang đầu", async () => {
    phucVuHoaDon(Array.from({ length: 150 }, (_, i) => hoaDon(`inv-${i + 1}`, "deal-a")));
    const { listInvoices } = await import("@/services/invoicesService");

    const ds = await listInvoices({ dealId: "deal-a" });

    expect(ds).toHaveLength(150);
  });

  it("không truyền deal thì KHÔNG gửi deal_id rỗng lên server", async () => {
    phucVuHoaDon([hoaDon("inv-1", "deal-a")]);
    const { listInvoices } = await import("@/services/invoicesService");

    await listInvoices();

    const [, config] = mockGet.mock.calls.find(([url]) => url === "/invoices")!;
    expect(config.params.deal_id).toBeUndefined();
  });
});
