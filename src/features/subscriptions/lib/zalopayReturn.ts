/**
 * Đọc kết quả ZaloPay đá kèm trên query string lúc trình duyệt quay về.
 *
 * ZaloPay redirect về đúng `redirecturl` ta gửi trong `embed_data` (xem
 * `_build_create_body` bên `integrations/zalopay/client.py`), kèm `status` = 1 khi
 * thành công — MỌI giá trị khác (kể cả thiếu số, đọc không ra) coi là hỏng/huỷ, vì
 * `zalopay_payment_result_landing` bên backend cũng chỉ xét đúng chuỗi "1" là thành
 * công (test `test_zalopay_result_landing_page_is_get_reachable` dùng "0" cho ca huỷ).
 *
 * Vì sao cần đọc: ZaloPay CHỈ gọi webhook khi thanh toán THÀNH CÔNG (xem docstring
 * `ZaloPayClient` — "ZaloPay only calls back on SUCCESS"). Người dùng bấm huỷ trên
 * trang ZaloPay thì không có webhook nào tới, bản ghi `payment_intent` bên backend nằm
 * nguyên ở `pending` — giống hệt ca MoMo `resultCode=1006`, chỉ khác tên tham số.
 */

export type ZaloPayOutcome = "success" | "rejected";

export type ZaloPayReturn = {
  status: string;
  outcome: ZaloPayOutcome;
};

/** Tham số ZaloPay gắn thêm vào `redirecturl` — dọn hết sau khi đọc. */
const ZALOPAY_PARAMS = ["status", "apptransid", "pmcid", "bankcode", "amount", "discountamount", "checksum"] as const;

/**
 * Trả về kết quả ZaloPay nếu query string ĐÚNG là một lần quay về từ ZaloPay, ngược
 * lại `null`.
 *
 * Thiếu `status` thì coi như không phải return của ZaloPay — để trang chạy theo
 * đường cũ: hỏi backend.
 */
export function readZaloPayReturn(search: string): ZaloPayReturn | null {
  const params = new URLSearchParams(search);
  const status = params.get("status");
  if (status === null || status.trim() === "") return null;

  return { status, outcome: status === "1" ? "success" : "rejected" };
}

/**
 * Xoá tham số ZaloPay khỏi thanh địa chỉ, GIỮ nguyên phần còn lại (nhất là
 * `?tab=subscription`).
 */
export function stripZaloPayParams(): void {
  const url = new URL(window.location.href);
  let touched = false;
  for (const key of ZALOPAY_PARAMS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      touched = true;
    }
  }
  if (!touched) return;
  const query = url.searchParams.toString();
  window.history.replaceState({}, "", `${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
}
