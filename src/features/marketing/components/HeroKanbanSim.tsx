import { useRef, type CSSProperties } from "react";

import { LEVEL_UI } from "@/features/ai/qualificationUi";
import { PIPELINE_STAGES } from "@/features/marketing/content";
import { useKanbanSimulation } from "@/features/marketing/hooks/useKanbanSimulation";
import { useVisibleColumns } from "@/features/marketing/hooks/useVisibleColumns";
import {
  layoutSim,
  simBudget,
  SIM_CARD_H_REM,
  SIM_COL_W_REM,
  SIM_ROW_GAP_REM,
  type SimDeal,
} from "@/features/marketing/simulation";
import { cn } from "@/lib/utils";

/**
 * Bảng Kanban mô phỏng, tự chạy, thay cho ô ảnh dashboard rỗng trước đây.
 *
 * Chuyển động là `transition-transform` trên các thẻ định vị tuyệt đối — KHÔNG thêm
 * `@keyframes` nào. Thẻ trôi liên tục sang cột kế thay vì biến mất rồi hiện lại.
 */
export function HeroKanbanSim() {
  const trackRef = useRef<HTMLDivElement>(null);
  const cols = PIPELINE_STAGES.length;
  const tick = useKanbanSimulation(cols);
  const visible = useVisibleColumns(trackRef, SIM_COL_W_REM, cols);

  const placements = layoutSim(tick, cols);

  // Màn hẹp thì bảng tự trượt bám thẻ dẫn đầu; màn rộng đủ chỗ cả sáu cột nên pan = 0.
  // Cố ý KHÔNG thu nhỏ bằng scale() — chữ trong thẻ sẽ không đọc nổi trên điện thoại.
  const focusCol = placements[0]?.col ?? 0;
  const pan = Math.min(Math.max(focusCol - visible + 1, 0), Math.max(cols - visible, 0));

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-card/85 p-4 shadow-xl shadow-black/[0.06] backdrop-blur-sm sm:p-5"
      style={{ "--col-w": `${SIM_COL_W_REM}rem` } as CSSProperties}
    >
      {/* Bảng là hình minh hoạ; phần dưới aria-hidden nên câu này thay nó cho trình đọc màn hình. */}
      <p className="sr-only">
        Minh hoạ bảng Kanban sáu giai đoạn: {PIPELINE_STAGES.map((s) => s.title).join(", ")}.
      </p>

      <div ref={trackRef} className="overflow-hidden" aria-hidden="true">
        <div
          className="transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(calc(var(--col-w) * ${-pan}))` }}
        >
          <div className="flex">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="w-(--col-w) shrink-0 px-1">
                <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-1.5">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", stage.dotClass)} />
                  <span className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {stage.shortTitle}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Lớp thẻ định vị tuyệt đối, chiều cao cố định để cột không co giãn theo số thẻ. */}
          <div className="relative h-[11.5rem]">
            {placements.map(({ deal, col, row }) => (
              <div
                key={deal.id}
                data-testid={`sim-card-${deal.id}`}
                className="absolute top-0 left-0 w-(--col-w) px-1 transition-transform duration-500 ease-out motion-reduce:transition-none"
                style={{
                  transform: `translate(calc(var(--col-w) * ${col}), ${
                    row * (SIM_CARD_H_REM + SIM_ROW_GAP_REM)
                  }rem)`,
                }}
              >
                <SimCard deal={deal} scored={col >= 1} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Thẻ deal thu nhỏ, nhại `DealCard` thật.
 *
 * `scored` lấy đúng luật `shouldShowLeadScore` của bảng thật: ở cột "Deal Mới" thì
 * CHƯA chấm nên không dán nhãn, sang "Đã Đánh Giá" mới hiện. Nhờ vậy hiệu ứng ở hero
 * không phải đồ trang trí mà đúng là thứ bảng thật làm.
 *
 * Khi `scored` lật false→true, React mount một badge mới nên `animate-in zoom-in-50`
 * tự chạy lại — không cần nghịch `key`.
 */
function SimCard({ deal, scored }: { deal: SimDeal; scored: boolean }) {
  const ui = LEVEL_UI[deal.score];
  const Icon = ui.icon;

  return (
    // Nhấc `0.5` chứ không phải `1.5` như các thẻ khác trên trang, và bóng dừng ở `md`:
    // lớp cha là `overflow-hidden` với mép cắt sát ngay hàng thẻ trên cùng, nhấc cao hơn
    // là hàng đầu bị xén ngang, nhìn ra như lỗi dựng chứ không ra hiệu ứng. Phần "nổi lên"
    // chủ yếu do viền đổi màu gánh — mà viền thì không bị mép cắt ăn mất.
    //
    // Đặt ở ĐÂY, không đặt lên khối bọc bên ngoài: khối đó mang `transform` inline để chạy
    // hiệu ứng đổi cột, thêm class transform vào là hai bên ghi đè nhau.  #Huynh
    <article className="h-[5rem] overflow-hidden rounded-xl border border-border bg-card p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-black/[0.08] motion-reduce:transition-none">
      {/* Tiêu đề chiếm trọn dòng: cột chỉ rộng 8.75rem, để badge chen ngang là tên dự án
          tiếng Việt bị cắt gần hết. Badge xuống nằm cạnh giá thì cả hai đều đọc được.
          line-clamp-1 vẫn cần vì tên dài rất dễ xuống dòng và tràn thẻ.  #Huynh */}
      <h4 className="line-clamp-1 text-[11px] leading-snug font-bold">{deal.project}</h4>
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{deal.client}</p>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-bold text-primary tabular-nums">
          {simBudget(deal.value)}
        </span>
        {scored && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
              "animate-in fade-in zoom-in-50 duration-300",
              ui.badgeClass,
            )}
          >
            <Icon className="h-2 w-2" />
            {ui.label}
          </span>
        )}
      </div>
    </article>
  );
}
