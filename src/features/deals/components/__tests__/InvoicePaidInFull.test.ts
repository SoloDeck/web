import { describe, expect, it } from "vitest";
import { invoicePaidInFull } from "@/features/deals/components/DealDetailPage";
import type { InvoiceResponse } from "@/services/invoicesService";

/**
 * "Đã gửi hoá đơn" KHÁC "đã nhận tiền".
 *
 * Bản cũ gộp hai khái niệm này: gửi hoá đơn xong là web tự tick mốc thu tiền thành hoàn
 * thành. Mà backend quy ước task `done` = ĐÃ THU (`analytics/infrastructure/repository.py`:
 * `"collected": status == "done"`), nên ngay khi thư rời máy chủ, màn Doanh thu đã cộng
 * khoản đó vào "Đã thu" và trừ khỏi "Còn phải thu" — trong khi khách chưa chuyển một đồng.
 * Ghi nhận thanh toán thật thì lại KHÔNG đụng tới task, nên con số không bao giờ được sửa
 * lại cho đúng: freelancer nhìn "Còn phải thu: 0 đ" rồi thôi không đi đòi.
 *
 * Điều kiện tick giờ chỉ còn một: hoá đơn đã nhận đủ tiền.  #Huynh
 */

const invoice = (over: Partial<InvoiceResponse>) =>
  ({ total: 37_199_000, amount_paid: 0, ...over }) as InvoiceResponse;

describe("invoicePaidInFull", () => {
  it("mới gửi, chưa thu đồng nào → KHÔNG tick", () => {
    expect(invoicePaidInFull(invoice({ status: "sent" } as Partial<InvoiceResponse>))).toBe(false);
  });

  it("thu một phần → vẫn chưa xong, còn phải đi đòi", () => {
    expect(invoicePaidInFull(invoice({ amount_paid: 10_000_000 }))).toBe(false);
  });

  it("thu đủ → mới được tick", () => {
    expect(invoicePaidInFull(invoice({ amount_paid: 37_199_000 }))).toBe(true);
  });

  it("khách trả dư (làm tròn, phí chuyển khoản) vẫn tính là đủ", () => {
    expect(invoicePaidInFull(invoice({ amount_paid: 37_200_000 }))).toBe(true);
  });

  it("hoá đơn 0 đồng không tự coi là đã thu", () => {
    // Hạng mục chưa điền số tiền: 0 >= 0 là đúng về toán nhưng sai về nghiệp vụ — chưa có
    // khoản nào để thu thì cũng chưa có gì để tick.
    expect(invoicePaidInFull(invoice({ total: 0, amount_paid: 0 }))).toBe(false);
  });

  it("số về dạng chuỗi từ API cũng đọc đúng", () => {
    expect(
      invoicePaidInFull({ total: "37199000", amount_paid: "37199000" } as unknown as InvoiceResponse)
    ).toBe(true);
  });
});
