import { Wallet, Target, BarChart3, Clock, AlertTriangle, Users, Loader2, Sparkles } from "lucide-react";
import { formatVND } from "@/utils/format";
import {
  useDashboard,
  useRevenue,
  useWinRate,
  useTopClients,
} from "@/features/revenue/hooks/useAnalytics";

export function RevenueDashboard() {
  const dashboard = useDashboard();
  const revenue = useRevenue();
  const winRate = useWinRate();
  const topClients = useTopClients({ limit: 5, metric: "total_collected" });

  const isLoading =
    dashboard.isLoading || revenue.isLoading || winRate.isLoading;
  const isError = dashboard.isError || revenue.isError || winRate.isError;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 h-full grid place-items-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu doanh thu...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 lg:p-6 h-full grid place-items-center text-sm text-muted-foreground">
        Không thể tải dữ liệu doanh thu. Vui lòng thử lại.
      </div>
    );
  }

  const collected = revenue.data?.total_collected ?? 0;
  const outstanding = revenue.data?.total_outstanding ?? 0;
  const invoiced = revenue.data?.total_invoiced ?? 0;

  const won = winRate.data?.won ?? 0;
  const lost = winRate.data?.lost ?? 0;
  // win_rate is a 0..1 fraction from the API — render it as a percentage.
  const winRatePct = Math.round((winRate.data?.win_rate ?? 0) * 100);

  const avgDealSize = won > 0 ? Math.round(collected / won) : 0;
  const clients = topClients.data ?? [];
  const maxClientRevenue = clients.reduce((m, c) => Math.max(m, c.revenue), 0);

  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric
            icon={Wallet}
            label="Doanh thu đã thu"
            value={formatVND(collected)}
            hint={`${dashboard.data?.total_clients ?? 0} khách hàng`}
            tone="primary"
          />
          <Metric
            icon={Clock}
            label="Còn phải thu"
            value={formatVND(outstanding)}
            hint={`${dashboard.data?.pending_invoices ?? 0} hoá đơn chờ thu`}
            tone="warning"
          />
          <Metric
            icon={Target}
            label="Win rate"
            value={`${winRatePct}%`}
            hint={`${won} thắng · ${lost} thua`}
            tone="success"
          />
          <Metric
            icon={BarChart3}
            label="Giá trị TB / deal"
            value={formatVND(avgDealSize)}
            hint={`${dashboard.data?.active_deals ?? 0} deal đang chạy`}
            tone="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Khách hàng doanh thu cao
              </div>
              <div className="text-xs text-muted-foreground">{clients.length} mục</div>
            </div>
            <div className="space-y-2">
              {clients.length === 0 && (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Chưa có dữ liệu doanh thu theo khách hàng.
                </div>
              )}
              {clients.map((c) => {
                const pct = maxClientRevenue > 0 ? Math.round((c.revenue / maxClientRevenue) * 100) : 0;
                return (
                  <div
                    key={c.client_id}
                    className="rounded-lg border border-border px-3 py-2.5 hover:bg-secondary/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="font-semibold text-sm text-primary shrink-0">{formatVND(c.revenue)}</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border p-5">
            <div className="font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-warning" /> Tổng quan
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Đã xuất hoá đơn" value={formatVND(invoiced)} />
              <Row label="Đã thu" value={formatVND(collected)} tone="success" />
              <Row label="Còn phải thu" value={formatVND(outstanding)} tone="warning" />
              <div className="border-t border-dashed border-border" />
              <Row label="Tổng doanh thu" value={formatVND(dashboard.data?.total_revenue ?? 0)} tone="primary" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-5">
          <div className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" /> Tỷ lệ chốt deal
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold tracking-tight">{winRatePct}%</div>
            <div className="flex-1">
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-success" style={{ width: `${winRatePct}%` }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">
                {won} deal thắng · {lost} deal thua
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${cls}`}>{value}</span>
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
