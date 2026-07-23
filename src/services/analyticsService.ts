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
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
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
  revenue: number;
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
  return data.data ?? [];
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
  return data.data ?? [];
}

/** GET /analytics/ai-usage — generation count and estimated cost. */
export async function getAiUsage(params: DateRange = {}): Promise<AiUsageSummary> {
  const { data } = await axiosClient.get<ApiResponse<AiUsageSummary>>(
    "/analytics/ai-usage",
    { params }
  );
  return data.data;
}
