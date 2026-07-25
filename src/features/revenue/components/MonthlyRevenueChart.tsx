import { useState } from "react";
import { BarChart3 } from "lucide-react";
import type { MonthlyRevenue } from "@/services/analyticsService";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";

/**
 * Doanh thu theo tháng — mục "hoá đơn theo tháng" của Phiếu.
 *
 * Mỗi tháng một cột xếp chồng MỘT HÔNG MÀU: phần đặc (primary) = đã thu, phần nhạt
 * (primary/20) = còn phải thu. Nhìn một cột là biết tháng đó xuất bao nhiêu và thu về
 * được bao nhiêu — không phải hai biểu đồ, không dùng hai màu categorical (nên không có
 * rủi ro mù màu). Chuỗi tháng do backend trả LIỀN MẠCH, tháng trống là cột 0.
 */
export function MonthlyRevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const [hover, setHover] = useState<number | null>(null);

  // Trục Y lấy theo tháng xuất cao nhất — cột cao nhất chạm trần, các cột khác so theo đó.
  const max = data.reduce((m, d) => Math.max(m, d.invoiced), 0);
  const totalInvoiced = data.reduce((s, d) => s + d.invoiced, 0);
  const totalCollected = data.reduce((s, d) => s + d.collected, 0);

  if (totalInvoiced === 0) {
    return (
      <ChartFrame>
        <div className="grid h-48 place-items-center text-sm text-muted-foreground">
          Chưa có hoá đơn nào trong khoảng thời gian này.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame totalInvoiced={totalInvoiced} totalCollected={totalCollected}>
      <div className="relative">
        {/* Vùng vẽ. Tooltip nổi theo cột đang hover. */}
        <div className="flex h-48 items-end gap-1.5">
          {data.map((month, index) => {
            const invoicedPct = max > 0 ? (month.invoiced / max) * 100 : 0;
            const collectedPct = month.invoiced > 0 ? (month.collected / month.invoiced) * 100 : 0;
            const outstanding = month.invoiced - month.collected;
            return (
              <div
                key={month.month}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Cột: chiều cao theo số đã xuất; bên trong chia đã-thu / chưa-thu. */}
                <div
                  className="w-full overflow-hidden rounded-t"
                  style={{ height: `${Math.max(invoicedPct, month.invoiced > 0 ? 3 : 0)}%` }}
                >
                  {/* Phần chưa thu ở trên (nhạt), đã thu ở dưới (đặc). 2px gap giữa hai
                      phần theo mark spec — dùng viền dưới màu nền. */}
                  {outstanding > 0 && (
                    <div
                      className="w-full bg-primary/20"
                      style={{ height: `${100 - collectedPct}%` }}
                    />
                  )}
                  <div
                    className={cn(
                      "w-full bg-primary transition-opacity",
                      outstanding > 0 && "border-t-2 border-card",
                      hover !== null && hover !== index && "opacity-40"
                    )}
                    style={{ height: `${collectedPct}%` }}
                  />
                </div>

                {hover === index && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-44 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-xs shadow-lg">
                    <div className="font-semibold">{monthLabel(month.month, true)}</div>
                    <div className="mt-1.5 space-y-1">
                      <Line swatch="bg-primary" label="Đã thu" value={month.collected} />
                      <Line swatch="bg-primary/20" label="Còn phải thu" value={outstanding} />
                      <div className="border-t border-dashed border-border pt-1">
                        <Line label="Đã xuất" value={month.invoiced} bold />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nhãn tháng dưới trục. */}
        <div className="mt-2 flex gap-1.5">
          {data.map((month, index) => (
            <div
              key={month.month}
              className={cn(
                "flex-1 text-center text-[10px]",
                hover === index ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {monthLabel(month.month)}
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function ChartFrame({
  children,
  totalInvoiced,
  totalCollected,
}: {
  children: React.ReactNode;
  totalInvoiced?: number;
  totalCollected?: number;
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" /> Doanh thu theo tháng
        </div>
        {/* Legend: bắt buộc vì có 2 phần (đã thu / còn phải thu). Cùng một hông màu, hai
            độ đậm — nhận diện bằng nhãn, không chỉ bằng màu. */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Đã thu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/20" /> Còn phải thu
          </span>
        </div>
      </div>
      {totalInvoiced !== undefined && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            Đã xuất: <span className="font-semibold text-foreground">{formatVND(totalInvoiced)}</span>
          </span>
          <span className="text-muted-foreground">
            Đã thu: <span className="font-semibold text-primary">{formatVND(totalCollected ?? 0)}</span>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

function Line({
  label,
  value,
  swatch,
  bold,
}: {
  label: string;
  value: number;
  swatch?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {swatch && <span className={cn("h-2 w-2 rounded-sm", swatch)} />}
        {label}
      </span>
      <span className={cn("tabular-nums", bold ? "font-semibold text-foreground" : "text-foreground")}>
        {formatVND(value)}
      </span>
    </div>
  );
}

/** "2026-07" → "T7" (trục) hoặc "Tháng 7/2026" (tooltip). */
function monthLabel(month: string, long = false): string {
  const [year, m] = month.split("-");
  const num = Number(m);
  return long ? `Tháng ${num}/${year}` : `T${num}`;
}
