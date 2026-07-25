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
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Filter className="h-4 w-4 text-primary" /> Phễu deal theo giai đoạn
        </div>
        <div className="text-xs text-muted-foreground">{totalActive} deal đang chạy</div>
      </div>

      {totalActive === 0 ? (
        <div className="grid h-32 place-items-center text-sm text-muted-foreground">
          Chưa có deal nào trong pipeline.
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
            return (
              <div key={row.stage} className="group">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.count} deal
                    {row.value > 0 && (
                      <span className="ml-2 text-foreground">{formatVND(row.value)}</span>
                    )}
                  </span>
                </div>
                {/* Thanh mảnh, đầu bo tròn, neo về mép trái. Cột 0 vẫn để lại một vệt mờ
                    để hàng không trống trơn. */}
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all group-hover:opacity-90"
                    style={{ width: `${Math.max(pct, row.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {lost && lost.deal_count > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3 text-sm">
              <span className="text-muted-foreground">Không chốt được</span>
              <span className="tabular-nums text-muted-foreground">{lost.deal_count} deal</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
