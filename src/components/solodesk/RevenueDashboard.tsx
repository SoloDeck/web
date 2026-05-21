import { useMemo } from "react";
import { X, TrendingUp, Wallet, Target, BarChart3, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatVND, type Deal } from "@/lib/mock-data";

export function RevenueDashboard({
  open,
  onClose,
  deals,
}: {
  open: boolean;
  onClose: () => void;
  deals: Deal[];
}) {
  const stats = useMemo(() => {
    const completed = deals.filter((d) => d.stage === "completed");
    const billed = completed.reduce((s, d) => s + d.value, 0);
    const outstanding = deals
      .filter((d) => d.paymentStatus !== "Đã thanh toán" && d.stage !== "new_lead")
      .reduce((s, d) => s + d.value, 0);
    const pipeline = deals
      .filter((d) => d.stage !== "completed")
      .reduce((s, d) => s + d.value, 0);
    const won = completed.length;
    const lost = 2; // mock
    const winRate = Math.round((won / Math.max(won + lost, 1)) * 100);
    const avgDealSize = won > 0 ? Math.round(billed / won) : 0;

    const byMethod = deals
      .filter((d) => d.paymentMethod !== "—")
      .reduce<Record<string, { count: number; total: number }>>((acc, d) => {
        acc[d.paymentMethod] = acc[d.paymentMethod] || { count: 0, total: 0 };
        acc[d.paymentMethod].count++;
        acc[d.paymentMethod].total += d.value;
        return acc;
      }, {});

    return { billed, outstanding, pipeline, winRate, avgDealSize, won, lost, byMethod };
  }, [deals]);

  if (!open) return null;

  const outstanding = deals.filter(
    (d) => d.paymentStatus !== "Đã thanh toán" && d.stage !== "new_lead"
  );

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-xs text-muted-foreground">Doanh thu & Thanh toán</div>
            <div className="font-semibold">Bảng điều khiển tài chính</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric
              icon={Wallet}
              label="Doanh thu tháng"
              value={formatVND(stats.billed)}
              hint={`${stats.won} dự án đã xuất hoá đơn`}
              tone="primary"
            />
            <Metric
              icon={Clock}
              label="Còn phải thu"
              value={formatVND(stats.outstanding)}
              hint={`${outstanding.length} khoản chưa thu đủ`}
              tone="warning"
            />
            <Metric
              icon={Target}
              label="Win rate"
              value={`${stats.winRate}%`}
              hint={`${stats.won} thắng · ${stats.lost} thua`}
              tone="success"
            />
            <Metric
              icon={BarChart3}
              label="Giá trị TB / deal"
              value={formatVND(stats.avgDealSize)}
              hint={`Pipeline: ${formatVND(stats.pipeline)}`}
              tone="default"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Khoản phải thu
                </div>
                <div className="text-xs text-muted-foreground">{outstanding.length} mục</div>
              </div>
              <div className="space-y-2">
                {outstanding.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    Tất cả khoản đã được thanh toán đủ 🎉
                  </div>
                )}
                {outstanding.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-secondary/30"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{d.client}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {d.projectType} · {d.paymentStatus}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-semibold text-sm text-primary">{formatVND(d.value)}</div>
                      <div className="text-[10px] text-muted-foreground">{d.paymentMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-5">
              <div className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" /> Theo phương thức
              </div>
              <div className="space-y-3">
                {Object.entries(stats.byMethod).map(([method, v]) => {
                  const pct = stats.billed + stats.outstanding > 0
                    ? Math.round((v.total / (stats.billed + stats.outstanding)) * 100)
                    : 0;
                  const color =
                    method === "MoMo"
                      ? "bg-pink-500"
                      : method === "Vietcombank"
                        ? "bg-emerald-500"
                        : "bg-blue-500";
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{method}</span>
                        <span className="text-muted-foreground">{formatVND(v.total)} · {v.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.byMethod).length === 0 && (
                  <div className="text-xs text-muted-foreground">Chưa có dữ liệu thanh toán.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-5">
            <div className="font-semibold flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-success" /> Doanh thu đã ghi nhận
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {deals
                .filter((d) => d.stage === "completed")
                .map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md bg-success/5 border border-success/15 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.client}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{d.paymentMethod}</div>
                    </div>
                    <div className="text-sm font-semibold text-success">{formatVND(d.value)}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "warning" | "success" | "default";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary bg-primary/10"
      : tone === "warning"
        ? "text-warning-foreground bg-warning/15"
        : tone === "success"
          ? "text-success bg-success/10"
          : "text-foreground bg-secondary";

  return (
    <div className="rounded-xl border border-border p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs text-muted-foreground mt-3">{label}</div>
      <div className="text-xl font-bold tracking-tight mt-0.5">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
