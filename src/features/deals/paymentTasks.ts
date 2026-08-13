import type { ProjectTask } from "@/features/deals/types";

/**
 * Tiền tố tên của task thu tiền bản CŨ (sinh từ mốc thanh toán theo %).
 *
 * KHÔNG còn là dấu nhận biết — `billingAmount != null` mới là. Giữ lại đúng một vai trò: lối
 * rơi về cho các task cũ mà migration `a4b5c6d7e8f9` cố ý không backfill (tên đã bị sửa, tổng
 * lệch giá deal), để chúng vẫn hiện đúng trên bảng việc. Khớp với `PAYMENT_TASK_PREFIX` bên
 * backend (`src/modules/tasks/application/service.py`).
 *
 * Vì sao đổi: dấu nhận biết cũ là TÊN TASK, nên freelancer sửa tên một chữ là hàng task mất
 * sạch nút hóa đơn và mốc đó biến khỏi bảng doanh thu — im lặng, không báo gì.  #Huynh
 */
export const PAYMENT_TASK_PREFIX = "Thu tiền:";

/** Task này có phải khoản thu tiền do hệ thống sinh không. */
export function isPaymentTask(
  task: Pick<ProjectTask, "title" | "billingAmount">
): boolean {
  // `!= null` bắt cả `undefined` (task từ endpoint cũ chưa có trường này) lẫn `null`, nhưng
  // GIỮ số 0 — hạng mục 0 đồng vẫn là khoản phải thu, chỉ là đang thiếu số tiền.
  return task.billingAmount != null || task.title.startsWith(PAYMENT_TASK_PREFIX);
}

/** Nhãn khoản thu để hiển thị — bỏ tiền tố nếu là task cũ, còn task mới thì tên đã là nhãn. */
export function paymentMilestoneLabel(task: Pick<ProjectTask, "title">): string {
  if (!task.title.startsWith(PAYMENT_TASK_PREFIX)) return task.title;
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
