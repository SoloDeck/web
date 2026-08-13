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
          <DialogDescription>
            Hỏi được khách rồi thì ghi vào đây, sau đó chấm lại để xem điểm lên bao nhiêu. Chỉ
            hiện những ô đang thiếu điểm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field) => {
            const ui = FILL_FIELD_UI[field];
            return (
              <div key={field}>
                <label
                  htmlFor={`fill-${field}`}
                  className="text-sm font-medium"
                >
                  {ui.label}
                </label>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{ui.hint}</p>
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
            Lưu và chấm lại
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
