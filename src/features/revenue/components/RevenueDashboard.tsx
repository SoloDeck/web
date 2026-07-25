import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { formatVND } from "@/utils/format";
import {
  useDashboard,
  useRevenue,
  useWinRate,
  useMonthlyRevenue,
  usePipeline,
} from "@/features/revenue/hooks/useAnalytics";
import { MonthlyRevenueChart } from "@/features/revenue/components/MonthlyRevenueChart";
import { PipelineFunnel } from "@/features/revenue/components/PipelineFunnel";

export function RevenueDashboard() {
  const dashboard = useDashboard();
  const revenue = useRevenue();
  const winRate = useWinRate();
  const monthly = useMonthlyRevenue({ months: 12 });
  const pipeline = usePipeline();

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
  const totalClients = dashboard.data?.total_clients ?? 0;
  const pendingInvoices = dashboard.data?.pending_invoices ?? 0;
  const activeDeals = dashboard.data?.active_deals ?? 0;

  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto">
      {/* Trước đây có một hàng 4 ô số liệu ở đầu trang, nhưng chúng lặp lại phần lớn cái
          đã hiện trong các card bên dưới (đã thu, còn phải thu, win rate) và đẩy nội dung
          chính xuống dưới màn hình. Bỏ hàng đó, gấp vài số còn lẻ vào đúng card của nó —
          gọn hơn, và bản mobile không phải xử lý một lưới 4 cột.  #Huynh */}
      <div className="space-y-4">
        {/* Doanh thu theo tháng — biểu đồ chính, mắt đọc trước. */}
        {monthly.data && <MonthlyRevenueChart data={monthly.data} />}

        {/* Ba card một hàng: phễu pipeline · doanh thu · hiệu quả chốt deal. Card "Khách
            hàng doanh thu cao" đã bỏ — Phiếu (Bảng doanh thu) chỉ đòi hoá đơn theo tháng,
            tồn đọng, tỷ lệ thắng, quy mô deal TB; top khách hàng là phần thêm, mà bỏ đi thì
            trang vừa màn hình không phải cuộn.  #Huynh */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {pipeline.data && <PipelineFunnel data={pipeline.data} />}

          <div className="rounded-xl border border-border p-5">
            <div className="font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-warning" /> Doanh thu
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Đã xuất hoá đơn" value={formatVND(invoiced)} />
              <Row label="Đã thu" value={formatVND(collected)} tone="success" />
              <Row label="Còn phải thu" value={formatVND(outstanding)} tone="warning" />
              <div className="border-t border-dashed border-border" />
              <Row label="Tổng doanh thu" value={formatVND(dashboard.data?.total_revenue ?? 0)} tone="primary" />
            </div>
            <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {pendingInvoices} hoá đơn chờ thu · {totalClients} khách hàng
            </div>
          </div>

          <div className="rounded-xl border border-border p-5">
            <div className="font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" /> Hiệu quả chốt deal
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
            {/* Giá trị TB/deal + số deal đang chạy — trước đây nằm ở ô số liệu đầu trang,
                giờ về đúng card "deal". */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-3">
              <div>
                <div className="text-xs text-muted-foreground">Giá trị TB / deal</div>
                <div className="font-semibold">{formatVND(avgDealSize)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Deal đang chạy</div>
                <div className="font-semibold">{activeDeals}</div>
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
