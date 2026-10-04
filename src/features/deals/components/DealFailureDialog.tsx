import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  composeFailureReason,
  FAILURE_REASONS,
  MAX_REASON_LENGTH,
  OTHER_REASON,
} from "@/features/deals/dealFailure";
import { cn } from "@/lib/utils";

type DealFailureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealTitle: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
};

/**
 * "Loại bỏ dự án" = đánh dấu dự án KHÔNG THÀNH CÔNG, bắt buộc kèm lý do.
 *
 * Trước đây nút này chỉ xóa mềm: deal biến khỏi mọi thống kê nên tỷ lệ thắng luôn 100%. Nay deal
 * vào Kho lưu trữ (mục Không thành công) kèm lý do và được tính vào tỷ lệ thắng; muốn xóa hẳn thì
 * vào đúng mục đó. Dùng các phần tử `AlertDialog` thay vì `ConfirmDialog` vì hộp này có ô nhập ở
 * giữa (mô tả của `ConfirmDialog` là thẻ `<p>`, không chứa được ô nhập).  #Huynh
 */
export function DealFailureDialog({
  open,
  onOpenChange,
  dealTitle,
  isLoading = false,
  onConfirm,
}: DealFailureDialogProps) {
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const reason = composeFailureReason(choice, note);
  const valid = reason.length > 0 && reason.length <= MAX_REASON_LENGTH;

  function handleOpenChange(next: boolean) {
    if (isLoading) return;
    if (!next) {
      setChoice(null);
      setNote("");
    }
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle>Loại bỏ dự án?</AlertDialogTitle>
          <AlertDialogDescription>
            Dự án "{dealTitle}" sẽ được ghi nhận là KHÔNG THÀNH CÔNG và chuyển vào Kho lưu trữ.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div role="radiogroup" aria-label="Lý do không thành công" className="flex flex-wrap gap-2">
            {FAILURE_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={choice === item}
                disabled={isLoading}
                onClick={() => setChoice(item)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  choice === item
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="block space-y-1.5 text-sm font-medium">
            {choice === OTHER_REASON ? "Nêu lý do" : "Ghi chú thêm (không bắt buộc)"}
            <textarea
              value={note}
              disabled={isLoading}
              maxLength={MAX_REASON_LENGTH}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                choice === OTHER_REASON ? "Vì sao dự án không thành công?" : "Ví dụ: khách báo giá bên kia thấp hơn 30%"
              }
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal outline-none focus:border-primary disabled:opacity-70"
            />
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={isLoading || !valid}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
            onClick={(event) => {
              event.preventDefault();
              // Chặn tự đóng để mutation hiện "Đang xử lý..." và chỉ đóng khi xong.
              if (valid) onConfirm(reason);
            }}
          >
            {isLoading ? "Đang xử lý..." : "Loại bỏ"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
