import { describe, expect, it } from "vitest";
import {
  friendlyToken,
  fromFriendly,
  previewParts,
  toFriendly,
} from "@/features/reminders/templateTokens";

/**
 * Ô soạn nội dung mẫu hiện chữ tiếng Việt trong ngoặc vuông thay cho `{client_name}`; lúc lưu đổi
 * ngược về dạng server. Hai chiều phải khớp nhau tuyệt đối, không thì lời nhắc gửi khách còn nguyên
 * chữ `[Tên dự án]` hoặc `{deal_title}`.
 */

const vars = [
  { token: "{client_name}", label: "Tên khách hàng" },
  { token: "{deal_title}", label: "Tên dự án" },
  { token: "{amount}", label: "Số tiền còn lại" },
];

const stored = 'Chào anh/chị {client_name},\n\nDự án "{deal_title}" còn {amount}. Cảm ơn {client_name}.';
const friendly =
  'Chào anh/chị [Tên khách hàng],\n\nDự án "[Tên dự án]" còn [Số tiền còn lại]. Cảm ơn [Tên khách hàng].';

describe("toFriendly / fromFriendly", () => {
  it("dạng server hiện thành chữ tiếng Việt, mọi lần xuất hiện đều đổi", () => {
    expect(toFriendly(stored, vars)).toBe(friendly);
    expect(toFriendly(stored, vars)).not.toMatch(/[{}]/);
  });

  it("đổi ngược về dạng server đúng y như bản gốc (đi một vòng không mất gì)", () => {
    expect(fromFriendly(toFriendly(stored, vars), vars)).toBe(stored);
    expect(fromFriendly(friendly, vars)).toBe(stored);
  });

  it("người dùng tự gõ: không phân biệt hoa thường, chịu khoảng trắng thừa trong ngoặc", () => {
    expect(fromFriendly("Chào [tên khách hàng] và [ TÊN DỰ ÁN ]", vars)).toBe(
      "Chào {client_name} và {deal_title}"
    );
  });

  it("ngoặc vuông không phải tên biến nào thì giữ nguyên là chữ thường", () => {
    expect(fromFriendly("Xem [phụ lục 1] và [Tên khách]", vars)).toBe(
      "Xem [phụ lục 1] và [Tên khách]"
    );
  });

  it("biến cũ viết bằng ngoặc nhọn vẫn dùng được và vẫn là biến", () => {
    expect(fromFriendly("Chào {client_name}", vars)).toBe("Chào {client_name}");
  });

  it("quy tắc không có biến nào thì không đụng vào chữ", () => {
    expect(toFriendly("Chào [bạn] {x}", [])).toBe("Chào [bạn] {x}");
    expect(fromFriendly("Chào [bạn] {x}", [])).toBe("Chào [bạn] {x}");
  });

  it("nhãn có ký tự đặc biệt của regex vẫn khớp đúng", () => {
    const special = [{ token: "{a}", label: "Số (tiền)+" }];
    expect(fromFriendly("Trả [Số (tiền)+] nhé", special)).toBe("Trả {a} nhé");
  });

  it("friendlyToken là chữ bọc trong ngoặc vuông", () => {
    expect(friendlyToken(vars[1])).toBe("[Tên dự án]");
  });
});

describe("previewParts", () => {
  it("điền thông tin mẫu và đánh dấu đúng đoạn nào là điền tự động", () => {
    const parts = previewParts("Chào {client_name}, dự án {deal_title}.", vars);

    expect(parts).toEqual([
      { text: "Chào " },
      { text: "Nguyễn Văn An", variable: "Tên khách hàng" },
      { text: ", dự án " },
      { text: "Website bán hàng", variable: "Tên dự án" },
      { text: "." },
    ]);
  });

  it("ghép các đoạn lại ra đúng câu khách sẽ đọc", () => {
    const text = previewParts(stored, vars)
      .map((part) => part.text)
      .join("");

    expect(text).toBe(
      'Chào anh/chị Nguyễn Văn An,\n\nDự án "Website bán hàng" còn 50.000.000 ₫. Cảm ơn Nguyễn Văn An.'
    );
  });

  it("biến không có thông tin mẫu thì hiện lại [Nhãn] để người dùng thấy, không mất chỗ", () => {
    const lon = [{ token: "{la_lung}", label: "Thứ lạ" }];
    expect(previewParts("A {la_lung} B", lon)).toEqual([
      { text: "A " },
      { text: "[Thứ lạ]" },
      { text: " B" },
    ]);
  });

  it("nội dung rỗng thì không có gì để xem; không có biến thì là một đoạn chữ", () => {
    expect(previewParts("", vars)).toEqual([]);
    expect(previewParts("Chào bạn", [])).toEqual([{ text: "Chào bạn" }]);
  });

  it("gõ sai tên trong ngoặc thì xem trước vẫn hiện nguyên ngoặc — nhìn là biết sai", () => {
    const text = previewParts(fromFriendly("Chào [Tên khach]", vars), vars)
      .map((part) => part.text)
      .join("");
    expect(text).toBe("Chào [Tên khach]");
  });

  it("ngoặc vuông lạ đứng ở ĐẦU câu cũng không bị nuốt mất", () => {
    expect(previewParts("[Tên khach] ơi {client_name}", vars)).toEqual([
      { text: "[Tên khach] ơi " },
      { text: "Nguyễn Văn An", variable: "Tên khách hàng" },
    ]);
  });
});
