import { Filter } from "lucide-react";
import type { PipelineStageStat } from "@/services/analyticsService";
import { STAGE_BY_ID, STAGES, type Stage } from "@/features/deals/types";
import { formatVND } from "@/utils/format";

/**
 * Phễu pipeline — số deal đang nằm ở từng giai đoạn.
 *
 * Dùng endpoint /analytics/pipeline vốn ĐÃ CÓ từ trước nhưng dashboard chưa hề vẽ.
 * Thanh ngang, một hông màu (primary), xếp theo đúng THỨ TỰ vòng đời deal (không xếp theo
 * số lượng) — phễu chỉ có nghĩa khi đọc từ đầu tới cuối quy trình. `lost` để riêng dưới
 * cùng vì nó không nằm trên dòng chảy của phễu.
 */

// Thứ tự vòng đời, bỏ `lost` ra khỏi thân phễu (xử lý riêng).
const FUNNEL_ORDER: Stage[] = STAGES.map((s) => s.id).filter((id) => id !== "lost");

export function PipelineFunnel({ data }: { data: PipelineStageStat[] }) {
  const byStage = new Map(data.map((row) => [row.stage, row]));
  const rows = FUNNEL_ORDER.map((stage) => ({
    stage,
    label: STAGE_BY_ID[stage]?.shortTitle ?? stage,
    count: byStage.get(stage)?.deal_count ?? 0,
    value: byStage.get(stage)?.total_value ?? 0,
  }));
  const lost = byStage.get("lost");

  // Bề rộng thanh so theo giai đoạn ĐÔNG deal nhất — để chênh lệch nhìn rõ.
  const maxCount = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const totalActive = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Filter className="h-4 w-4 text-primary" /> Phễu deal theo giai đoạn
        </div>
        <div className="text-xs text-muted-foreground">{totalActive} deal đang chạy</div>
      </div>

      {totalActive === 0 ? (
        <div className="grid h-20 place-items-center text-sm text-muted-foreground">
          Chưa có deal nào trong pipeline.
        </div>
      ) : (
        /* XẾP NGANG, không xếp dọc.
           Bản trước là 6 hàng chồng lên nhau, ăn ~290px chiều cao — chính chỗ đó làm cả
           trang phải cuộn khi thêm card Top khách hàng. Nằm ngang thì mỗi giai đoạn là một
           cột, đọc từ trái sang phải đúng chiều vòng đời deal, và cả phễu gọn trong ~130px.
             #Huynh */
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
          {rows.map((row) => {
            const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
            return (
              <div key={row.stage} className="min-w-0">
                <div className="truncate text-xs font-medium" title={row.label}>
                  {row.label}
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums leading-tight">
                  {row.count}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(pct, row.count > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <div className="mt-1 truncate text-[11px] tabular-nums text-muted-foreground">
                  {row.value > 0 ? formatVND(row.value) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lost && lost.deal_count > 0 && (
        <div className="mt-3 border-t border-dashed border-border pt-2 text-[11px] text-muted-foreground">
          Không chốt được: <span className="tabular-nums">{lost.deal_count} deal</span>
        </div>
      )}
    </div>
  );
}
