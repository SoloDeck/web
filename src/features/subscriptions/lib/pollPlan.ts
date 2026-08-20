import type { PaymentIntentResponse } from "@/services/subscriptionsService";

/**
 * Cổng chuyển hướng (momo, zalopay): người dùng **đã trả tiền xong rồi mới quay về**, nên
 * chờ ở đây chỉ là chờ cuộc đua giữa IPN và trình duyệt. Hai phút là quá đủ.
 */
export const REDIRECT_POLL_MS = 2 * 60_000;

/**
 * Trần cứng cho cổng chuyển khoản. Khớp `_CHECKOUT_TTL_MINUTES = 30` bên backend.
 *
 * Có trần riêng chứ không tin thẳng `expires_at` vì đó là dữ liệu từ dây: lệch múi giờ,
 * đồng hồ máy khách sai, hay một bản ghi hỏng đều có thể cho ra một mốc cách đây một năm
 * (dò dừng ngay) hoặc một năm nữa (dò mãi mãi).
 */
export const TRANSFER_POLL_CAP_MS = 30 * 60_000;

/** Cổng nào bắt người dùng NGỒI CHỜ trên trang thay vì rời đi rồi quay về. */
function isTransferProvider(provider: string | undefined): boolean {
  return provider === "sepay";
}

/**
 * Mốc dừng dò, dạng timestamp.
 *
 * VÌ SAO KHÔNG DÙNG CHUNG MỘT CON SỐ: hai phút đặt cho luồng MoMo, nơi tiền đã trả xong
 * từ trước. Chuyển khoản thì ngược hẳn — 30 phút đó là để người dùng mở app ngân hàng,
 * đăng nhập, nhập số, xác thực. Dừng ở phút thứ hai nghĩa là **gần như MỌI đơn SePay đều
 * kết thúc bằng màn "hết giờ" sai sự thật**, trong khi đơn vẫn còn sống 28 phút nữa.
 *
 * Chưa biết cổng (chưa có response đầu) thì lấy mốc ngắn làm sàn — response đầu về trong
 * dưới một giây nên chẳng bao giờ chạm tới, và đoán ngắn thì an toàn hơn đoán dài.  #Huynh
 */
export function pollDeadline(
  startedAt: number,
  intent?: Pick<PaymentIntentResponse, "provider" | "expires_at">
): number {
  if (!intent || !isTransferProvider(intent.provider)) {
    return startedAt + REDIRECT_POLL_MS;
  }

  const cap = startedAt + TRANSFER_POLL_CAP_MS;
  const expiry = Date.parse(intent.expires_at);
  if (Number.isNaN(expiry)) return cap;

  // Kẹp hai đầu: không bao giờ quá trần, cũng không ngắn hơn mốc của cổng chuyển hướng.
  return Math.min(Math.max(expiry, startedAt + REDIRECT_POLL_MS), cap);
}

/**
 * Nhịp dò thưa dần theo thời gian đã chờ.
 *
 * 3 giây suốt 30 phút là 600 lượt gọi cho MỘT đơn. Thưa dần còn khoảng 220, mà vẫn giữ
 * được phản hồi nhanh ở phút đầu — đúng lúc người dùng đang nhìn màn hình chờ.
 */
export function pollIntervalMs(elapsedMs: number): number {
  if (elapsedMs < 60_000) return 3_000;
  if (elapsedMs < 5 * 60_000) return 5_000;
  return 10_000;
}
