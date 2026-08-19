/**
 * `sessionStorage` không có TTL — nhớ một `intent` id để chờ MoMo đá về, mà người dùng bỏ
 * ngang (đóng tab MoMo, không huỷ cũng không trả tiền) thì id đó nằm mãi trong storage.
 * Backend không nhận IPN nên intent nằm mãi ở `pending`. Lần SAU mở lại trang — dù chẳng
 * bấm gì — vẫn đọc thấy id cũ và hiện "Đang xác nhận thanh toán với MoMo…" như thể vừa có
 * một giao dịch đang chờ. Gắn thêm mốc thời gian lúc nhớ, hết hạn thì coi như không có gì
 * để mà chờ.  #Huynh
 */

const STORAGE_KEY = "intent";

/** Đủ dài cho một lượt sang MoMo rồi quay lại, đủ ngắn để không giả làm "đang chờ" mãi. */
const TTL_MS = 15 * 60 * 1000;

interface StoredIntent {
  id: string;
  ts: number;
}

export function rememberIntent(id: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, ts: Date.now() } satisfies StoredIntent));
}

export function forgetIntent() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function readRememberedIntent(): string | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIntent>;
    if (typeof parsed.id !== "string" || typeof parsed.ts !== "number") {
      forgetIntent();
      return null;
    }
    if (Date.now() - parsed.ts > TTL_MS) {
      forgetIntent();
      return null;
    }
    return parsed.id;
  } catch {
    // Định dạng cũ (chuỗi id trần, không mốc thời gian) hoặc dữ liệu hỏng — không biết nó
    // mới hay đã bỏ dở từ rất lâu, nên coi như hết hạn luôn.
    forgetIntent();
    return null;
  }
}
