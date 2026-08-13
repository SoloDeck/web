import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { saveWarningLevel } from "@/features/ai/qualificationUi";
import { cn } from "@/lib/utils";
import type { QualificationScoreGaps } from "@/services/dealsService";

/**
 * Hộp thoại xác nhận khi freelancer chốt bản đánh giá chưa đủ 100 điểm.
 *
 * Trước đây bấm "Lưu" là đóng dấu thẳng, kể cả deal 12/100 — hệ thống biết rõ hồ sơ chưa đủ
 * căn cứ để báo giá mà không nói một câu nào. Giờ:
 *
 *   * đủ 100 điểm  -> không hỏi gì (component này không được mở)
 *   * 75–99        -> nhắc nhẹ, chốt được ngay
 *   * dưới 75      -> cảnh báo nặng, PHẢI tích ô xác nhận mới bấm chốt được
 *
 * Cố ý KHÔNG chặn: điểm đo độ rõ của yêu cầu khách, mà freelancer có quyền quyết định làm
 * việc với một yêu cầu chưa rõ. Việc của hệ thống là bảo đảm họ biết mình đang đánh đổi gì,
 * và lưu lại rằng họ đã biết (`gap_acknowledged`).
 *
 * Không dùng `ConfirmDialog` chung được: nó chỉ nhận `description` là chuỗi, không nhét được
 * danh sách mảng thiếu và ô tích xác nhận.  #Huynh
 */
export function SaveQualificationDialog({
  open,
  onOpenChange,
  score,
  gaps,
  isSaving = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  gaps: QualificationScoreGaps;
  isSaving?: boolean;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const level = saveWarningLevel(score, gaps.lost_points);
  const hard = level === "hard";

  // Mở lại lần sau phải bắt tích lại từ đầu. Giữ nguyên trạng thái đã tích là biến một hành
  // động có chủ đích thành cái bẫy: lần thứ hai nút sáng sẵn, bấm nhầm là chốt luôn.
  //
  // Đặt lại NGAY TRONG RENDER chứ không dùng effect — effect chạy sau khi đã vẽ, nên có một
  // khung hình nút vẫn sáng. Đây là cách React khuyến nghị để chỉnh state theo prop.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setAcknowledged(false);
  }

  const essentialLabels = gaps.gaps
    .filter((gap) => gaps.essential_missing.includes(gap.key))
    .map((gap) => gap.label);

  const canConfirm = !hard || acknowledged;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={hard ? "bg-destructive/10 text-destructive" : undefined}
          >
            {hard ? <AlertTriangle className="h-8 w-8" /> : <Info className="h-8 w-8" />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {hard
              ? `Bản đánh giá này mới ${score}/100 điểm`
              : `Còn thiếu ${gaps.lost_points} điểm — vẫn chốt chứ?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hard
              ? essentialLabels.length > 0
                ? `Chưa có ${essentialLabels.join(" và ").toLowerCase()}. Báo giá lúc này là báo giá khi chưa biết rõ khách cần gì.`
                : "Hồ sơ deal còn thiếu nhiều thông tin để báo giá chắc tay."
              : "Ba mảng thiết yếu đã đủ, bạn báo giá được. Phần thiếu còn lại chỉ làm báo giá sắc hơn."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Đang thiếu
          </div>
          {gaps.gaps.map((gap) => (
            <div key={gap.key} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{gap.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-muted-foreground">
                  {gap.points}/{gap.max_points}
                </span>
                <span className="ml-2 font-semibold text-destructive">−{gap.lost_points}đ</span>
              </span>
            </div>
          ))}
        </div>

        {hard && (
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5">
            <Checkbox
              className="mt-0.5"
              checked={acknowledged}
              onCheckedChange={(next) => setAcknowledged(Boolean(next))}
            />
            <span>Tôi hiểu hồ sơ chưa đủ căn cứ và vẫn muốn chốt bản đánh giá này.</span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Quay lại</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={isSaving || !canConfirm}
            className={cn(
              hard &&
                "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
            )}
            onClick={(event) => {
              // Chặn auto-close: chốt là chuỗi hai lời gọi mạng (đổi giai đoạn rồi đóng dấu),
              // đóng sớm thì người dùng không thấy lỗi nếu bước sau hỏng.
              event.preventDefault();
              if (canConfirm) onConfirm();
            }}
          >
            {isSaving ? "Đang lưu..." : "Vẫn chốt"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
