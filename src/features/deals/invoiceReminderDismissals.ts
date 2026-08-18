/**
 * Những mốc mà freelancer đã bấm "bỏ nhắc" trên dải nhắc hóa đơn.
 *
 * Vì sao lưu CỤC BỘ chứ không xuống server: đây là chuyện "tôi đã biết rồi", không phải dữ
 * liệu nghiệp vụ. Hóa đơn có thật hay không thì backend đã biết qua `tasks.invoice_id` —
 * dải nhắc này chỉ là lời nhắc trên màn hình cho người đang ngồi trước máy. Đẩy nó thành một
 * cột trong DB là thêm migration và một endpoint cho một cái ghi chú tạm.
 *
 * Đánh đổi: đổi máy hoặc xoá dữ liệu trình duyệt thì dải nhắc hiện lại. Chấp nhận được — nó
 * chỉ là một dòng chữ vàng, bỏ đi lần nữa mất một cú bấm.
 *
 * Cùng lối với `dealHistoryStorage.ts`: bọc `localStorage` trong try/catch vì chế độ riêng tư
 * của Safari ném lỗi ngay khi ghi, và một dòng nhắc không đáng làm sập cả bảng việc.  #Huynh
 */

const STORAGE_KEY = "solodesk.invoice-reminder-dismissed";

export function readDismissedReminders(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Bỏ nhắc một mốc. Trả về danh sách MỚI để chỗ gọi đặt thẳng vào state. */
export function dismissInvoiceReminder(taskId: string): string[] {
  const next = readDismissedReminders();
  if (!next.includes(taskId)) next.push(taskId);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ghi hụt thì dải nhắc hiện lại ở lần mở sau — phiền, nhưng không mất gì.
  }
  return next;
}
