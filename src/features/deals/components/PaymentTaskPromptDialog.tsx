import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { paymentMilestoneLabel } from "@/features/deals/paymentTasks";
import type { ProjectTask } from "@/features/deals/types";
import { formatVND } from "@/utils/format";

type PaymentTaskPromptDialogProps = {
  /** Mốc thu tiền vừa được tick. `null` thì hộp thoại đóng. */
  task: ProjectTask | null;
  /** Đóng bằng dấu ✕ / Esc / bấm ra ngoài: bỏ luôn việc tick. */
  onDismiss: () => void;
  /** Tick xong mốc rồi đóng hộp thoại. Nút bên trái chỉ làm đúng việc này. */
  onFinishTick: () => void;
  /** Mốc chưa có hóa đơn: tạo bản nháp để freelancer xem lại rồi mới gửi. */
  onSendInvoice: (task: ProjectTask) => void;
  /** Mốc đã có hóa đơn: ghi nhận khách đã chuyển đủ số còn lại. */
  onRecordPayment: (task: ProjectTask) => void;
};

/**
 * Hỏi tiếp sau khi tick một mốc thu tiền. Tick = tiền đã về, nên hỏi ngay để chứng từ đi theo,
 * thay vì bắt người dùng nhớ sang tab Tài liệu làm nốt — mà thường là không ai nhớ.
 *
 * Nút bên trái LUÔN chỉ tick xong task: người ta bấm tick là để tick, đừng bắt trả lời câu hỏi
 * khác mới cho làm việc mình định làm. Chữ của hai nút theo từng cảnh:
 *
 * - Mốc CHƯA có hóa đơn: "Ghi nhận" (chỉ ghi nhận mốc đã xong, không cần hóa đơn) và
 *   "Gửi & ghi nhận" (tick xong và mở bản nháp hóa đơn để gửi khách). Trước đây là "Để sau" /
 *   "Tạo & gửi hóa đơn": người dùng bấm tick chỉ để ghi nhận, "Để sau" nghe như hoãn luôn việc
 *   tick dù nút đó vẫn tick, còn "Tạo" nghe như bắt buộc phải có hóa đơn.
 * - Mốc ĐÃ có hóa đơn: "Để sau" và "Ghi nhận đã thanh toán".
 *
 * Từng có nút "Huỷ" thứ ba (bỏ luôn việc tick), nay bỏ đi: dấu ✕ ở góc cửa sổ vốn đã làm đúng
 * việc đó (`onDismiss`), nên nó chỉ là một nút nói lại điều người dùng đã biết cách làm.  #Huynh
 */
export function PaymentTaskPromptDialog({
  task,
  onDismiss,
  onFinishTick,
  onSendInvoice,
  onRecordPayment,
}: PaymentTaskPromptDialogProps) {
  const inv = task?.invoice;
  const conLai = inv ? inv.total - inv.amountPaid : 0;
  const chuaCoHoaDon = !inv;

  return (
    <Dialog
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {task && (
          <>
            <DialogHeader>
              <DialogTitle>
                {chuaCoHoaDon ? "Gửi hóa đơn cho khách luôn?" : "Ghi nhận đã thanh toán?"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Mốc <b className="text-foreground">{paymentMilestoneLabel(task)}</b>
              {chuaCoHoaDon ? (
                <>
                  {" "}
                  {/* KHÔNG hứa mã QR ở đây: thư chỉ đính QR khi freelancer đã khai
                    thông tin ngân hàng trong hồ sơ, mà phần lớn thì chưa. Hứa một thứ
                    khách không thấy trong thư là tự tạo ra câu hỏi "QR đâu?".  #Huynh */}
                  — SoloDesk sẽ tạo hóa đơn theo đúng số tiền của mốc này trong báo giá đã chốt,
                  rồi <b className="text-foreground">gửi email cho khách</b>.
                </>
              ) : (
                <>
                  {" "}
                  — hóa đơn <b className="text-foreground">{inv?.invoiceNumber}</b> còn{" "}
                  <b className="text-foreground">{formatVND(conLai)}</b>. Xác nhận là khách đã
                  chuyển đủ số này.
                </>
              )}
            </p>
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={onFinishTick}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {chuaCoHoaDon ? "Ghi nhận" : "Để sau"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onFinishTick();
                  if (chuaCoHoaDon) onSendInvoice(task);
                  else onRecordPayment(task);
                }}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {chuaCoHoaDon ? "Gửi & ghi nhận" : "Ghi nhận đã thanh toán"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
