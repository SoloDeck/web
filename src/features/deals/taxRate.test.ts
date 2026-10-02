import { describe, expect, it } from "vitest";
import { formatTaxRatePercent, parseTaxRatePercent } from "./taxRate";

describe("parseTaxRatePercent", () => {
  it("giữ dấu thập phân dù gõ phẩy hay chấm — lỗi cũ: '8,5' thành 85%", () => {
    expect(parseTaxRatePercent("8,5")).toBe(0.085);
    expect(parseTaxRatePercent("8.5")).toBe(0.085);
    expect(parseTaxRatePercent("10")).toBe(0.1);
  });

  it("bỏ qua khoảng trắng và dấu %", () => {
    expect(parseTaxRatePercent(" 10 % ")).toBe(0.1);
  });

  it("ô trống là 0%", () => {
    expect(parseTaxRatePercent("")).toBe(0);
  });

  it("chữ lạ, số âm, hay quá 100% thì trả null để nơi gọi báo lỗi", () => {
    expect(parseTaxRatePercent("mười")).toBeNull();
    expect(parseTaxRatePercent("-5")).toBeNull();
    expect(parseTaxRatePercent("150")).toBeNull();
    expect(parseTaxRatePercent("8,5,1")).toBeNull();
  });

  it("làm tròn tới 2 chữ số phần trăm — đúng độ chính xác cột Numeric(5,4)", () => {
    expect(parseTaxRatePercent("8,256")).toBe(0.0826);
  });
});

describe("formatTaxRatePercent", () => {
  it("không lộ đuôi dấu phẩy động — lỗi cũ: 7% nạp lại thành '7.000000000000001'", () => {
    for (const percent of [7, 14, 28, 29, 55, 56, 57, 58]) {
      expect(formatTaxRatePercent(percent / 100)).toBe(String(percent));
    }
  });

  it("đọc được chuỗi Decimal backend trả về", () => {
    expect(formatTaxRatePercent("0.0850")).toBe("8,5");
    expect(formatTaxRatePercent("0.0000")).toBe("0");
  });

  it("đi một vòng ghi → đọc ra đúng con số ban đầu", () => {
    for (const typed of ["0", "5", "8,5", "10", "12,75"]) {
      expect(formatTaxRatePercent(parseTaxRatePercent(typed))).toBe(typed);
    }
  });
});
