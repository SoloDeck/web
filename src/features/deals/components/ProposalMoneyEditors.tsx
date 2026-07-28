import { AlertTriangle, Check, Plus, Trash2 } from "lucide-react";
import { formatVND } from "@/utils/format";
import { paymentPercentIssue, type PaymentMilestone } from "@/features/deals/proposalHtml";

/**
 * Hai editor có cấu trúc cho phần TIỀN của báo giá — sửa ở màn review (Stage 4).
 *
 * Vì sao KHÔNG sửa thẳng trong bảng ở tờ báo giá (như các đoạn chữ): bảng có thêm/xoá dòng,
 * và số tiền phải chia lại theo giá đã chốt — làm inline trong iframe `contentEditable` thì
 * rất dễ vỡ. Ở đây là panel gọn; sửa tới đâu tờ báo giá (do server dựng) refetch vẽ lại tới
 * đó, nên vẫn "thấy sao nhận vậy".  #Huynh
 */

const inputClass =
  "min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary";

/**
 * Chia đều `total` cho `n` hạng mục, làm tròn tới 1.000 ₫, dòng CUỐI gánh phần lẻ.
 *
 * PHẢI khớp TUYỆT ĐỐI với backend (`pdf_content._structured_pricing`) — panel và tờ báo giá
 * cùng một con số thì mới không mâu thuẫn nhau.  #Huynh
 */
function splitEqually(total: number, n: number): number[] {
  if (n <= 0 || total <= 0) return new Array(Math.max(n, 0)).fill(0);
  const out: number[] = [];
  let allocated = 0;
  for (let i = 0; i < n; i += 1) {
    if (i === n - 1) {
      out.push(total - allocated);
    } else {
      const amount = Math.round(total / n / 1000) * 1000;
      out.push(amount);
      allocated += amount;
    }
  }
  return out;
}

export function LineItemsEditor({
  items,
  total,
  onChange,
  disabled,
}: {
  /** Danh sách NHÃN hạng mục. Số tiền tự chia, không gõ tay. */
  items: string[];
  total: number;
  onChange: (items: string[]) => void;
  disabled?: boolean;
}) {
  const amounts = splitEqually(total, items.length);
  const replaceAt = (index: number, value: string) =>
    onChange(items.map((item, i) => (i === index ? value : item)));

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {items.map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={label}
              disabled={disabled}
              placeholder={`Hạng mục ${index + 1}`}
              onChange={(event) => replaceAt(index, event.target.value)}
              className={inputClass}
            />
            {/* Cột tiền hẹp lại (w-24, chữ nhỏ): panel này giờ nằm trong cột trái ~400px của
              modal báo giá, để w-32 là ô nhập nhãn bị bóp còn không đủ đọc.  #Huynh */}
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {total > 0 ? formatVND(amounts[index]) : "—"}
            </span>
            <button
              type="button"
              disabled={disabled || items.length <= 1}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
              aria-label="Xoá hạng mục"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm hạng mục
        </button>
        <span className="text-xs text-muted-foreground">
          Tổng <span className="font-semibold text-foreground">{formatVND(total)}</span> · chia đều
          theo số hạng mục
        </span>
      </div>
    </div>
  );
}

export function MilestonesEditor({
  milestones,
  onChange,
  disabled,
}: {
  milestones: PaymentMilestone[];
  onChange: (milestones: PaymentMilestone[]) => void;
  disabled?: boolean;
}) {
  const patchAt = (index: number, patch: Partial<PaymentMilestone>) =>
    onChange(milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  // Luật 100% dùng CHUNG với nút gửi và với guard bên backend — không tự cộng lại ở đây,
  // ba chỗ tính khác nhau một chút là ra ba câu trả lời khác nhau về TIỀN.  #Huynh
  const issue = paymentPercentIssue(milestones);
  const sumPercent = milestones.reduce((sum, m) => sum + (m.percent ?? 0), 0);
  const hasPercent = milestones.some((m) => m.percent != null);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {/* Mỗi đợt = một khối HAI DÒNG (mô tả / tỷ lệ + thời điểm), không còn nhồi bốn thứ
          trên một hàng. Panel này nằm trong cột trái ~400px của modal báo giá: xếp ngang thì
          mỗi ô còn ~80px, gõ "Khi nghiệm thu & bàn giao" vào đó là vô phương đọc lại.  #Huynh */}
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className="space-y-1.5 rounded-md border border-border/60 bg-background/40 p-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={milestone.label}
                disabled={disabled}
                placeholder={`Đợt ${index + 1} — mô tả`}
                onChange={(event) => patchAt(index, { label: event.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                disabled={disabled || milestones.length <= 1}
                onClick={() => onChange(milestones.filter((_, i) => i !== index))}
                className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label="Xoá đợt"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex w-20 shrink-0 items-center gap-1">
                <input
                  value={milestone.percent ?? ""}
                  disabled={disabled}
                  inputMode="numeric"
                  placeholder="%"
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    patchAt(index, { percent: digits === "" ? null : Number(digits) });
                  }}
                  className={`${inputClass} text-right`}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <input
                value={milestone.due ?? ""}
                disabled={disabled}
                placeholder="Thời điểm / điều kiện"
                onChange={(event) => patchAt(index, { due: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange([...milestones, { label: "", percent: null, amount: "", due: "" }])
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm đợt
        </button>
        {hasPercent && !issue && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-600" /> Tổng tỷ lệ: {sumPercent}%
          </span>
        )}
      </div>

      {/* Sai tổng là CHẶN GỬI, nên phải nói thẳng bằng màu lỗi chứ không phải một dòng cam
        mờ như trước — người dùng cần biết vì sao nút gửi bị khoá.  #Huynh */}
      {issue && (
        <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs font-medium leading-4 text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{issue.message}</span>
        </p>
      )}
    </div>
  );
}
