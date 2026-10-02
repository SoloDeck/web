import { describe, expect, it } from "vitest";
import { parseDealSearch } from "./dealSearch";

describe("parseDealSearch", () => {
  it("đọc đủ ba tham số hợp lệ", () => {
    expect(parseDealSearch({ tab: "reminders", reminder: "r1", invoice: "i1" })).toEqual({
      tab: "reminders",
      reminder: "r1",
      invoice: "i1",
    });
  });

  it("tab lạ hoặc giá trị rỗng thì bỏ qua, không làm vỡ trang", () => {
    expect(parseDealSearch({ tab: "hack", invoice: "", reminder: 42 })).toEqual({
      tab: undefined,
      invoice: undefined,
      reminder: undefined,
    });
  });

  it("không có gì thì trả rỗng — link cũ /deals/<id> vẫn chạy", () => {
    expect(parseDealSearch({})).toEqual({ tab: undefined, invoice: undefined, reminder: undefined });
  });
});
