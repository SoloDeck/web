import { describe, expect, it } from "vitest";

import { gmailComposeLink, zaloLink } from "./contact-links";

describe("zaloLink", () => {
  it("lọc bỏ mọi ký tự không phải chữ số", () => {
    // `zalo.me/<số>` chỉ nhận chữ số; số lưu trong DB hay có dấu cách và dấu chấm.
    expect(zaloLink("0352 016 349")).toBe("https://zalo.me/0352016349");
    expect(zaloLink("0352.016.349")).toBe("https://zalo.me/0352016349");
    expect(zaloLink("+84 352 016 349")).toBe("https://zalo.me/84352016349");
  });

  it("không có số thì trả null để giao diện khoá nút", () => {
    expect(zaloLink(null)).toBeNull();
    expect(zaloLink(undefined)).toBeNull();
    expect(zaloLink("")).toBeNull();
    expect(zaloLink("   ")).toBeNull();
    expect(zaloLink("không có")).toBeNull();
  });
});

/**
 * Cả bộ hàm này sinh ra vì `mailto:` IM LẶNG không làm gì trên máy không còn ứng dụng thư —
 * rất phổ biến sau khi Windows gỡ app Mail. Nên thứ phải khoá lại trước hết là: link KHÔNG
 * được là `mailto:`, và các ký tự đặc biệt trong tiêu đề/nội dung phải mã hoá đúng.
 */
describe("gmailComposeLink", () => {
  it("dựng link soạn thư Gmail, không phải mailto", () => {
    const url = gmailComposeLink({ to: "anh3phi@gmail.com" });

    expect(url).not.toBeNull();
    expect(url!.startsWith("https://mail.google.com/mail/")).toBe(true);
    expect(url).not.toContain("mailto:");
    expect(url).toContain("view=cm");
    expect(url).toContain("to=anh3phi%40gmail.com");
  });

  it("mã hoá tiêu đề và nội dung có dấu tiếng Việt", () => {
    const url = gmailComposeLink({
      to: "a@b.com",
      subject: "Về dự án Chụp ảnh & quay video",
      body: "Chào anh/chị,\nBên mình xin gửi báo giá.",
    });

    // Dấu & trong tiêu đề mà không mã hoá là cắt đứt query string.
    expect(url).toContain("su=");
    expect(url).toContain("body=");
    expect(url).not.toContain("& quay video");
    expect(decodeURIComponent(new URL(url!).searchParams.get("su")!)).toBe(
      "Về dự án Chụp ảnh & quay video"
    );
    expect(new URL(url!).searchParams.get("body")).toContain("Chào anh/chị");
  });

  it("bỏ qua tiêu đề và nội dung khi không truyền", () => {
    const url = new URL(gmailComposeLink({ to: "a@b.com" })!);

    expect(url.searchParams.has("su")).toBe(false);
    expect(url.searchParams.has("body")).toBe(false);
  });

  it("không có email thì trả null để giao diện khoá nút", () => {
    expect(gmailComposeLink({ to: null })).toBeNull();
    expect(gmailComposeLink({ to: undefined })).toBeNull();
    expect(gmailComposeLink({ to: "" })).toBeNull();
    expect(gmailComposeLink({ to: "   " })).toBeNull();
  });
});
