import type { ProjectTask } from "@/features/deals/types";

/**
 * Tiền tố các task "Thu tiền:" mà backend tự sinh từ mốc thanh toán của báo giá đã chốt.
 *
 * Phải khớp TUYỆT ĐỐI với `PAYMENT_TASK_PREFIX` bên backend
 * (`src/modules/tasks/application/service.py`) — đó là hợp đồng ngầm giữa hai bên: backend
 * sinh task theo tiền tố này, guard "hoàn thành dự án" tìm task theo tiền tố này, và giờ hàng
 * task trong tab Công việc cũng nhận diện mốc thu tiền theo nó.
 *
 * Tách ra file riêng vì đã có tới hai nơi cần (`DealDetailPage` để đếm mốc chưa thu,
 * `ProjectTaskList` để vẽ nút hóa đơn). Ba chỗ tự gõ lại cùng một chuỗi thì kiểu gì cũng có
 * ngày lệch — mà lệch ở đây nghĩa là hàng task mất sạch nút hóa đơn, im lặng, không báo gì.
 *  #Huynh
 */
export const PAYMENT_TASK_PREFIX = "Thu tiền:";

/** Task này có phải mốc thu tiền do hệ thống sinh không. */
export function isPaymentTask(task: Pick<ProjectTask, "title">): boolean {
  return task.title.startsWith(PAYMENT_TASK_PREFIX);
}

/** Nhãn mốc, đã bỏ tiền tố — dùng khi đã có ngữ cảnh "đây là mốc thu tiền" rồi. */
export function paymentMilestoneLabel(task: Pick<ProjectTask, "title">): string {
  return task.title.slice(PAYMENT_TASK_PREFIX.length).trim() || task.title;
}

/** Trạng thái hóa đơn của một mốc, quy về thứ giao diện cần vẽ. */
export type InvoiceUiState = "none" | "draft" | "sent" | "partially_paid" | "paid" | "void";

export function invoiceUiState(task: ProjectTask): InvoiceUiState {
  const status = task.invoice?.status;
  if (!status) return "none";
  if (
    status === "draft" ||
    status === "sent" ||
    status === "partially_paid" ||
    status === "paid" ||
    status === "void"
  ) {
    return status;
  }
  // Trạng thái lạ (backend thêm giá trị mới mà web chưa biết): coi như đã có hóa đơn nhưng
  // KHÔNG mời gửi lại — thà thiếu một nút còn hơn gửi nhầm cho khách một lá thư thứ hai.
  return "sent";
}
