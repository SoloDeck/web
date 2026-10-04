import { describe, expect, it } from "vitest";
import { foldVietnamese, matchesSearch } from "@/features/admin/textSearch";

/**
 * Ô tìm mẫu theo tên: người dùng hay gõ không dấu ("lap trinh") để tìm tên có dấu ("Lập trình").
 */

describe("foldVietnamese", () => {
  it("bỏ dấu và hạ chữ thường", () => {
    expect(foldVietnamese("Lập Trình Phần Mềm")).toBe("lap trinh phan mem");
  });

  it("chữ đ/Đ thành d", () => {
    expect(foldVietnamese("Thiết kế đồ họa")).toBe("thiet ke do hoa");
    expect(foldVietnamese("ĐỒ HỌA")).toBe("do hoa");
  });

  it("mọi nguyên âm có dấu thanh và dấu mũ/móc", () => {
    expect(foldVietnamese("ắằẳẵặ")).toBe("aaaaa");
    expect(foldVietnamese("âấầẩẫậ")).toBe("aaaaaa");
    expect(foldVietnamese("êếềểễệ")).toBe("eeeeee");
    expect(foldVietnamese("ôốồổỗộ")).toBe("oooooo");
    expect(foldVietnamese("ơớờởỡợ")).toBe("oooooo");
    expect(foldVietnamese("ưứừửữự")).toBe("uuuuuu");
    expect(foldVietnamese("ýỳỷỹỵ")).toBe("yyyyy");
  });

  it("gộp khoảng trắng thừa và cắt hai đầu", () => {
    expect(foldVietnamese("  Báo   giá \t UI/UX  ")).toBe("bao gia ui/ux");
  });

  it("chuỗi rỗng giữ rỗng", () => {
    expect(foldVietnamese("")).toBe("");
    expect(foldVietnamese("   ")).toBe("");
  });
});

describe("matchesSearch", () => {
  it("gõ không dấu vẫn khớp tên có dấu", () => {
    expect(matchesSearch("Báo giá Lập trình phần mềm", "lap trinh")).toBe(true);
  });

  it("gõ có dấu khớp tên có dấu, không phân biệt hoa thường", () => {
    expect(matchesSearch("Báo giá Lập trình phần mềm", "LẬP TRÌNH")).toBe(true);
  });

  it("khớp ở giữa tên, không chỉ ở đầu", () => {
    expect(matchesSearch("Hợp đồng Thiết kế UI/UX", "ui/ux")).toBe(true);
    expect(matchesSearch("Hợp đồng Thiết kế UI/UX", "thiet ke")).toBe(true);
  });

  it("không khớp thì false", () => {
    expect(matchesSearch("Báo giá Lập trình phần mềm", "nhiếp ảnh")).toBe(false);
  });

  it("ô tìm trống hoặc toàn khoảng trắng thì khớp tất cả", () => {
    expect(matchesSearch("Bất kỳ", "")).toBe(true);
    expect(matchesSearch("Bất kỳ", "   ")).toBe(true);
  });

  it("khoảng trắng thừa giữa các từ khi gõ không làm trượt", () => {
    expect(matchesSearch("Báo giá Lập trình", "lap   trinh")).toBe(true);
  });

  it("'đ' khớp với 'd' ở hai chiều", () => {
    expect(matchesSearch("Thiết kế đồ họa", "do hoa")).toBe(true);
    expect(matchesSearch("Thiết kế do hoa", "đồ họa")).toBe(true);
  });
});
