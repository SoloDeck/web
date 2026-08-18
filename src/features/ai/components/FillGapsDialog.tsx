import { Loader2, PencilLine } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FILL_FIELD_UI,
  fieldsToFill,
  type FillField,
  type FillGapsValues,
} from "@/features/ai/gapFillFields";
import type { Deal } from "@/features/deals/types";
import type { QualificationScoreGaps } from "@/services/dealsService";

/**
 * Điền ô này thì lấy lại được bao nhiêu điểm.
 *
 * Cộng dồn vì một ô có thể vá nhiều tiêu chí cùng lúc: phần mô tả (`notes`) ăn vào cả Phạm
 * vi công việc, Mức độ chi tiết lẫn Bối cảnh — viết kỹ một lần gỡ được cả ba.
 *
 * Số này backend đã tính sẵn theo barem (`lost_points` của từng khoảng thiếu), FE không tự
 * đoán. Bày nó ra cạnh nhãn để người dùng biết nên hỏi khách cái gì trước cho bõ công.
 */
function pointsToGain(gaps: QualificationScoreGaps, field: FillField): number {
  return gaps.gaps
    .filter((gap) => gap.fill_field === field)
    .reduce((total, gap) => total + (gap.lost_points ?? 0), 0);
}

/**
 * Form bổ sung nhanh — mắt xích còn thiếu của vòng nghiệp vụ.
 *
 * Trước đây luồng đứt ngay sau khi người dùng biết mình thiếu gì: đọc "thiếu 25 điểm ngân
 * sách", đi hỏi khách, quay về thì không có chỗ nào để ghi con số vừa hỏi được. Phải tự mò
 * sang màn sửa deal, mà ở đó ô duy nhất liên quan tới tiền lại là "Giá trị dự kiến" —
 * đúng ô bị CẤM chấm điểm. Điền vào đó thì chấm lại vẫn 0 điểm ngân sách.  #Huynh
 */
export function FillGapsDialog({
  open,
  onOpenChange,
  deal,
  gaps,
  isSaving = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
  gaps: QualificationScoreGaps;
  isSaving?: boolean;
  onSubmit: (values: FillGapsValues) => void;
}) {
  const fields = fieldsToFill(gaps);
  const [values, setValues] = useState<Record<FillField, string>>({
    client_budget: deal.clientBudget ?? "",
    desired_timeline: deal.desiredTimeline ?? "",
    notes: "",
  });

  const filled = fields.some((field) => values[field].trim());

  function submit() {
    const payload: FillGapsValues = {};
    if (fields.includes("client_budget") && values.client_budget.trim()) {
      payload.client_budget = values.client_budget.trim();
    }
    if (fields.includes("desired_timeline") && values.desired_timeline.trim()) {
      payload.desired_timeline = values.desired_timeline.trim();
    }
    if (fields.includes("notes") && values.notes.trim()) {
      payload.notes_append = values.notes.trim();
    }
    onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-primary" />
            Bổ sung thông tin khách đã cho
          </DialogTitle>
          {/* Nói trước cho rõ đây là HAI bước, và bước nào mới tốn tiền. Bản cũ viết "sau đó
              chấm lại để xem điểm lên bao nhiêu" nghe như bấm Lưu là điểm tự nhảy, nên lưu
              xong thấy điểm y nguyên là tưởng hỏng.  #Huynh */}
          <DialogDescription>
            Hỏi được khách rồi thì ghi vào đây — chỉ hiện những ô đang thiếu điểm. Lưu ở bước này
            không tốn lượt AI; điền xong hết thì bấm <strong>Đánh giá lại</strong> ở cửa sổ chính
            để chấm lại điểm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field) => {
            const ui = FILL_FIELD_UI[field];
            const gain = pointsToGain(gaps, field);
            return (
              <div key={field}>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`fill-${field}`}
                    className="text-sm font-medium"
                  >
                    {ui.label}
                  </label>
                  {/* Điền ô này được thêm bao nhiêu điểm. Không có con số này thì ba ô trông
                      ngang nhau, người dùng không biết nên đi hỏi khách cái gì trước — mà
                      công sức hỏi mỗi thứ một khác.  #Huynh */}
                  {gain > 0 && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-success">
                      +{gain}đ
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{ui.hint}</p>
                {/* Ô mô tả là ô VIẾT THÊM nên luôn mở ra trống. Người dùng gõ xong, lưu, mở
                    lại thấy trống trơn thì đinh ninh là không lưu được — trong khi chữ đã
                    nằm yên trong phần mô tả của deal. Bày phần mô tả đang có ra ngay trên ô
                    nhập thì thấy ngay chữ của mình ở đó, hết nghi.  #Huynh */}
                {field === "notes" && deal.notes.trim() && (
                  <details className="mt-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Mô tả đang có (bấm để xem)
                    </summary>
                    <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-line text-sm text-foreground">
                      {deal.notes.trim()}
                    </p>
                  </details>
                )}
                {ui.multiline ? (
                  <textarea
                    id={`fill-${field}`}
                    rows={4}
                    value={values[field]}
                    placeholder={ui.placeholder}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field]: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                ) : (
                  <input
                    id={`fill-${field}`}
                    type="text"
                    value={values[field]}
                    placeholder={ui.placeholder}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field]: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Để sau
          </button>
          <button
            type="button"
            disabled={isSaving || !filled}
            onClick={submit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {/* "Lưu thông tin", KHÔNG phải "Lưu và chấm lại": nút này chỉ PATCH deal rồi bật
                dải báo điểm đã cũ — việc chấm lại nằm ở nút "Đánh giá lại" bên cửa sổ chính
                và tốn một lượt AI thật. Nhãn cũ hứa nhiều hơn việc nó làm nên người dùng
                đứng chờ điểm mới không bao giờ tới.  #Huynh */}
            Lưu thông tin
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
