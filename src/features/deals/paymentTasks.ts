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

/**
 * Gửi hóa đơn xong thì mốc đó có cần tick "đã hoàn thành" không.
 *
 * Vì sao gửi hóa đơn lại kéo theo tick: hai thứ vốn rời nhau, nên bảng việc hiện những hàng
 * tự mâu thuẫn — mốc còn nhãn "Chưa làm" trong khi hóa đơn của chính nó đã "Đã thanh toán".
 * Freelancer phải nhớ tick tay, quên thì guard "Hoàn thành dự án" chặn lại dù tiền đã về đủ.
 *
 * Không tick lại khi mốc đã xong sẵn (gửi lại hóa đơn cho mốc đã tick) — một lượt ghi thừa
 * xuống server, và bảng việc nháy một cái không vì lý do gì.
 *
 * ĐÁNH ĐỔI phải biết: mốc tick xong là guard "Hoàn thành dự án" cho qua. Tức là từ nay có thể
 * đóng dự án khi tiền mới chỉ ĐƯỢC XUẤT HÓA ĐƠN chứ chưa chắc đã về tài khoản. Muốn chặt hơn
 * thì dời chỗ gọi hàm này sang lúc ghi nhận đã thanh toán.  #Huynh
 */
export function shouldTickAfterInvoiceSent(
  task: Pick<ProjectTask, "status" | "completed">
): boolean {
  return task.status !== "done" && !task.completed;
}

/**
 * Mốc đã tick xong nhưng khách VẪN CHƯA nhận được hóa đơn nào — đáng nhắc một dòng.
 *
 * Cảnh này rơi ra từ chính lối thoát ở `handleToggleTask`: bấm tick rồi chọn "Để sau" là mốc
 * xong mà chưa có chứng từ. Không nhắc thì nó nằm im giữa danh sách những mốc đã xong, trông
 * y hệt các mốc đã thu tiền — freelancer làm xong việc rồi quên đòi tiền.
 *
 * Tính cả `draft`: hóa đơn đã tạo nhưng chưa gửi thì khách cũng chưa nhận được gì.  #Huynh
 */
export function needsInvoiceReminder(task: ProjectTask): boolean {
  if (!isPaymentTask(task) || !task.completed) return false;
  const state = invoiceUiState(task);
  return state === "none" || state === "draft";
}

/** Câu nhắc, nói đúng đang thiếu bước nào chứ không gộp thành một câu chung. */
export function invoiceReminderText(task: ProjectTask): string {
  const label = paymentMilestoneLabel(task);
  return invoiceUiState(task) === "draft"
    ? `${label} — hóa đơn mới ở bản nháp, chưa gửi cho khách`
    : `${label} — chưa tạo & gửi hóa đơn`;
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
