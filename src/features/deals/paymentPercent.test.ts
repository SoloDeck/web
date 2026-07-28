import { describe, expect, it } from "vitest";
import { paymentPercentIssue, type PaymentMilestone } from "@/features/deals/proposalHtml";

/**
 * Tổng các đợt thanh toán phải bằng 100%.
 *
 * Lỗi thật đã thấy trên màn hình (27/07/2026): báo giá có ba đợt 50% + 50% + 30% = 130% vẫn
 * in ra bảng "8. Điều Khoản Thanh Toán" và vẫn gửi được cho khách. Luật này phải KHỚP TỪNG
 * CHỮ với guard bên backend (`ProposalsService.transition_status`, nhánh "sent") — hai nơi
 * hiểu khác nhau là nút bấm nói một đằng, server làm một nẻo.  #Huynh
 */

const m = (percent: number | null, label = "Đợt"): PaymentMilestone => ({ label, percent });

describe("paymentPercentIssue", () => {
  it("đúng 100% thì không có gì để nói", () => {
    expect(paymentPercentIssue([m(50), m(50)])).toBeNull();
    expect(paymentPercentIssue([m(30), m(40), m(30)])).toBeNull();
  });

  it("dư thì nêu đúng số dư", () => {
    const issue = paymentPercentIssue([m(50), m(50), m(30)]);
    expect(issue?.total).toBe(130);
    expect(issue?.message).toMatch(/130%/);
    expect(issue?.message).toMatch(/dư 30%/);
  });

  it("thiếu thì nêu đúng số thiếu", () => {
    const issue = paymentPercentIssue([m(50), m(20)]);
    expect(issue?.total).toBe(70);
    expect(issue?.message).toMatch(/thiếu 30%/);
  });

  it("lịch hỗn hợp (có đợt ghi số tiền) thì KHÔNG báo lỗi", () => {
    // Cộng % của một lịch nửa %, nửa tiền mặt là vô nghĩa — báo lỗi ở đây là báo oan.
    const milestones: PaymentMilestone[] = [
      { label: "Đặt cọc", percent: 50 },
      { label: "Phần còn lại", amount: "2.500.000 ₫" },
    ];
    expect(paymentPercentIssue(milestones)).toBeNull();
  });

  it("không có đợt nào thì bỏ qua", () => {
    // Báo giá cũ chưa có mốc cấu trúc — backend rơi về lịch chuẩn 50/50 lúc sinh task.
    expect(paymentPercentIssue([])).toBeNull();
    expect(paymentPercentIssue(undefined)).toBeNull();
  });
});
