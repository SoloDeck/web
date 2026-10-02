import { getApiErrorStatus } from "@/lib/api-error";

/**
 * Câu báo lỗi khi bấm "Tải PDF" báo giá / hợp đồng.
 *
 * Phân nhánh theo MÃ HTTP chứ không đọc câu backend gửi: hai endpoint PDF tải về dạng
 * `responseType: "blob"`, nên lỗi JSON của backend cũng nằm gói trong một Blob, không đọc
 * thẳng được như mọi lỗi khác. Mã HTTP thì axios vẫn giữ nguyên.
 *
 * Trước đây mọi lỗi đều ra "Tải PDF thất bại. Vui lòng thử lại." — kể cả 402 của gói Free,
 * thứ bấm lại bao nhiêu lần cũng không qua. Từ khi backend chặn PDF theo gói ở cả báo giá
 * lẫn hợp đồng, đây là lỗi người dùng gói Free gặp chắc chắn.  #Huynh
 */
export function pdfDownloadErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error);
  if (status === 402) {
    return "Gói hiện tại chưa có tính năng tải PDF. Vào mục Gói dịch vụ để nâng cấp.";
  }
  if (status === 404) {
    return "Không tìm thấy tài liệu này nữa. Tải lại trang rồi thử lại giúp bạn nhé.";
  }
  return "Tải PDF thất bại. Vui lòng thử lại.";
}
