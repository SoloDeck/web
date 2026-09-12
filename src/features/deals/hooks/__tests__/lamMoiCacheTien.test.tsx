import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Khoá lỗi: "tôi vừa ghi nhận khách trả tiền mà bảng Doanh thu vẫn số cũ".
 *
 * Bảng Doanh thu đọc bảy truy vấn đều bắt đầu bằng `["analytics"]`. Trước bản sửa, trong
 * 113 lời gọi `invalidateQueries` của cả repo KHÔNG cái nào chạm tới nhóm khoá đó — số
 * tiền trên màn hình đứng yên cho tới khi cache tự hết hạn.  #Huynh
 */

const mockCreate = vi.fn();
const mockRecordPayment = vi.fn();
const mockSend = vi.fn();

vi.mock("@/services/invoicesService", () => ({
  createInvoice: (...a: unknown[]) => mockCreate(...a),
  recordInvoicePayment: (...a: unknown[]) => mockRecordPayment(...a),
  sendInvoice: (...a: unknown[]) => mockSend(...a),
  updateInvoice: vi.fn(),
  voidInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  listInvoices: vi.fn(),
  listInvoicePayments: vi.fn(),
}));

import {
  useCreateInvoice,
  useRecordInvoicePayment,
  useSendInvoice,
} from "@/features/deals/hooks/useInvoices";

function dungBoc(qc: QueryClient) {
  return function Boc({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("mutation tiền phải làm mới nhóm khoá analytics", () => {
  let qc: QueryClient;
  let theoDoi: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    theoDoi = vi.spyOn(qc, "invalidateQueries");
  });

  function daLamMoiAnalytics() {
    return (theoDoi.mock.calls as unknown[][]).some(
      (call: unknown[]) =>
        JSON.stringify((call[0] as { queryKey?: unknown } | undefined)?.queryKey) ===
        '["analytics"]'
    );
  }

  it("tạo hoá đơn xong thì số liệu tiền được làm mới", async () => {
    mockCreate.mockResolvedValue({ id: "inv-1" });
    const { result } = renderHook(() => useCreateInvoice("deal-1"), { wrapper: dungBoc(qc) });

    result.current.mutate({ deal_id: "deal-1" } as never);

    await waitFor(() => expect(daLamMoiAnalytics()).toBe(true));
  });

  it("ghi nhận khách đã trả tiền thì số liệu tiền được làm mới", async () => {
    // Đây là ca nặng nhất: tiền vừa vào sổ mà bảng Doanh thu vẫn hiện số cũ.
    mockRecordPayment.mockResolvedValue({ id: "pay-1" });
    const { result } = renderHook(() => useRecordInvoicePayment("deal-1"), {
      wrapper: dungBoc(qc),
    });

    result.current.mutate({ invoiceId: "inv-1", payload: { amount: 5_000_000 } } as never);

    await waitFor(() => expect(daLamMoiAnalytics()).toBe(true));
  });

  it("gửi hoá đơn cho khách thì số liệu tiền được làm mới", async () => {
    mockSend.mockResolvedValue({ id: "inv-1" });
    const { result } = renderHook(() => useSendInvoice("deal-1"), { wrapper: dungBoc(qc) });

    result.current.mutate("inv-1" as never);

    await waitFor(() => expect(daLamMoiAnalytics()).toBe(true));
  });
});
