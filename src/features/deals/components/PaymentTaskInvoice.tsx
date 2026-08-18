import { FileText, Loader2, Mail, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { invoiceUiState } from "@/features/deals/paymentTasks";
import type { ProjectTask } from "@/features/deals/types";
import { formatVND } from "@/utils/format";

/**
 * Khối hóa đơn gắn dưới một mốc "Thu tiền:".
 *
 * Trước đây task thu tiền và hóa đơn là hai thế giới rời nhau: task nằm ở tab Công việc, hóa
 * đơn nằm ở tab Tài liệu, freelancer phải tự nhớ mốc nào đã xuất chứng từ. Khối này nối hai
 * thứ đó lại — nhìn một dòng là biết đã gửi chưa, thu được chưa.
 *
 * Nhãn SUY RA từ trạng thái hóa đơn chứ không phải trạng thái task: `task_status` bên backend
 * là enum 4 giá trị, còn "đã gửi hóa đơn" vốn là chuyện của hóa đơn. Một nguồn sự thật, không
 * phải hai cái phải tự đồng bộ với nhau.  #Huynh
 */

export type PaymentInvoiceActions = {
  onCreateAndSend: (task: ProjectTask) => void;
  onSend: (task: ProjectTask) => void;
  onRecordPayment: (task: ProjectTask) => void;
  /** Task đang có thao tác chạy dở — khoá nút để bấm hai lần không đẻ hai hóa đơn. */
  pendingTaskId?: string | null;
};

/**
 * Hai loại nút, hai màu — vì chúng là HAI VIỆC khác hẳn nhau mà lại đứng cùng một chỗ.
 *
 * "Tạo & gửi hóa đơn" là việc GỬI ĐI: bấm xong khách nhận thư, chặng thu tiền mới bắt đầu.
 * "Ghi nhận đã thanh toán" là việc TIỀN VỀ: bấm xong mốc đó khép lại. Để chung một kiểu viền
 * xám thì lướt qua bảng việc chỉ thấy một dãy nút giống nhau, phải đọc chữ mới biết cái nào
 * là cái nào — mà một cái gửi thư ra ngoài cho khách, cái kia đụng vào sổ tiền.
 *
 * Xanh của nút thu tiền lấy đúng màu nhãn "Đã thanh toán" mà chính nó sinh ra, để bấm xong
 * thấy màu ấy là biết đã ăn.  #Huynh
 */
const NUT_GUI_DI = "border-border hover:bg-secondary";
const NUT_TIEN_VE = "border-success/40 bg-success/10 text-success hover:bg-success/20";

const NHAN: Record<string, { chu: string; mau: string }> = {
  draft: { chu: "Hóa đơn nháp", mau: "bg-secondary text-muted-foreground" },
  sent: { chu: "Đã gửi hóa đơn", mau: "bg-info/10 text-info" },
  partially_paid: { chu: "Đã thu một phần", mau: "bg-warning/10 text-warning" },
  paid: { chu: "Đã thanh toán", mau: "bg-success/10 text-success" },
  void: { chu: "Hóa đơn đã hủy", mau: "bg-destructive/10 text-destructive" },
};

export function PaymentTaskInvoice({
  task,
  actions,
}: {
  task: ProjectTask;
  actions: PaymentInvoiceActions;
}) {
  const state = invoiceUiState(task);
  const dangChay = actions.pendingTaskId === task.id;
  const invoice = task.invoice;

  // Nút hành động của từng trạng thái. `paid` và `void` không có nút — đã xong hoặc đã bỏ.
  const nut =
    state === "none"
      ? {
          chu: "Soạn & gửi hóa đơn",
          Icon: FileText,
          chay: () => actions.onCreateAndSend(task),
          mau: NUT_GUI_DI,
        }
      : state === "draft"
        ? { chu: "Xem lại & gửi", Icon: Mail, chay: () => actions.onSend(task), mau: NUT_GUI_DI }
        : state === "sent" || state === "partially_paid"
          ? {
              chu: "Ghi nhận đã thanh toán",
              Icon: Wallet,
              chay: () => actions.onRecordPayment(task),
              mau: NUT_TIEN_VE,
            }
          : null;

  const nhan = state === "none" ? null : NHAN[state];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-2">
      {nhan && (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", nhan.mau)}>
          {nhan.chu}
        </span>
      )}

      {invoice && (
        <span className="text-xs text-muted-foreground">
          {invoice.invoiceNumber} · {formatVND(invoice.total)}
          {/* Đã thu một phần thì phải nói RÕ còn bao nhiêu, không thì freelancer tưởng đã thu đủ. */}
          {invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
            <> · còn {formatVND(invoice.total - invoice.amountPaid)}</>
          )}
        </span>
      )}

      {nut && (
        <button
          type="button"
          onClick={nut.chay}
          disabled={dangChay}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            nut.mau
          )}
        >
          {dangChay ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <nut.Icon className="h-3.5 w-3.5" />
          )}
          {nut.chu}
        </button>
      )}
    </div>
  );
}
