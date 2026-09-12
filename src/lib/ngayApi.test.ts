import { afterEach, describe, expect, it, vi } from "vitest";
import { homNayChoApi, ngayChoApi } from "./ngayApi";

/**
 * Khoá lỗi lệch múi giờ: `toISOString().slice(0, 10)` quy về UTC.
 *
 * Người dùng ở Việt Nam là UTC+7, nên từ 0h đến 7h sáng ngày UTC vẫn là hôm qua. Ghi nhận
 * khách trả tiền lúc 6h sáng thì vào sổ ngày hôm qua; hạn hoá đơn đề xuất cũng sớm một ngày.
 *
 * CÁCH VIẾT: mọi `Date` dưới đây dựng bằng `new Date(năm, tháng, ngày, …)` — tức theo giờ
 * ĐỊA PHƯƠNG của máy đang chạy — nên bài test đúng ở mọi múi giờ. Đừng đổi sang chuỗi có
 * offset cứng kiểu `"2026-09-13T00:24:00+07:00"`: ở máy lập trình viên (UTC+7) thì xanh,
 * còn trên CI của GitHub (chạy giờ UTC) thì `getDate()` trả ra ngày hôm trước và bài test
 * đỏ. Đó đúng là loại bẫy mà chính hàm này sinh ra để chữa.  #Huynh
 */
describe("ngayChoApi", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("trả đúng ngày theo lịch địa phương, kể cả lúc rạng sáng", () => {
    // 00:24 sáng — khung giờ mà cách cũ trả về ngày hôm trước ở mọi múi giờ dương.
    expect(ngayChoApi(new Date(2026, 8, 13, 0, 24))).toBe("2026-09-13");
  });

  it("rạng sáng đầu tháng thì không tụt về tháng trước", () => {
    // Ca đau nhất: lệch một ngày kéo theo lệch cả tháng trong báo cáo doanh thu.
    expect(ngayChoApi(new Date(2026, 9, 1, 0, 30))).toBe("2026-10-01");
  });

  it("rạng sáng đầu năm thì không tụt về năm trước", () => {
    expect(ngayChoApi(new Date(2027, 0, 1, 1, 0))).toBe("2027-01-01");
  });

  it("đệm số 0 cho ngày và tháng một chữ số", () => {
    expect(ngayChoApi(new Date(2026, 2, 5, 10, 0))).toBe("2026-03-05");
  });

  it("khác kết quả của cách cũ khi máy nằm ở múi giờ dương", () => {
    // Chỉ khẳng định khi máy chạy thật sự ở phía đông UTC (máy lập trình viên UTC+7).
    // Trên CI chạy giờ UTC thì hai cách trùng nhau và bài này tự bỏ qua phần so sánh —
    // như vậy vẫn ghi lại được BẢN CHẤT lỗi mà không làm CI đỏ oan.
    const rangSang = new Date(2026, 8, 13, 0, 24);
    const lechPhutSoVoiUTC = -rangSang.getTimezoneOffset();
    if (lechPhutSoVoiUTC > 24) {
      expect(rangSang.toISOString().slice(0, 10)).toBe("2026-09-12");
    }
    expect(ngayChoApi(rangSang)).toBe("2026-09-13");
  });

  it("homNayChoApi đọc theo đồng hồ địa phương", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 13, 0, 24));
    expect(homNayChoApi()).toBe("2026-09-13");
  });
});
