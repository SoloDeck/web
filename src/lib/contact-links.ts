/**
 * Đường dẫn liên hệ khách hàng — Zalo và email.
 *
 * Gom về một chỗ vì cả thẻ Khách hàng (màn Chi tiết deal) lẫn hộp "Nhắn theo dõi" đều cần,
 * và trước đây mỗi nơi tự ghép chuỗi một kiểu.
 */

/** Gmail soạn thư — KHÔNG dùng `mailto:`, lý do ở `gmailComposeLink`. */
const GMAIL_COMPOSE = "https://mail.google.com/mail/";

/**
 * Mở khung chat Zalo với đúng số điện thoại.
 *
 * `zalo.me/<số>` chỉ nhận chuỗi CHỮ SỐ — số lưu trong DB có thể kèm dấu cách, dấu chấm hoặc
 * tiền tố +84, để nguyên là link hỏng.
 *
 * Đây chỉ là đường dẫn mở ứng dụng, KHÔNG phải tích hợp Zalo OA: không gọi API, không cần
 * tài khoản OA, không tốn lượt.
 */
export function zaloLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://zalo.me/${digits}` : null;
}

/**
 * Mở tab soạn thư Gmail với người nhận, tiêu đề, nội dung điền sẵn.
 *
 * VÌ SAO KHÔNG DÙNG `mailto:` — đây là lỗi đã đo được, không phải suy đoán.
 *
 * Microsoft khai tử ứng dụng Mail của Windows cuối 2024, nhưng liên kết `mailto:` trong
 * registry vẫn trỏ tới nó. Kiểm tra trên máy thật:
 *
 *     mailto → ProgId AppXydk58wgm44se4b399557yyyj1w7mbmvd
 *     ProgId đó trong HKEY_CLASSES_ROOT: không tồn tại
 *
 * Windows đi gọi một ứng dụng đã bị gỡ → KHÔNG có gì xảy ra, cũng không báo lỗi. Người dùng
 * bấm nút rồi ngồi nhìn, tưởng sản phẩm hỏng. Mà phần lớn freelancer không bao giờ cài lại
 * ứng dụng thư — họ mở Gmail trên trình duyệt.
 *
 * Đánh đổi đã biết: cách này giả định người dùng xài Gmail. Đúng với đa số người dùng Việt,
 * và quan trọng hơn — nó KHÔNG BAO GIỜ im lặng thất bại như `mailto:`.  #Huynh
 */
export function gmailComposeLink({
  to,
  subject,
  body,
}: {
  to: string | null | undefined;
  subject?: string;
  body?: string;
}): string | null {
  if (!to?.trim()) return null;

  const params = new URLSearchParams({ view: "cm", fs: "1", to: to.trim() });
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);

  return `${GMAIL_COMPOSE}?${params.toString()}`;
}
