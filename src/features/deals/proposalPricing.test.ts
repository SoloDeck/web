import { describe, expect, it } from "vitest";
import { backendContentToHtml, type BackendProposalContent } from "@/features/deals/proposalHtml";
import type { Deal } from "@/features/deals/types";

/**
 * Bảng hạng mục phải CỘNG RA ĐÚNG tổng báo giá.
 *
 * Lỗi thật đã gặp trên màn hình: 22.000.000 + 16.500.000 + 16.500.000 = 55 triệu, nhưng
 * dòng "Tổng báo giá" ghi 49 triệu. Nguyên nhân: bảng hạng mục và tổng tiền lấy từ hai
 * nguồn khác nhau. Khách soi ra ngay, và mất uy tín cả bản báo giá.  #Huynh
 */

const deal = {
  id: "d1",
  client: "KH 682d",
  contact: "kh@test.com",
  projectType: "Website bán hàng",
  notes: "",
  value: 0,
} as unknown as Deal;

function makeContent(overrides: Partial<BackendProposalContent> = {}): BackendProposalContent {
  return {
    project_overview: "Tóm tắt",
    scope_of_work: ["A"],
    deliverables: ["B"],
    timeline: "Thống nhất sau",
    pricing: "",
    payment_terms: "Thống nhất sau",
    pricing_detail: {
      anchor: { value: 50_000_000, confidence: "low", source: "AI ước lượng", sample_size: 0 },
      factors: [],
      suggested: 49_000_000,
      range_min: 34_500_000,
      range_max: 63_500_000,
      line_items: [
        { label: "Xây dựng website bán hàng", weight_percent: 40, amount: 19_600_000 },
        { label: "Tích hợp giỏ hàng", weight_percent: 30, amount: 14_700_000 },
        { label: "Tích hợp thanh toán", weight_percent: 30, amount: 14_700_000 },
      ],
      warnings: [],
    },
    ...overrides,
  };
}

/** Bóc mọi số tiền trong HTML ra để cộng lại. */
function moneyIn(html: string): number[] {
  return [...html.matchAll(/([\d.]+)\s*₫/g)].map((m) => Number(m[1].replace(/\./g, "")));
}

describe("Bảng hạng mục trong bản báo giá", () => {
  it("cộng ra ĐÚNG tổng khi chưa chốt giá (dùng giá đề xuất)", () => {
    const html = backendContentToHtml(makeContent(), deal);
    const amounts = moneyIn(html);
    const total = amounts[amounts.length - 1];

    expect(total).toBe(49_000_000);
    expect(amounts.slice(0, -1).reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("cộng ra ĐÚNG tổng sau khi freelancer chốt giá KHÁC giá đề xuất", () => {
    // Đây chính là kịch bản làm vỡ bảng: đề xuất 49tr nhưng freelancer chốt 55tr. Hạng mục
    // phải chia lại theo 55tr, không được giữ nguyên số cũ.
    const content = makeContent();
    content.pricing_detail!.final_price = 55_000_000;

    const html = backendContentToHtml(content, deal);
    const amounts = moneyIn(html);
    const total = amounts[amounts.length - 1];

    expect(total).toBe(55_000_000);
    expect(amounts.slice(0, -1).reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("cộng ra ĐÚNG tổng với giá lẻ (đồng lẻ dồn vào dòng cuối)", () => {
    const content = makeContent();
    content.pricing_detail!.final_price = 41_333_333;

    const html = backendContentToHtml(content, deal);
    const amounts = moneyIn(html);
    const total = amounts[amounts.length - 1];

    expect(total).toBe(41_333_333);
    expect(amounts.slice(0, -1).reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("KHÔNG hiện 0 ₫ khi freelancer chưa nhập ô 'Giá trị dự kiến'", () => {
    // deal.value = 0. Bản cũ lấy `deal.value` làm tổng -> "Tổng báo giá: 0 ₫".
    const html = backendContentToHtml(makeContent(), deal);
    expect(html).not.toMatch(/Tổng báo giá[\s\S]{0,120}?>0\s*₫/);
    expect(moneyIn(html).at(-1)).toBe(49_000_000);
  });
});
