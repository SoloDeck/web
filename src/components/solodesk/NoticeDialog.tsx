import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Danh sách gạch đầu dòng nằm dưới phần mô tả (ví dụ các khoản còn thiếu). */
  items?: string[];
  /** Dòng chốt cuối hộp thoại, nói người dùng nên làm gì tiếp. */
  footnote?: ReactNode;
  closeLabel?: string;
};

/**
 * Hộp thoại NHẮC: chỉ có một nút đóng, không có lựa chọn nào.
 *
 * Khác `ConfirmDialog` ở chỗ không hỏi "làm hay không" — việc đang định làm đã bị chặn, hộp
 * thoại chỉ nói lý do để người dùng tự kiểm tra lại rồi đóng.  #Huynh
 */
export function NoticeDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  footnote,
  closeLabel = "Đóng",
}: NoticeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      {/* Rộng hơn khung mặc định (max-w-lg, 512px) một chút: cột chữ cạnh biểu tượng chỉ còn
          ~376px nên tiêu đề dài ~400px bị rớt đúng MỘT chữ ("ngay") xuống dòng riêng. Phải viết
          theo biến thể `data-[size=default]:sm:` y như khung gốc thì mới ghi đè được — class
          `sm:max-w-xl` trơn có độ ưu tiên thấp hơn nên bị lờ đi.  #Huynh */}
      <AlertDialogContent className="data-[size=default]:sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <AlertTriangle className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {items && items.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-muted-foreground">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {footnote && <p className="text-sm text-muted-foreground">{footnote}</p>}

        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
