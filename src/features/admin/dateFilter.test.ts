import { describe, expect, it } from "vitest";
import { isoToDate, isoToText, textToIso } from "@/features/admin/dateFilter";

/**
 * Bộ lọc giữ ngày dạng ISO (`YYYY-MM-DD`, thứ gửi lên máy chủ), còn người dùng gõ/đọc ngày/tháng/năm.
 * Hai chiều chuyển phải khớp nhau và không được nhận những ngày không có thật.
 */

describe("isoToText", () => {
  it("đổi ISO sang ngày/tháng/năm", () => {
    expect(isoToText("2026-10-05")).toBe("05/10/2026");
  });

  it("chuỗi rỗng (không lọc) → ô trống", () => {
    expect(isoToText("")).toBe("");
  });

  it("chuỗi không phải ISO → ô trống, không ném lỗi", () => {
    expect(isoToText("05/10/2026")).toBe("");
    expect(isoToText("2026-1-5")).toBe("");
    expect(isoToText("abc")).toBe("");
  });
});

describe("textToIso", () => {
  it("đổi ngày/tháng/năm sang ISO", () => {
    expect(textToIso("05/10/2026")).toBe("2026-10-05");
  });

  it("chấp nhận ngày/tháng gõ thiếu số 0 và tự đệm lại", () => {
    expect(textToIso("5/1/2026")).toBe("2026-01-05");
  });

  it("bỏ khoảng trắng hai đầu", () => {
    expect(textToIso("  05/10/2026 ")).toBe("2026-10-05");
  });

  it("ngày đầu tháng và cuối tháng đều hợp lệ", () => {
    expect(textToIso("01/01/2026")).toBe("2026-01-01");
    expect(textToIso("31/12/2026")).toBe("2026-12-31");
  });

  it("ngày không có thật → null", () => {
    expect(textToIso("31/02/2026")).toBeNull();
    expect(textToIso("30/02/2026")).toBeNull();
    expect(textToIso("31/04/2026")).toBeNull();
    expect(textToIso("00/10/2026")).toBeNull();
    expect(textToIso("10/00/2026")).toBeNull();
    expect(textToIso("10/13/2026")).toBeNull();
  });

  it("29/02 chỉ hợp lệ ở năm nhuận", () => {
    expect(textToIso("29/02/2028")).toBe("2028-02-29");
    expect(textToIso("29/02/2026")).toBeNull();
  });

  it("gõ dở dang → null (chưa đổi bộ lọc)", () => {
    expect(textToIso("")).toBeNull();
    expect(textToIso("05")).toBeNull();
    expect(textToIso("05/10")).toBeNull();
    expect(textToIso("05/10/20")).toBeNull();
    expect(textToIso("05/10/202")).toBeNull();
  });

  it("năm quá cũ (0050) không bị JS đổi thành 1950 rồi nhận bừa", () => {
    expect(textToIso("05/10/0050")).toBeNull();
  });

  it("năm 5 chữ số hoặc dấu phân cách khác → null", () => {
    expect(textToIso("05/10/20261")).toBeNull();
    expect(textToIso("05-10-2026")).toBeNull();
    expect(textToIso("2026/10/05")).toBeNull();
  });

  it("đi một vòng ISO → chữ → ISO giữ nguyên", () => {
    for (const iso of ["2026-01-01", "2026-10-05", "2028-02-29", "2026-12-31"]) {
      expect(textToIso(isoToText(iso))).toBe(iso);
    }
  });
});

describe("isoToDate", () => {
  it("ISO → ngày theo giờ địa phương (0h), không lệch ngày vì múi giờ", () => {
    const d = isoToDate("2026-10-05");

    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(9);
    expect(d?.getDate()).toBe(5);
    expect(d?.getHours()).toBe(0);
  });

  it("chuỗi rỗng → undefined (lịch không đánh dấu ngày nào)", () => {
    expect(isoToDate("")).toBeUndefined();
  });
});
