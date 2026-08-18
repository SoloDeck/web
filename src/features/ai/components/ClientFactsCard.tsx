import { PencilLine, Sparkles } from "lucide-react";

import type { ScoreItem } from "@/features/ai/components/QualificationResult";
import { FILL_FIELD_SHORT_LABEL, type FillField } from "@/features/ai/gapFillFields";
import type { Deal } from "@/features/deals/types";
import { cn } from "@/lib/utils";

/**
 * Ô nhập nào ăn vào tiêu chí chấm điểm nào.
 *
 * Bảng này để tra ngược: có dữ kiện "ngân sách" trong tay thì đi tìm dòng "budget" trong
 * bảng chấm điểm để biết nó đang được bao nhiêu điểm. Khoá trùng với `FILL_FIELD` bên
 * backend (src/ai/lead_qualifier/scoring.py) — sửa một bên thì phải sửa cả hai.
 */
const FIELD_TO_CRITERIA: Record<FillField, string[]> = {
  client_budget: ["budget"],
  desired_timeline: ["timeline"],
  // Ô mô tả vá tới BA tiêu chí. Chỉ lấy mỗi "scope" thì con số ở đây bé hơn hẳn số "+Nđ"
  // mà hộp bổ sung hứa (nó cộng cả ba) — hai chỗ nói hai số khác nhau cho cùng một ô.
  notes: ["scope", "detail", "context"],
};

/** Điểm gộp của các tiêu chí mà một ô nhập vá được, `null` nếu bảng chấm không có dòng nào. */
function criterionScore(
  breakdown: ScoreItem[],
  field: FillField
): { label: string; points: number; max: number } | null {
  const rows = FIELD_TO_CRITERIA[field]
    .map((key) => breakdown.find((item) => item.key === key))
    .filter((item): item is ScoreItem => Boolean(item));
  if (!rows.length) return null;

  return {
    // Gộp nhiều tiêu chí thì gọi chung là "Tổng cộng" — liệt kê cả ba nhãn ra thì dòng dài
    // hơn cả dữ kiện nó đang chú thích.
    label: rows.length === 1 ? rows[0].label : "Tổng cộng",
    points: rows.reduce((sum, item) => sum + item.points, 0),
    max: rows.reduce((sum, item) => sum + item.max_points, 0),
  };
}

/** Nhãn điểm "25/25", hoặc dấu nhắc khi điểm đang là của lần chấm trước. */
function ScoreTag({
  item,
  stale,
}: {
  item: { label: string; points: number; max: number } | null;
  stale: boolean;
}) {
  if (!item) return null;

  // Vừa bổ sung mà chưa chấm lại thì con điểm bên bảng CHƯA tính phần mới. Bày nó ra cạnh
  // dữ kiện vừa thêm là nói dối bằng con số — thà nói thẳng "chưa chấm".
  if (stale) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        chưa chấm lại
      </span>
    );
  }

  const full = item.points >= item.max;
  // Chưa đủ điểm thì đẩy màu ngữ nghĩa sang viền + nền, chữ giữ `text-foreground`: token
  // --warm là oklch L=0.75, dùng làm màu chữ trên nền sáng chỉ được ~2.3:1, đọc không nổi.
  // Cùng cách đã chốt cho nhãn "thiết yếu" trong QualificationResult.tsx.
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        full
          ? "bg-success/10 text-success"
          : "border border-warm bg-warm/15 text-foreground"
      )}
    >
      {item.label} {item.points}/{item.max}
    </span>
  );
}

/**
 * Khung "Thông tin khách đã cho": bày ra đúng những dữ kiện freelancer đã chép vào hệ thống,
 * kèm số điểm mà mỗi dữ kiện đang mang lại, và đánh dấu cái nào vừa thêm trong phiên này.
 *
 * Vì sao cần: bảng chấm điểm chỉ nói tiêu chí nào được bao nhiêu, dải delta chỉ nói
 * "63 → 73 +10". Người dùng bổ sung xong thấy điểm nhảy nhưng không thấy lại thứ mình vừa
 * gõ, nên không nối được nhân với quả — nhất là phần mô tả, vì ô đó luôn mở ra trống (nó là
 * ô VIẾT THÊM, không phải ô sửa) nên nhìn cứ như chưa lưu được gì.  #Huynh
 *
 * CỐ Ý không gọi thêm API: mọi thứ đã nằm sẵn trên `deal` và trên kết quả chấm điểm.
 */
export function ClientFactsCard({
  deal,
  justAdded,
  justAddedNotes,
  breakdown,
  scoresAreStale,
  canEdit,
  onEdit,
}: {
  deal: Deal;
  /** Những ô vừa được lưu trong phiên này — để gắn nhãn "vừa thêm". */
  justAdded: FillField[];
  /** Nguyên văn phần mô tả vừa viết thêm (trên `deal.notes` nó đã trộn vào đoạn cũ). */
  justAddedNotes: string;
  breakdown: ScoreItem[];
  /** Đã bổ sung nhưng chưa chấm lại → điểm đang hiện là của lần chấm trước. */
  scoresAreStale: boolean;
  /**
   * Còn khoảng thiếu nào để điền không. Hộp bổ sung CHỈ dựng ô cho tiêu chí đang thiếu
   * điểm, nên deal đã đủ điểm mà vẫn bày nút thì bấm vào ra một hộp thoại trống trơn.
   */
  canEdit: boolean;
  onEdit: () => void;
}) {
  const facts: { field: FillField; value: string }[] = [
    { field: "client_budget" as const, value: deal.clientBudget?.trim() ?? "" },
    { field: "desired_timeline" as const, value: deal.desiredTimeline?.trim() ?? "" },
  ].filter((fact) => fact.value);

  const addedNotes = justAddedNotes.trim();

  // Chưa có dữ kiện nào thì khung này không có gì để nói. Ẩn hẳn, đừng bày khung rỗng.
  if (facts.length === 0 && !addedNotes) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">Thông tin khách đã cho</div>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Sửa / bổ sung
          </button>
        )}
      </div>

      <dl className="mt-3 space-y-2.5">
        {facts.map((fact) => {
          const isNew = justAdded.includes(fact.field);
          return (
            <div key={fact.field} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {FILL_FIELD_SHORT_LABEL[fact.field]}
              </dt>
              <dd className={cn("text-sm font-semibold", isNew ? "text-primary" : "text-foreground")}>
                {fact.value}
              </dd>
              <ScoreTag item={criterionScore(breakdown, fact.field)} stale={scoresAreStale} />
              {isNew && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  vừa thêm
                </span>
              )}
            </div>
          );
        })}

        {/* Mô tả để riêng một khối: nó là đoạn văn, không xếp cùng hàng với các dòng ngắn
            được. In nguyên văn ra thay vì chỉ báo "đã lưu" — người dùng cần ĐỌC LẠI thứ
            mình vừa gõ, vì mở lại hộp bổ sung thì ô đó trống trơn. */}
        {addedNotes && (
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Yêu cầu bạn viết thêm
              </dt>
              <ScoreTag item={criterionScore(breakdown, "notes")} stale={scoresAreStale} />
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                vừa thêm
              </span>
            </div>
            <dd className="mt-1 whitespace-pre-line rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              {addedNotes}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
