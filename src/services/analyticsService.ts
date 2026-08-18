import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Backend response shapes (GET /analytics/*, all authenticated)
// ---------------------------------------------------------------------------

export type DashboardSummary = {
  total_clients: number;
  active_deals: number;
  total_revenue: number;
  pending_invoices: number;
};

export type RevenueSummary = {
  /** Theo HOÁ ĐƠN (chứng từ đã xuất) — giữ nguyên ngữ nghĩa cũ. */
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  /**
   * Theo MỐC THANH TOÁN của hợp đồng đã ký — nguồn chính của bảng doanh thu.
   *
   * Vì sao không dùng mấy trường hoá đơn ở trên: luồng hoàn thành dự án đo bằng task
   * "Thu tiền:", không đòi hoá đơn nữa. Đo trên bản chạy thật: 7 deal đang triển khai trị
   * giá 1,24 tỷ mà "còn phải thu" theo hoá đơn ra 0 đ.
   */
  total_contracted: number;
  milestone_collected: number;
  milestone_outstanding: number;
  milestones_pending: number;
};

export type PipelineStageStat = {
  stage: string;
  deal_count: number;
  total_value: number;
};

export type MonthlyRevenue = {
  /** "YYYY-MM". Chuỗi liền mạch — tháng trống vẫn có mặt với số 0. */
  month: string;
  invoiced: number;
  collected: number;
};

export type WinRateSummary = {
  won: number;
  lost: number;
  /** Fraction in the 0..1 range (not a percentage). */
  win_rate: number;
};

export type TopClient = {
  client_id: string;
  name: string;
  /** Đã thu được từ khách này (theo mốc thanh toán đã tick). */
  revenue: number;
  /** Khách này còn nợ bao nhiêu — "ai mang lại nhiều tiền nhất" mà thiếu vế này thì mới kể nửa câu chuyện. */
  outstanding: number;
  deal_count: number;
};

export type AiUsageSummary = {
  generations_used: number;
  estimated_cost_usd: number;
  // Bốn trường dưới BE mới bổ sung. Trước đây chỉ có generations_used — mà nó LUÔN LÀ 0,
  // vì không ai ghi vào bảng usage_records. Giờ đếm thật, và có cả hạn mức để nói được
  // "3/50" thay vì "đã dùng 3 lượt" (3 trên bao nhiêu?).
  limit?: number;
  remaining?: number;
  can_use_ai?: boolean;
  period_end?: string | null;
};

export type RevenuePeriodType = "day" | "week" | "month" | "year";
export type TopClientMetric = "total_collected" | "total_invoiced";

type DateRange = { from_date?: string; to_date?: string };

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /analytics/dashboard — headline workspace totals. */
export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await axiosClient.get<ApiResponse<DashboardSummary>>(
    "/analytics/dashboard"
  );
  return data.data;
}

/** GET /analytics/revenue — invoiced / collected / outstanding for a range. */
export async function getRevenue(
  params: DateRange & { period_type?: RevenuePeriodType } = {}
): Promise<RevenueSummary> {
  const { data } = await axiosClient.get<ApiResponse<RevenueSummary>>(
    "/analytics/revenue",
    { params }
  );
  return data.data;
}

/** GET /analytics/pipeline — per-stage deal counts and value. */
export async function getPipeline(
  params: { snapshot_date?: string } = {}
): Promise<PipelineStageStat[]> {
  const { data } = await axiosClient.get<ApiResponse<PipelineStageStat[]>>(
    "/analytics/pipeline",
    { params }
  );
  return data.data ?? [];
}

/** GET /analytics/revenue/monthly — invoiced/collected per month, continuous series. */
export async function getMonthlyRevenue(
  params: { months?: number } = {}
): Promise<MonthlyRevenue[]> {
  const { data } = await axiosClient.get<ApiResponse<MonthlyRevenue[]>>(
    "/analytics/revenue/monthly",
    { params }
  );
  // ÉP KIỂU SỐ. Backend khai `invoiced`/`collected` là `Decimal`, mà pydantic v2 serialize
  // Decimal thành CHUỖI JSON ("1000.00"). Kiểu TS ghi `number` nhưng TS không kiểm tra được
  // dữ liệu chạy thật, nên `s + d.invoiced` NỐI CHUỖI thay vì cộng: tổng ra
  // "01000.002000.00" rồi `Intl.NumberFormat` nhả ra "NaN ₫" ngay dưới tiêu đề biểu đồ.
  //
  // Cùng gốc, hai hệ quả lặng hơn: `Math.max` và phép trừ vẫn ép kiểu ngầm nên CỘT vẽ đúng
  // (chỉ tổng sai — càng khó nghi), và `totalInvoiced === 0` so sánh strict với chuỗi nên
  // trạng thái rỗng "Chưa có hoá đơn nào" không bao giờ hiện.
  //
  // Các service khác đã ép sẵn (projectsService, dealsService); chỗ này bị bỏ sót.  #Huynh
  return (data.data ?? []).map((row) => ({
    month: row.month,
    invoiced: Number(row.invoiced) || 0,
    collected: Number(row.collected) || 0,
  }));
}

/** GET /analytics/win-rate — won / lost counts and win rate (0..1 fraction). */
export async function getWinRate(params: DateRange = {}): Promise<WinRateSummary> {
  const { data } = await axiosClient.get<ApiResponse<WinRateSummary>>(
    "/analytics/win-rate",
    { params }
  );
  return data.data;
}

/** GET /analytics/clients/top — highest-revenue clients. */
export async function getTopClients(
  params: DateRange & { limit?: number; metric?: TopClientMetric } = {}
): Promise<TopClient[]> {
  const { data } = await axiosClient.get<ApiResponse<TopClient[]>>(
    "/analytics/clients/top",
    { params }
  );
  // Cùng cái bẫy Decimal-thành-chuỗi như `getMonthlyRevenue`. Ở đây nó chưa lộ ra vì
  // `formatVND` và `> 0` đều ép kiểu ngầm — nhưng chỉ cần một phép CỘNG được thêm vào sau này
  // là ra ngay chuỗi nối. Ép ngay tại cửa cho hết chuyện.  #Huynh
  return (data.data ?? []).map((row) => ({
    ...row,
    revenue: Number(row.revenue) || 0,
    outstanding: Number(row.outstanding) || 0,
    deal_count: Number(row.deal_count) || 0,
  }));
}

/** GET /analytics/ai-usage — generation count and estimated cost. */
export async function getAiUsage(params: DateRange = {}): Promise<AiUsageSummary> {
  const { data } = await axiosClient.get<ApiResponse<AiUsageSummary>>(
    "/analytics/ai-usage",
    { params }
  );
  return data.data;
}
