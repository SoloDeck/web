import { Loader2, Sparkles, Users, Wallet } from "lucide-react";
import { formatVND } from "@/utils/format";
import {
  useDashboard,
  useRevenue,
  useWinRate,
  useMonthlyRevenue,
  usePipeline,
  useTopClients,
} from "@/features/revenue/hooks/useAnalytics";
import { MonthlyRevenueChart } from "@/features/revenue/components/MonthlyRevenueChart";
import { PipelineFunnel } from "@/features/revenue/components/PipelineFunnel";

/**
 * Bảng doanh thu — MỘT MÀN, KHÔNG CUỘN.
 *
 * Hai điều chi phối bố cục này:
 *
 * 1. **Tiền lấy từ MỐC THANH TOÁN, không phải hoá đơn.** Từ Phase B, hoàn thành dự án đo
 *    bằng task "Thu tiền:" chứ không đòi hoá đơn nữa. Bản trước đọc `total_outstanding`
 *    (hiệu của hai cột hoá đơn) nên hiện "Còn phải thu: 0 đ" trong khi phễu ngay bên cạnh
 *    ghi 7 deal đang triển khai trị giá 1,24 tỷ. Màn hình nói sai về tiền là lỗi nặng nhất
 *    một CRM có thể mắc.
 *
 * 2. **Không được cuộn.** Anh Huynh chốt: mở ra là thấy hết. Nên `h-full` + ba hàng cố
 *    định, phần nào dài thì cuộn TRONG card của nó (Top khách hàng), trang đứng yên.
 *      #Huynh
 */
export function RevenueDashboard() {
  const dashboard = useDashboard();
  const revenue = useRevenue();
  const winRate = useWinRate();
  const monthly = useMonthlyRevenue({ months: 12 });
  const pipeline = usePipeline();
  const topClients = useTopClients({ limit: 8 });

  const isLoading = dashboard.isLoading || revenue.isLoading || winRate.isLoading;
  const isError = dashboard.isError || revenue.isError || winRate.isError;

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center p-4 text-muted-foreground lg:p-6">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu doanh thu...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid h-full place-items-center p-4 text-sm text-muted-foreground lg:p-6">
        Không thể tải dữ liệu doanh thu. Vui lòng thử lại.
      </div>
    );
  }

  const contracted = revenue.data?.total_contracted ?? 0;
  const collected = revenue.data?.milestone_collected ?? 0;
  const outstanding = revenue.data?.milestone_outstanding ?? 0;
  const pendingMilestones = revenue.data?.milestones_pending ?? 0;

  const won = winRate.data?.won ?? 0;
  const lost = winRate.data?.lost ?? 0;
  const winRatePct = Math.round((winRate.data?.win_rate ?? 0) * 100);
  const activeDeals = dashboard.data?.active_deals ?? 0;
  const totalClients = dashboard.data?.total_clients ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      {/* HÀNG 1 — bốn con số phải trả lời được ngay: đã ký bao nhiêu, về bao nhiêu,
          còn bao nhiêu, đang chạy mấy việc. */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Tổng đã ký" value={formatVND(contracted)} hint={`${activeDeals} deal đang chạy`} />
        <Kpi label="Đã thu" value={formatVND(collected)} tone="success" hint="Mốc đã tick xong" />
        <Kpi
          label="Còn phải thu"
          value={formatVND(outstanding)}
          tone="warning"
          hint={`${pendingMilestones} mốc chưa thu`}
        />
        <Kpi
          label="Tỷ lệ chốt deal"
          value={`${winRatePct}%`}
          hint={`${won} thắng · ${lost} thua`}
        />
      </div>

      {/* HÀNG 2 — chiếm hết chỗ còn lại: biểu đồ chứng từ + xếp hạng khách. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col lg:col-span-7">
          {monthly.data && <MonthlyRevenueChart data={monthly.data} />}
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border border-border p-4 lg:col-span-5">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" /> Khách hàng mang lại nhiều tiền nhất
            </div>
            <span className="text-xs text-muted-foreground">{totalClients} khách</span>
          </div>

          {/* Cuộn TRONG card, không đẩy cả trang xuống. */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {(topClients.data ?? []).length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                Chưa có khách nào đã ký hợp đồng.
              </div>
            ) : (
              (topClients.data ?? []).map((client, index) => (
                <div
                  key={client.client_id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{client.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {client.deal_count} dự án
                      {client.outstanding > 0 && (
                        <span className="text-warning-foreground">
                          {" "}
                          · còn nợ {formatVND(client.outstanding)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-success">
                    {formatVND(client.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* HÀNG 3 — phễu nằm ngang, gọn ~130px. */}
      <div className="shrink-0">{pipeline.data && <PipelineFunnel data={pipeline.data} />}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const valueCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : "text-foreground";
  const Icon = tone === "default" ? Sparkles : Wallet;
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 truncate text-xl font-bold tabular-nums ${valueCls}`} title={value}>
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
