/**
 * Đọc kết quả MoMo đá kèm trên query string lúc trình duyệt quay về.
 *
 * MoMo redirect về `return_url` với một chùm tham số, trong đó `resultCode` là thứ nói
 * ngay lần thanh toán đó có đi tới đâu không:
 *
 *   ?partnerCode=MOMO&orderId=…&resultCode=1006&message=Giao+dịch+bị+từ+chối+bởi+người+dùng…
 *
 * Vì sao cần đọc: khi người dùng BẤM HUỶ trên MoMo thì KHÔNG có IPN nào được gửi, nên bản
 * ghi `payment_intent` bên backend nằm nguyên ở `pending` — trang cứ hỏi lại mỗi 3 giây và
 * kẹt mãi ở câu "Đang xác nhận thanh toán với MoMo…". Tham số trên URL là tín hiệu DUY
 * NHẤT cho biết chuyến đi đã kết thúc trong thất bại.
 *
 * Vẫn giữ nguyên nguyên tắc cũ: URL không phải nguồn sự thật để nói THÀNH CÔNG (người dùng
 * sửa tay được). Nó chỉ được dùng theo chiều an toàn — `resultCode` báo hỏng/huỷ thì dừng
 * chờ; báo thành công thì vẫn phải hỏi backend xác nhận.  #Huynh
 */

/** Tham số MoMo gắn thêm vào `return_url` — dọn hết sau khi đọc. */
const MOMO_PARAMS = [
  "partnerCode",
  "orderId",
  "requestId",
  "amount",
  "orderInfo",
  "orderType",
  "transId",
  "resultCode",
  "message",
  "payType",
  "responseTime",
  "extraData",
  "signature",
] as const;

/** 0 = thành công. Ngoài ra MoMo còn vài mã "chưa xong" và vài mã "người dùng huỷ". */
const PENDING_CODES = new Set([7000, 7002, 9000]);
const CANCELLED_CODES = new Set([1003, 1006]);

export type MomoOutcome = "success" | "pending" | "cancelled" | "failed";

export type MomoReturn = {
  resultCode: number;
  /** Câu MoMo trả (đã decode) — dùng làm lời giải thích cho người dùng. */
  message: string | null;
  orderId: string | null;
  outcome: MomoOutcome;
};

function classify(resultCode: number): MomoOutcome {
  if (resultCode === 0) return "success";
  if (PENDING_CODES.has(resultCode)) return "pending";
  if (CANCELLED_CODES.has(resultCode)) return "cancelled";
  return "failed";
}

/**
 * Trả về kết quả MoMo nếu query string ĐÚNG là một lần quay về từ MoMo, ngược lại `null`.
 *
 * Thiếu `resultCode` (hoặc không parse ra số) thì coi như không phải return của MoMo —
 * để trang chạy theo đường cũ: hỏi backend.
 */
export function readMomoReturn(search: string): MomoReturn | null {
  const params = new URLSearchParams(search);
  const raw = params.get("resultCode");
  if (raw === null || raw.trim() === "") return null;

  const resultCode = Number(raw);
  if (!Number.isFinite(resultCode)) return null;

  const message = params.get("message");
  return {
    resultCode,
    message: message && message.trim() ? message.trim() : null,
    orderId: params.get("orderId"),
    outcome: classify(resultCode),
  };
}

/**
 * Xoá tham số MoMo khỏi thanh địa chỉ, GIỮ nguyên phần còn lại (nhất là `?tab=subscription`
 * — nó quyết định tab nào đang mở).
 *
 * Không dọn thì F5 một cái là đọc lại đúng `resultCode` cũ và báo huỷ lần nữa cho một giao
 * dịch đã qua.
 */
export function stripMomoParams(): void {
  const url = new URL(window.location.href);
  let touched = false;
  for (const key of MOMO_PARAMS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      touched = true;
    }
  }
  if (!touched) return;
  const query = url.searchParams.toString();
  window.history.replaceState({}, "", `${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
}
