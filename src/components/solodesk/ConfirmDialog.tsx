import type { ReactNode } from "react";
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

type ConfirmDialogTone = "default" | "danger";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Chuỗi thường, hoặc JSX khi cần nhấn mạnh một đoạn (ví dụ in đậm số tiền). */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  isLoading?: boolean;
  onConfirm: () => void;
  /**
   * Chạy khi người dùng bấm ĐÚNG nút từ chối. Đóng hộp thoại bằng Esc hay bấm ra ngoài thì
   * KHÔNG chạy — chỗ gọi nhờ vậy phân biệt được "Để sau" (vẫn làm tiếp việc đang dở) với "bỏ
   * hẳn" (đóng hộp thoại, không làm gì).
   */
  onCancel?: () => void;
  /**
   * Lựa chọn thứ ba nằm GIỮA nút từ chối và nút xác nhận (ví dụ "Tôi đã gửi cách khác — chỉ ghi
   * nhận"). Chỉ hiện khi truyền cả `secondaryLabel` lẫn `onSecondary`; giống nút xác nhận, bấm
   * vào không tự đóng hộp thoại — chỗ gọi tự đóng.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "default",
  isLoading = false,
  onConfirm,
  onCancel,
  secondaryLabel,
  onSecondary,
}: ConfirmDialogProps) {
  const danger = tone === "danger";

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={danger ? "bg-destructive/10 text-destructive" : undefined}>
            <AlertTriangle className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          {secondaryLabel && onSecondary && (
            <AlertDialogAction
              type="button"
              disabled={isLoading}
              className="border border-border bg-transparent text-foreground hover:bg-secondary"
              onClick={(event) => {
                event.preventDefault();
                onSecondary();
              }}
            >
              {secondaryLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            type="button"
            disabled={isLoading}
            className={
              danger
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              // Chặn auto-close để action async có thể hiện loading và chỉ đóng khi xử lý thành công.
              onConfirm();
            }}
          >
            {isLoading ? "Đang xử lý..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
