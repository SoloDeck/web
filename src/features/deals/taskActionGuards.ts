import { isPaymentTask } from "@/features/deals/paymentTasks";
import type { ProjectTask, Stage } from "@/features/deals/types";

/**
 * Hai luật chặn đứng TRƯỚC khi freelancer tick một việc hoặc xuất hóa đơn ở tab Công việc.
 * Hàm thuần, tách khỏi `DealDetailPage` để test được mà không phải dựng cả trang.
 */

/** Task này là khoản "thu ngay" (đặt cọc / tạm ứng lúc ký hợp đồng) không. */
export function isUpfrontPayment(
  task: Pick<ProjectTask, "title" | "billingAmount" | "billingDueType">
): boolean {
  return isPaymentTask(task) && task.billingDueType === "on_signing";
}

/**
 * Những khoản "thu ngay" (đặt cọc / tạm ứng lúc ký hợp đồng) mà freelancer CHƯA ghi nhận đã
 * thu — chỉ khi việc đang làm là một khoản "thu khi xong".
 *
 * Vì sao: quy trình đúng là thu cọc TRƯỚC rồi mới làm, xong việc mới đòi phần còn lại. Tick
 * xong một hạng mục (hoặc xuất hóa đơn cho nó) trong khi cọc chưa về là đi ngược quy trình đó,
 * và bảng doanh thu sẽ ghi "đã làm xong" cho một dự án mà khoản đầu tiên khách chưa trả.
 *
 * "Ghi nhận đã thu" ở đây là `status === "done"` — chính quy ước backend dùng cho cột "Đã
 * thu" của bảng Doanh thu (`task done = đã thu`), nên hai nơi không bao giờ hiểu khác nhau.
 *
 * Chỉ áp cho khoản "thu khi xong". Chính khoản "thu ngay" thì không bị chặn (nó là thứ cần
 * làm trước), và task thường hay khoản không rõ thời điểm thu thì giao diện im lặng thay vì
 * đoán.  #Huynh
 */
export function missingUpfrontPayments(
  task: Pick<ProjectTask, "id" | "billingDueType">,
  allTasks: ProjectTask[]
): ProjectTask[] {
  if (task.billingDueType !== "on_completion") return [];
  return allTasks.filter(
    (other) => other.id !== task.id && isUpfrontPayment(other) && other.status !== "done"
  );
}

/**
 * Có nên hỏi "Chuyển qua trạng thái triển khai?" không.
 *
 * Chỉ khi nút "Bắt đầu triển khai" thật sự bấm được: deal đang ở "Đang đàm phán" VÀ hợp đồng
 * đã được ghi nhận là đã ký (đúng điều kiện `handleStartProject` đòi). Deal ở giai đoạn khác
 * trước đó thì không có đường nào chuyển thẳng sang triển khai, hỏi chỉ để người dùng bấm
 * "Đồng ý" rồi nhận lỗi.
 *
 * Đã "Đang triển khai" hoặc "Hoàn thành" thì khỏi hỏi: việc đã bắt đầu rồi.  #Huynh
 */
export function shouldOfferStartProject(stage: Stage, hasSignedContract: boolean): boolean {
  return stage === "in_negotiation" && hasSignedContract;
}
