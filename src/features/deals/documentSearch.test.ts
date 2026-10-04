import { describe, expect, it } from "vitest";
import { matchesDocumentSearch, normalizeSearchText } from "@/features/deals/documentSearch";

describe("normalizeSearchText", () => {
  it("bỏ dấu tiếng Việt, đ → d, chữ thường, gộp khoảng trắng", () => {
    expect(normalizeSearchText("  Hợp  ĐỒNG   Dịch vụ ")).toBe("hop dong dich vu");
    expect(normalizeSearchText("Đặt cọc")).toBe("dat coc");
  });
});

describe("matchesDocumentSearch", () => {
  const fields = ["Thanh toán đợt 2", "INV-20261003-AB12", "hóa đơn", "Bản nháp", "16/10/2026", "521.900.000 ₫"];

  it("ô tìm trống thì khớp mọi hàng", () => {
    expect(matchesDocumentSearch("", fields)).toBe(true);
    expect(matchesDocumentSearch("   ", fields)).toBe(true);
  });

  it("tìm không dấu vẫn ra, không phân biệt hoa thường", () => {
    expect(matchesDocumentSearch("thanh toan dot 2", fields)).toBe(true);
    expect(matchesDocumentSearch("BAN NHAP", fields)).toBe(true);
  });

  it("tìm theo mã INV, ngày, số tiền", () => {
    expect(matchesDocumentSearch("inv-20261003", fields)).toBe(true);
    expect(matchesDocumentSearch("16/10/2026", fields)).toBe(true);
    expect(matchesDocumentSearch("521.900.000", fields)).toBe(true);
  });

  it("nhiều chữ thì chữ nào cũng phải có mặt (không cần liền nhau)", () => {
    expect(matchesDocumentSearch("hoa don 2", fields)).toBe(true);
    expect(matchesDocumentSearch("nhap 16/10", fields)).toBe(true);
    expect(matchesDocumentSearch("hoa don xyz", fields)).toBe(false);
  });

  it("không khớp thì false; bỏ qua trường rỗng/null", () => {
    expect(matchesDocumentSearch("khong co", fields)).toBe(false);
    expect(matchesDocumentSearch("abc", [null, undefined, "", "abc"])).toBe(true);
    expect(matchesDocumentSearch("abc", [null, undefined, ""])).toBe(false);
  });
});
