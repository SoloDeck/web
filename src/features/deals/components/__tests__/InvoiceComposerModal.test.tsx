import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceComposerModal } from "@/features/deals/components/DealDetailPage";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Lỗi thật người dùng bắt được: hàng trong tab Tài liệu ghi "Thanh toán đợt 1", bấm vào thì
 * hộp thoại hiện "Thanh toán đợt 2".
 *
 * Nguyên nhân: hộp thoại nhận `suggestedInvoiceIndex` = "số của hóa đơn KẾ TIẾP" (tổng + 1),
 * con số vốn chỉ dành cho việc tạo mới, rồi dùng luôn nó làm tên cho hóa đơn đang mở.
 *
 * Bài ở đây kiểm ĐÚNG chỗ nối dây — `invoiceComposer.test.ts` chỉ kiểm các hàm thuần, nên
 * tháo dây ra nó vẫn xanh.
 */

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20260817-649C",
    status: "sent",
    subtotal: 37_199_000,
    total: 37_199_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: "2026-08-31",
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const deal = {
  id: "d1",
  projectType: "Làm ứng dụng đặt lịch thăm khám",
  value: 37_199_000,
} as Deal;

function renderModal(
  list: InvoiceResponse[],
  opened: InvoiceResponse | null,
  over: { mode?: "create" | "edit" | "view"; onSaveAndSend?: (id: string, p: never) => void } = {}
) {
  render(
    <InvoiceComposerModal
      mode={over.mode ?? "view"}
      deal={deal}
      // Đúng thứ trang chi tiết truyền vào: số của hóa đơn KẾ TIẾP.
      suggestedInvoiceIndex={list.length + 1}
      existingInvoices={list}
      client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
      invoice={opened}
      isLoading={false}
      onClose={vi.fn()}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onSaveAndSend={over.onSaveAndSend as never}
      onDelete={vi.fn()}
    />
  );
}

describe("InvoiceComposerModal", () => {
  it("mở hóa đơn đầu tiên thì tiêu đề là 'đợt 1', KHÔNG phải 'đợt 2'", () => {
    const list = [invoice({ id: "inv-1" })];
    renderModal(list, list[0]);

    expect(screen.getAllByText("Thanh toán đợt 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("Thanh toán đợt 2")).toBeNull();
  });

  it("mở hóa đơn thứ hai thì ra 'đợt 2'", () => {
    const list = [invoice({ id: "inv-1" }), invoice({ id: "inv-2" })];
    renderModal(list, list[1]);

    expect(screen.getAllByText("Thanh toán đợt 2").length).toBeGreaterThan(0);
  });

  it("hóa đơn đã gửi mà không kèm ghi chú thì NÓI THẲNG, không bày thư mẫu", () => {
    const list = [invoice({ id: "inv-1", status: "sent" })];
    renderModal(list, list[0]);

    expect(screen.getByText(/gửi đi không kèm nội dung riêng/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kính gửi Hỏa Quốc huynh/)).toBeNull();
  });

  it("nhãn nói rõ đây là nội dung ĐÃ gửi, không phải nội dung có thể gửi", () => {
    const list = [invoice({ id: "inv-1", status: "sent", notes: "Hóa đơn: Đợt 1\n\nCảm ơn anh." })];
    renderModal(list, list[0]);

    expect(screen.getByText(/đúng thứ khách nhận được/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cảm ơn anh.")).toBeInTheDocument();
  });
});

describe("xem lại trước khi gửi", () => {
  it("bản nháp có nút gửi, và nội dung được điền sẵn để đọc lại", () => {
    // Lỗi thật: bấm "Tạo & gửi hóa đơn" ở bảng việc là thư bay đi ngay, freelancer không đọc
    // được một chữ nào trong thứ mang tên mình gửi cho khách — nên thư tới nơi chỉ có số
    // tiền, không lời nhắn.
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByRole("button", { name: /lưu & gửi cho khách/i })).toBeInTheDocument();
    // Tên hóa đơn và lời nhắn điền sẵn — freelancer chỉ việc đọc lại rồi sửa.
    expect(screen.getByDisplayValue("Thanh toán đợt 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/)).toBeInTheDocument();
  });

  it("bấm gửi thì đưa ra ĐÚNG nội dung đang hiện trên màn hình", () => {
    const onSaveAndSend = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    fireEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
    const [invoiceId, payload] = onSaveAndSend.mock.calls[0];
    expect(invoiceId).toBe("inv-1");
    expect((payload as { notes: string }).notes).toContain("Kính gửi Hỏa Quốc huynh");
  });

  it("hóa đơn ĐÃ gửi thì không còn nút gửi nữa", () => {
    const list = [invoice({ id: "inv-1", status: "sent" })];
    renderModal(list, list[0], { onSaveAndSend: vi.fn() });
    expect(screen.queryByRole("button", { name: /lưu & gửi cho khách/i })).toBeNull();
  });
});
