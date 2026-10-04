import type { Stage } from "@/features/deals/types";

/**
 * Luật của "Loại bỏ dự án" (đánh dấu dự án KHÔNG THÀNH CÔNG): lý do phải nêu, và deal nào còn loại
 * bỏ được. Tách khỏi hộp thoại để kiểm riêng, không cần vẽ giao diện.  #Huynh
 */

/** Lựa chọn nhanh cho lý do — freelancer chọn một cái rồi (nếu muốn) ghi thêm. */
export const FAILURE_REASONS = [
  "Khách chọn bên khác",
  "Ngân sách không đủ",
  "Khách không phản hồi",
  "Dự án bị hoãn hoặc hủy",
  "Khác",
] as const;

/** Chọn "Khác" thì ghi chú CHÍNH LÀ lý do, nên bắt buộc phải điền. */
export const OTHER_REASON = "Khác";

/** Khớp giới hạn `reason` của `POST /deals/{id}/stage` ở backend. */
export const MAX_REASON_LENGTH = 1000;

/**
 * Ghép lựa chọn nhanh và ghi chú thành MỘT câu lý do để lưu.
 *
 * "Khách chọn bên khác" + "giá thấp hơn 30%" → "Khách chọn bên khác: giá thấp hơn 30%".
 * "Khác" thì chỉ còn ghi chú. Chưa chọn gì thì rỗng — chưa đủ điều kiện để xác nhận.
 */
export function composeFailureReason(choice: string | null, note: string): string {
  const detail = note.trim();
  if (!choice) return "";
  if (choice === OTHER_REASON) return detail;
  return detail ? `${choice}: ${detail}` : choice;
}

/**
 * Deal còn "Loại bỏ" được hay không: chỉ deal CHƯA đóng. Deal đã hoàn thành thì không còn là thất
 * bại để ghi nhận; deal đã không thành công rồi thì việc duy nhất còn lại là xóa vĩnh viễn, và việc
 * đó nằm trong Kho lưu trữ.
 */
export function canMarkDealLost(stage: Stage): boolean {
  return stage !== "completed_and_billed" && stage !== "lost";
}
