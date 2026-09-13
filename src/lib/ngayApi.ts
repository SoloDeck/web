/**
 * Đổi một `Date` thành chuỗi `YYYY-MM-DD` theo **giờ địa phương của người dùng**.
 *
 * Vì sao không dùng `date.toISOString().slice(0, 10)` như trước: `toISOString()` quy về UTC
 * trước khi cắt. Người dùng ở Việt Nam là UTC+7, nên trong khoảng **0h đến 7h sáng** mỗi
 * ngày, ngày UTC vẫn là hôm qua — và mọi ngày gửi lên API đều lùi một hôm:
 *
 *   - Freelancer ghi nhận khách trả tiền lúc 6h sáng → sổ sách ghi ngày **hôm qua**.
 *   - Hoá đơn đề xuất hạn "hôm nay + 7" → ra hạn sớm một ngày.
 *
 * Lỗi này im lặng suốt phần lớn thời gian trong ngày, chỉ lộ ra lúc sáng sớm — nên rất khó
 * lần ra nếu không có bài test chạy trúng khung giờ đó. (Nó lộ ra đúng như vậy: một bài test
 * xanh cả tuần rồi đỏ khi chạy lúc 00:24.)
 *
 * Ngày ở đây luôn là ngày **theo lịch của người dùng** — ngày họ nhận tiền, ngày họ hẹn
 * thanh toán — nên giờ địa phương mới là cách đọc đúng, không phải UTC.  #Huynh
 */
export function ngayChoApi(date: Date): string {
  const nam = date.getFullYear();
  const thang = String(date.getMonth() + 1).padStart(2, "0");
  const ngay = String(date.getDate()).padStart(2, "0");
  return `${nam}-${thang}-${ngay}`;
}

/** Hôm nay theo lịch người dùng, dạng `YYYY-MM-DD`. */
export function homNayChoApi(): string {
  return ngayChoApi(new Date());
}
