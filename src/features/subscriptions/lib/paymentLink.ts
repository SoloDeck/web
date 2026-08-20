import type { PaymentIntentResponse, PaymentLink } from "@/services/subscriptionsService";

/**
 * Link này có điều hướng trình duyệt tới được không.
 *
 * HAI lớp chặn, mỗi lớp cho một ca hỏng THẬT:
 *
 * 1. `type !== "checkout_url"` — với SePay, `payment_link.url` là **ảnh PNG VietQR**.
 *    Điều hướng vào đó là quăng người dùng ra khỏi app tới một tấm ảnh trần, không có
 *    đường quay lại. Chặn theo scheme KHÔNG đủ vì ảnh PNG cũng là `https:`.
 *
 * 2. scheme phải là http(s) — `instructions` của MoMo/ZaloPay là deeplink (`momo://…`).
 *    Nếu có ai nhầm trường, `window.location.href = "momo://…"` trên desktop là một ngõ
 *    cụt câm lặng: không lỗi, không chuyển trang, không gì cả.  #Huynh
 */
export function isNavigableCheckout(
  link: PaymentLink | null | undefined
): link is PaymentLink & { url: string } {
  if (!link || link.type !== "checkout_url" || !link.url) return false;
  try {
    const protocol = new URL(link.url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Rời trang sang cổng thanh toán.
 *
 * Tách thành hàm riêng KHÔNG phải để cho đẹp: `window.location.href` gán thẳng trong
 * component thì test không chặn được — jsdom chỉ log "Not implemented: navigation" rồi đi
 * tiếp, nên không khẳng định nổi "SePay KHÔNG được điều hướng". Có hàm riêng thì test mock
 * cả module, và khẳng định được cả hai chiều: MoMo điều hướng tới đúng URL, SePay không
 * gọi lần nào.  #Huynh
 */
export function redirectTo(url: string): void {
  window.location.href = url;
}

/** Bốn dòng người dùng cần để chuyển khoản tay khi quét QR hỏng. */
export type TransferDetails = {
  bank: string | null;
  accountNumber: string | null;
  /** Chuỗi chữ số trần để DÁN vào app ngân hàng, ví dụ "199000". */
  amountRaw: string;
  /** Nội dung chuyển khoản — chính là `order_code`. */
  memo: string | null;
};

const ACCOUNT_KEYS = ["acc", "account", "accountNo", "accountNumber"];
const BANK_KEYS = ["bank", "bankCode", "bankName"];

/** `/image/ACB-40104887-compact2.png` — dạng đường dẫn của img.vietqr.io. */
const VIETQR_PATH = /\/image\/([A-Za-z0-9]+)-(\d{4,20})-/;

/** "…số tài khoản 40104887 (ACB)…" — chốt chặn cuối, đọc từ câu tiếng Việt. */
const FROM_SENTENCE = /số tài khoản\s+(\d{4,20})\s*(?:\(([^)]+)\))?/i;

/**
 * Bóc tên ngân hàng và số tài khoản để hiện thành hai dòng sao chép được.
 *
 * VÌ SAO PHẢI BÓC: backend không có trường riêng cho hai giá trị này. Nó chỉ trả
 * `payment_link.instructions` — MỘT CÂU gộp cả bốn thứ:
 *
 *     "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB), nội dung ghi đúng: SDDYFM83AS"
 *
 * In nguyên câu thì không sao chép riêng số tài khoản được — mà đó đúng là thứ phải dán
 * vào app ngân hàng khi quét QR hỏng.
 *
 * Thử theo thứ tự TỪ CHẮC TỚI ĐOÁN:
 *   1. query param của link ảnh QR (`?acc=…&bank=…`) — key/value máy đọc, do chính backend
 *      dựng nên định dạng ổn định, và là ĐÚNG con số app ngân hàng sẽ đọc ra từ ảnh QR
 *   2. dạng đường dẫn `/image/{BANK}-{ACC}-…`
 *   3. câu tiếng Việt
 *   4. chịu — trả `null`, KHÔNG đoán bừa
 *
 * Trả `null` là kết quả HỢP LỆ, không phải lỗi: chỗ gọi phải in nguyên câu `instructions`
 * thay cho hai dòng đó. Bịa ra một số tài khoản là dẫn người ta chuyển tiền đi đâu không
 * biết — thà mất hai dòng tiện lợi.
 *
 * `order_code` CỐ Ý lấy từ trường riêng chứ không bóc từ tham số `des`: nó đã có sẵn chỗ
 * đàng hoàng, bóc từ URL là dựng một phụ thuộc ngầm hỏng lặng lẽ.  #Huynh
 */
export function readTransferDetails(
  intent: Pick<PaymentIntentResponse, "amount" | "order_code" | "payment_link">
): TransferDetails {
  const base: TransferDetails = {
    bank: null,
    accountNumber: null,
    // Chuỗi chữ số trần: backend trả "199000.00", app ngân hàng không nhận phần thập phân.
    amountRaw: String(Math.trunc(Number(intent.amount) || 0)),
    memo: intent.order_code,
  };

  const raw = intent.payment_link?.qr_code_url ?? intent.payment_link?.url;
  if (raw) {
    try {
      const parsed = new URL(raw);
      const pick = (keys: string[]) => {
        for (const key of keys) {
          const value = parsed.searchParams.get(key);
          if (value) return value;
        }
        return null;
      };
      const account = pick(ACCOUNT_KEYS);
      const bank = pick(BANK_KEYS);
      if (account) return { ...base, accountNumber: account, bank };

      const matched = VIETQR_PATH.exec(parsed.pathname);
      if (matched) return { ...base, bank: matched[1], accountNumber: matched[2] };
    } catch {
      // URL hỏng — rơi xuống đọc câu hướng dẫn.
    }
  }

  const sentence = intent.payment_link?.instructions;
  if (sentence) {
    const matched = FROM_SENTENCE.exec(sentence);
    if (matched) return { ...base, accountNumber: matched[1], bank: matched[2] ?? null };
  }

  return base;
}
