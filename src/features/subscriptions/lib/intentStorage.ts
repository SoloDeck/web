/**
 * `sessionStorage` không có TTL — nhớ một `intent` id để chờ MoMo đá về, mà người dùng bỏ
 * ngang (đóng tab MoMo, không huỷ cũng không trả tiền) thì id đó nằm mãi trong storage.
 * Backend không nhận IPN nên intent nằm mãi ở `pending`. Lần SAU mở lại trang — dù chẳng
 * bấm gì — vẫn đọc thấy id cũ và hiện "Đang xác nhận thanh toán với MoMo…" như thể vừa có
 * một giao dịch đang chờ.
 *
 * Hạn dùng để dọn KHÔNG phải một khoảng thời gian client tự đoán — đó chính là lỗi đã gặp:
 * client từng tự đặt 15 phút, trong khi backend cho phép checkout tới 30 phút (mở app MoMo,
 * nhập OTP, mạng chậm — `_CHECKOUT_TTL_MINUTES` bên `subscriptions/application/service.py`).
 * Một giao dịch chậm nhưng vẫn hợp lệ (16-29 phút) từng bị client tự "quên" trước khi quay
 * về, nên trang không poll, không hiện xác nhận, dù backend đã kích hoạt gói xong. Giờ dùng
 * đúng `expires_at` server trả về lúc tạo checkout làm mốc — client không tự đoán hạn riêng
 * tách khỏi server nữa.  #Huynh
 */

const STORAGE_KEY = "intent";

interface StoredIntent {
  id: string;
  /** ISO datetime — nguyên văn `expires_at` server trả lúc tạo checkout. */
  expiresAt: string;
}

export function rememberIntent(id: string, expiresAt: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, expiresAt } satisfies StoredIntent));
}

export function forgetIntent() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function readRememberedIntent(): string | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIntent>;
    if (typeof parsed.id !== "string" || typeof parsed.expiresAt !== "string") {
      // Bắt cả định dạng CŨ (`{id, ts}`, không có `expiresAt`) — không biết nó còn hiệu
      // lực hay đã bỏ dở từ rất lâu, nên coi như hết hạn luôn.
      forgetIntent();
      return null;
    }
    const expiry = Date.parse(parsed.expiresAt);
    if (Number.isNaN(expiry) || Date.now() >= expiry) {
      forgetIntent();
      return null;
    }
    return parsed.id;
  } catch {
    // Định dạng cũ hơn nữa (chuỗi id trần) hoặc dữ liệu hỏng.
    forgetIntent();
    return null;
  }
}
