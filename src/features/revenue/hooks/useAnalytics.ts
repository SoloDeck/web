import { useQuery } from "@tanstack/react-query";
import {
  getDashboard,
  getRevenue,
  getWinRate,
  getPipeline,
  getTopClients,
  getAiUsage,
  type RevenuePeriodType,
  type TopClientMetric,
} from "@/services/analyticsService";

type DateRange = { from_date?: string; to_date?: string };

/** GET /analytics/dashboard — headline workspace totals. */
export function useDashboard() {
  return useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: getDashboard,
  });
}

/** GET /analytics/revenue — invoiced / collected / outstanding. */
export function useRevenue(
  params: DateRange & { period_type?: RevenuePeriodType } = {}
) {
  return useQuery({
    queryKey: ["analytics", "revenue", params],
    queryFn: () => getRevenue(params),
  });
}

/** GET /analytics/win-rate — won / lost / win_rate (0..1 fraction). */
export function useWinRate(params: DateRange = {}) {
  return useQuery({
    queryKey: ["analytics", "win-rate", params],
    queryFn: () => getWinRate(params),
  });
}

/** GET /analytics/pipeline — per-stage deal counts and value. */
export function usePipeline(params: { snapshot_date?: string } = {}) {
  return useQuery({
    queryKey: ["analytics", "pipeline", params],
    queryFn: () => getPipeline(params),
  });
}

/** GET /analytics/clients/top — highest-revenue clients. */
export function useTopClients(
  params: DateRange & { limit?: number; metric?: TopClientMetric } = {}
) {
  return useQuery({
    queryKey: ["analytics", "top-clients", params],
    queryFn: () => getTopClients(params),
  });
}

/** GET /analytics/ai-usage — generation count and estimated cost. */
export function useAiUsage(params: DateRange = {}) {
  return useQuery({
    queryKey: ["analytics", "ai-usage", params],
    queryFn: () => getAiUsage(params),
  });
}
