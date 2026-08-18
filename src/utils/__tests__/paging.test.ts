import { describe, expect, it } from "vitest";
import { clampPage, pageCount, pageRangeLabel, pageSlice } from "@/utils/paging";

/**
 * Phân trang phía trình duyệt.
 *
 * Cái bẫy duy nhất nhưng chắc chắn gặp: người dùng ở trang 3, gõ vào ô tìm kiếm cho ra 2 kết
 * quả — trang 3 không còn tồn tại và màn hình TRẮNG TRƠN, trông y như mất dữ liệu.  #Huynh
 */
describe("paging", () => {
  const items = Array.from({ length: 12 }, (_, i) => i + 1);

  it("cắt đúng lát của trang", () => {
    expect(pageSlice(items, 1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageSlice(items, 2, 5)).toEqual([6, 7, 8, 9, 10]);
    expect(pageSlice(items, 3, 5)).toEqual([11, 12]);
  });

  it("TRANG LỐ thì về trang cuối, KHÔNG trả mảng rỗng", () => {
    // Đây là bài quan trọng nhất của cả file.
    expect(pageSlice(items, 99, 5)).toEqual([11, 12]);
    expect(pageSlice([1, 2], 3, 5)).toEqual([1, 2]);
  });

  it("trang lố về trang CUỐI chứ không về trang 1", () => {
    // Người đang xem cuối danh sách thì giữ họ ở gần đó.
    expect(clampPage(99, 12, 5)).toBe(3);
  });

  it("trang âm hoặc rác thì về 1", () => {
    expect(clampPage(0, 12, 5)).toBe(1);
    expect(clampPage(-4, 12, 5)).toBe(1);
    expect(clampPage(NaN, 12, 5)).toBe(1);
  });

  it("danh sách rỗng vẫn là trang 1/1, không phải 1/0", () => {
    expect(pageCount(0, 5)).toBe(1);
    expect(pageSlice([], 1, 5)).toEqual([]);
  });

  it("chia hết thì không đẻ thêm trang trống", () => {
    expect(pageCount(10, 5)).toBe(2);
    expect(pageCount(11, 5)).toBe(3);
  });

  it("nhãn nói rõ đang ở đâu trong tổng thể", () => {
    expect(pageRangeLabel(1, 12, 5)).toBe("1–5 / 12");
    expect(pageRangeLabel(3, 12, 5)).toBe("11–12 / 12");
    expect(pageRangeLabel(1, 0, 5)).toBe("0");
  });

  it("nhãn của trang chỉ có một mục không ghi khoảng", () => {
    expect(pageRangeLabel(3, 11, 5)).toBe("11 / 11");
  });
});
