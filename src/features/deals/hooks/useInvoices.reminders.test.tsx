import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useRecordInvoicePayment,
  useSendInvoice,
  useVoidInvoice,
} from "@/features/deals/hooks/useInvoices";
import * as invoices from "@/services/invoicesService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/invoicesService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/invoicesService")>()),
  sendInvoice: vi.fn(),
  voidInvoice: vi.fn(),
  recordInvoicePayment: vi.fn(),
}));

/**
 * Gửi hóa đơn đặt một lời nhắc thanh toán ở backend; thu đủ hoặc hủy hóa đơn thì backend hủy nó.
 * Tab Nhắc nhở chỉ thấy thay đổi đó khi danh sách lời nhắc được làm mới — thiếu bước này thì lời
 * nhắc mới không hiện (hoặc vẫn "Đang chờ" cho hóa đơn đã thu) cho tới khi tải lại trang.
 */

const sentBase = { id: "inv-1", invoice_number: "INV-1", status: "sent" };
const sent = sentBase as never;

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

function invalidatedReminders(invalidate: ReturnType<typeof setup>["invalidate"]): boolean {
  return invalidate.mock.calls.some(
    ([filters]) => JSON.stringify((filters as { queryKey?: unknown }).queryKey) === '["reminders"]'
  );
}

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(invoices.sendInvoice).mockResolvedValue(sent);
  vi.mocked(invoices.voidInvoice).mockResolvedValue(sent);
  vi.mocked(invoices.recordInvoicePayment).mockResolvedValue(sent);
});

describe("hóa đơn đổi trạng thái thì tab Nhắc nhở phải được làm mới", () => {
  it("gửi hóa đơn: gọi API gửi rồi làm mới lời nhắc", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSendInvoice("d1"), { wrapper });

    await act(() => result.current.mutateAsync("inv-1"));

    expect(invoices.sendInvoice).toHaveBeenCalledWith("inv-1");
    expect(invalidatedReminders(invalidate)).toBe(true);
  });

  it("hủy hóa đơn làm mới lời nhắc", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useVoidInvoice("d1"), { wrapper });

    await act(() => result.current.mutateAsync("inv-1"));

    expect(invalidatedReminders(invalidate)).toBe(true);
  });

  it("ghi nhận thanh toán làm mới lời nhắc", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useRecordInvoicePayment("d1"), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        invoiceId: "inv-1",
        payload: { amount: 1, payment_date: "2026-10-03", payment_method: "bank_transfer" },
      })
    );

    expect(invalidatedReminders(invalidate)).toBe(true);
  });
});

/**
 * Thông báo sau khi gửi hóa đơn nằm trong hook gửi (không ở từng nơi gọi) nên mọi đường gửi nói
 * cùng một câu và câu đó phải KHỚP việc backend đã làm với lời nhắc — không hứa lịch nhắc khi
 * backend báo không đặt được.
 */
describe("gửi hóa đơn xong thì báo đúng việc đã làm với lời nhắc", () => {
  async function guiVaLayThongBao(payment_reminder: unknown): Promise<string> {
    vi.mocked(invoices.sendInvoice).mockResolvedValue({ ...sentBase, payment_reminder } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendInvoice("d1"), { wrapper });

    await act(() => result.current.mutateAsync("inv-1"));

    expect(toast.success).toHaveBeenCalledTimes(1);
    return vi.mocked(toast.success).mock.calls[0][0] as string;
  }

  it("lời nhắc đã lên lịch và đang chờ duyệt: nói trước mấy ngày, chỗ kiểm tra, và chờ duyệt", async () => {
    const text = await guiVaLayThongBao({
      scheduled: true,
      days_before_due: 3,
      requires_approval: true,
    });

    expect(text).toBe(
      'Đã gửi hóa đơn INV-1 cho khách. Sẽ tự động lên lịch nhắc trước 3 ngày so với hạn thanh toán, bạn có thể kiểm tra ở mục "Nhắc nhở". Lời nhắc chờ bạn duyệt trước khi gửi.'
    );
  });

  it("hạn thanh toán quá gần nên backend không đặt: báo thật lý do, không hứa lịch nhắc", async () => {
    const text = await guiVaLayThongBao({ scheduled: false, reason: "too_soon" });

    expect(text).toBe(
      "Đã gửi hóa đơn INV-1 cho khách. Hạn thanh toán còn quá gần nên chưa lên lịch nhắc tự động."
    );
  });

  it("backend không nói gì về lời nhắc thì chỉ báo đã gửi", async () => {
    expect(await guiVaLayThongBao(undefined)).toBe("Đã gửi hóa đơn INV-1 cho khách.");
  });

  it("gửi hỏng thì không báo thành công", async () => {
    vi.mocked(invoices.sendInvoice).mockRejectedValue(new Error("SMTP down"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendInvoice("d1"), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("inv-1")).rejects.toThrow("SMTP down");
    });

    expect(toast.success).not.toHaveBeenCalled();
  });
});
