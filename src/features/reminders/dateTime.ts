/**
 * Ngày giờ kiểu Việt cho lịch nhắc.
 *
 * Vì sao không dùng `<input type="datetime-local">`: ô đó hiển thị theo locale của MÁY —
 * máy cài tiếng Anh thì ra `mm/dd/yyyy`, người Việt đọc "03/07" thành 3 tháng 7 rồi đặt
 * nhầm lịch cả tháng. Ở đây luôn là `dd/mm/yyyy`, không phụ thuộc máy ai.  #Huynh
 */

export function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function formatTimeForInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** `null` khi chuỗi không phải ngày thật — gọi phải tự xử, đừng lặng lẽ dùng ngày hôm nay. */
export function parseVietnameseDateTime(dateValue: string, timeValue: string): Date | null {
  const match = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match || !timeValue) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const [hourRaw, minuteRaw] = timeValue.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  // Chặn ngày không tồn tại (31/02): `new Date` tự nhảy sang tháng sau chứ không báo lỗi.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }
  return date;
}

/**
 * "còn 3 ngày nữa" — nói ra khoảng cách để người dùng bắt được lỗi đặt nhầm ngày.
 *
 * Ô ngày mặc định là NGÀY MAI; không có dòng này thì người ta chỉ sửa mỗi giờ rồi tưởng
 * gửi hôm nay, ngồi đợi mãi không thấy thư đi.  #Huynh
 */
export function formatRelative(value: string): string | null {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;

  const minutes = Math.round((target - Date.now()) / 60000);
  if (minutes < 0) return "đã tới hạn, sẽ gửi trong ít phút";
  if (minutes < 1) return "sắp gửi";
  if (minutes < 60) return `còn ${minutes} phút nữa`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `còn ${hours} giờ nữa`;

  const days = Math.round(hours / 24);
  return days === 1 ? "còn 1 ngày nữa (ngày mai)" : `còn ${days} ngày nữa`;
}

/**
 * Khoảng lùi cho mốc giờ của lượt "Duyệt và gửi" (gửi NGAY).
 *
 * Gửi ngay vẫn phải tạo một lời nhắc trước rồi mới gửi, mà backend chỉ nhận lời nhắc có giờ
 * hẹn ở TƯƠNG LAI. Bản cũ đặt đúng giờ lúc bấm: request tới nơi thì giờ đó đã thành quá khứ
 * → 422 → nút "Duyệt và gửi" hỏng hoàn toàn từ khi backend thêm luật đó (02/08).
 *
 * 5 phút đủ đỡ độ trễ mạng và đồng hồ máy người dùng chạy chậm hơn máy chủ. Nó còn đỡ thêm
 * một chuyện: lời nhắc chưa tới giờ nên beat (quét mỗi 60 giây) không nhặt nó gửi chen vào
 * giữa hai request "tạo" và "gửi".  #Huynh
 */
export const SEND_NOW_LEAD_MS = 5 * 60 * 1000;

/** Giờ hẹn dùng khi tạo lời nhắc để gửi ngay. Xem `SEND_NOW_LEAD_MS`. */
export function sendNowScheduledAt(now: Date = new Date()): string {
  return new Date(now.getTime() + SEND_NOW_LEAD_MS).toISOString();
}
