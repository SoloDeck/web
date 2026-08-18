import { describe, expect, it } from "vitest";
import {
  buildInvoiceDraft,
  getInvoiceDisplayTitle,
  invoiceOrdinal,
} from "@/features/deals/invoiceComposer";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

/**
 * Tên và nội dung hóa đơn ở màn chi tiết deal.
 *
 * Hai lỗi thật, thấy cùng lúc trên một màn hình:
 *   1. Hàng trong tab Tài liệu ghi "Thanh toán đợt 1", bấm vào thì hộp thoại hiện "Thanh toán
 *      đợt 2" — cùng một chứng từ mà hai cái tên.
 *   2. Hộp thoại bày một đoạn "Nội dung gửi khách" cho hóa đơn ĐÃ GỬI mà vốn không có ghi
 *      chú nào; freelancer đối chiếu hộp thư của khách rồi tưởng hệ thống gửi thiếu.
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

const deal = { id: "d1", projectType: "Làm ứng dụng đặt lịch thăm khám", value: 37_199_000 } as Deal;
const client = { name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" };

describe("số thứ tự hóa đơn", () => {
  it("hàng trong danh sách và hộp thoại phải ra CÙNG một cái tên", () => {
    const list = [invoice({ id: "inv-1" })];
    const tenTrongDanhSach = getInvoiceDisplayTitle(list[0], 0);

    // Số kế tiếp (2) là thứ dành cho việc TẠO MỚI — mở hóa đơn đang có mà dùng nó là sai.
    const draft = buildInvoiceDraft(deal, client, "formal", invoiceOrdinal(list, list[0]), list[0]);

    expect(tenTrongDanhSach).toBe("Thanh toán đợt 1");
    expect(draft.title).toBe("Thanh toán đợt 1");
  });

  it("hóa đơn thứ hai vẫn ra đúng số của nó", () => {
    const list = [invoice({ id: "inv-1" }), invoice({ id: "inv-2" })];
    expect(invoiceOrdinal(list, list[1])).toBe(2);
    expect(getInvoiceDisplayTitle(list[1], 1)).toBe("Thanh toán đợt 2");
  });

  it("tên freelancer tự đặt thì tôn trọng, không đánh số đè", () => {
    const named = invoice({ notes: "Hóa đơn: Đợt cuối\n\nCảm ơn anh." });
    expect(getInvoiceDisplayTitle(named, 0)).toBe("Đợt cuối");
    expect(buildInvoiceDraft(deal, client, "formal", 1, named).title).toBe("Đợt cuối");
  });

  it("hóa đơn không nằm trong danh sách thì xếp cuối, không trả 0", () => {
    expect(invoiceOrdinal([], invoice())).toBe(1);
  });
});

describe("nội dung gửi khách", () => {
  it("hóa đơn ĐÃ GỬI mà không có ghi chú thì để TRỐNG, không bịa thư mẫu", () => {
    // Hóa đơn sinh từ mốc thu tiền đi thẳng, `notes` là NULL. Bày một đoạn thư mẫu ở đây là
    // cho freelancer xem thứ khách chưa bao giờ nhận được.
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "sent" }));
    expect(draft.notes).toBe("");
  });

  it("hóa đơn đã thanh toán cũng vậy", () => {
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "paid" }));
    expect(draft.notes).toBe("");
  });

  it("bản NHÁP thì vẫn soạn sẵn cho freelancer sửa — sửa xong lưu là nó thành thật", () => {
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "draft" }));
    expect(draft.notes).toContain("Kính gửi Hỏa Quốc huynh");
  });

  it("tạo hóa đơn mới cũng soạn sẵn", () => {
    expect(buildInvoiceDraft(deal, client, "friendly", 1).notes).toContain("Chào Hỏa Quốc huynh");
  });

  it("có ghi chú thật thì hiện đúng phần thân, bỏ dòng tiêu đề", () => {
    const draft = buildInvoiceDraft(
      deal,
      client,
      "formal",
      1,
      invoice({ status: "sent", notes: "Hóa đơn: Đợt 1\n\nCảm ơn anh đã hợp tác." })
    );
    expect(draft.notes).toBe("Cảm ơn anh đã hợp tác.");
  });
});
