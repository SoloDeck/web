import { describe, expect, it } from "vitest";
import {
  costItemsIssue,
  rescaleToTotal,
  splitEqually,
  type CostItem,
} from "@/features/deals/proposalHtml";

/**
 * Hạng mục chi phí mục 7.
 *
 * Lỗi thật đã thấy trên màn hình (30/07/2026): panel trái hiện 4 hạng mục 125tr mỗi dòng,
 * trong khi tờ báo giá bên cạnh in 200/150/75/75. Không phải mạng lag — panel LUÔN hiện chia
 * đều, còn backend giữ tỷ lệ của bộ định giá rồi co giãn theo giá chốt. Hai bên đều đúng theo
 * logic riêng, chỉ là không cùng một logic.
 *
 * Các hàm ở đây phải KHỚP TUYỆT ĐỐI với backend (`pdf_content._structured_pricing`) — panel
 * và tờ báo giá cùng một con số thì mới không mâu thuẫn.  #Huynh
 */

const item = (label: string, amount: number): CostItem => ({ label, amount });

describe("splitEqually", () => {
  it("chia đều và cộng ĐÚNG tổng, dòng cuối gánh phần lẻ", () => {
    const out = splitEqually(500_000_000, 4);
    expect(out).toEqual([125_000_000, 125_000_000, 125_000_000, 125_000_000]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(500_000_000);
  });

  it("số lẻ vẫn cộng đúng tổng — bảng không cộng ra tổng là thứ khách soi ra ngay", () => {
    const out = splitEqually(100_000_001, 3);
    expect(out.reduce((a, b) => a + b, 0)).toBe(100_000_001);
  });

  it("chưa có giá hoặc không có dòng nào thì không nổ", () => {
    expect(splitEqually(0, 3)).toEqual([0, 0, 0]);
    expect(splitEqually(1_000_000, 0)).toEqual([]);
  });
});

describe("rescaleToTotal", () => {
  it("GIỮ tỷ lệ giữa các hạng mục khi đổi tổng", () => {
    // Bộ định giá chia 200/150/75/75 cho tổng 500tr. Hạ giá còn 250tr thì mọi dòng giảm một
    // nửa — KHÔNG san phẳng thành 62.5tr × 4.
    const out = rescaleToTotal(
      [item("BE", 200_000_000), item("FE", 150_000_000), item("Design", 75_000_000), item("QA", 75_000_000)],
      250_000_000
    );
    expect(out.map((x) => x.amount)).toEqual([
      100_000_000, 75_000_000, 37_500_000, 37_500_000,
    ]);
    expect(out.reduce((a, b) => a + b.amount, 0)).toBe(250_000_000);
  });

  it("tổng không đổi thì giữ nguyên từng dòng", () => {
    const rows = [item("BE", 200_000_000), item("FE", 300_000_000)];
    expect(rescaleToTotal(rows, 500_000_000).map((x) => x.amount)).toEqual([
      200_000_000, 300_000_000,
    ]);
  });

  it("mọi dòng đều 0 thì chia đều — không còn tỷ lệ nào để giãn", () => {
    const out = rescaleToTotal([item("A", 0), item("B", 0)], 100_000_000);
    expect(out.map((x) => x.amount)).toEqual([50_000_000, 50_000_000]);
  });

  it("giữ nguyên nhãn", () => {
    const out = rescaleToTotal([item("Phát triển backend", 100)], 500);
    expect(out[0].label).toBe("Phát triển backend");
  });
});

describe("costItemsIssue", () => {
  it("khớp giá chào thì không có gì để nói", () => {
    expect(
      costItemsIssue([item("A", 300_000_000), item("B", 200_000_000)], 500_000_000)
    ).toBeNull();
  });

  it("thiếu thì nêu đúng số thiếu", () => {
    const issue = costItemsIssue([item("A", 300_000_000)], 500_000_000);
    expect(issue?.total).toBe(300_000_000);
    expect(issue?.message).toMatch(/thiếu/);
    expect(issue?.message).toMatch(/200\.000\.000/);
  });

  it("dư thì nêu đúng số dư", () => {
    const issue = costItemsIssue([item("A", 600_000_000)], 500_000_000);
    expect(issue?.message).toMatch(/dư/);
    expect(issue?.message).toMatch(/100\.000\.000/);
  });

  it("chưa chốt giá thì bỏ qua — chưa có gì để đối chiếu, cảnh báo là báo oan", () => {
    expect(costItemsIssue([item("A", 300_000_000)], 0)).toBeNull();
  });

  it("chưa có hạng mục nào cũng bỏ qua", () => {
    expect(costItemsIssue([], 500_000_000)).toBeNull();
  });
});
