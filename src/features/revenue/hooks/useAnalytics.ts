import { useQuery, type QueryClient } from "@tanstack/react-query";
import {
  getDashboard,
  getRevenue,
  getWinRate,
  getPipeline,
  getMonthlyRevenue,
  getTopClients,
  getAiUsage,
  type RevenuePeriodType,
  type TopClientMetric,
} from "@/services/analyticsService";

/**
 * Khoá gốc của mọi truy vấn số liệu.
 *
 * Bảng Doanh thu đọc bảy truy vấn khác nhau, tất cả đều bắt đầu bằng `["analytics"]`.
 * Trước đây KHÔNG một mutation nào trong cả repo làm mới nhóm khoá này — ghi nhận khách
 * đã trả tiền xong, mở tab Doanh thu vẫn thấy số cũ cho tới khi cache tự hết hạn. Với
 * người dùng thì đó là "phần mềm ghi nhầm tiền của tôi".  #Huynh
 */
export const analyticsKeys = {
  all: ["analytics"] as const,
};

/**
 * Làm mới toàn bộ số liệu tiền. Gọi sau MỌI thao tác đổi dòng tiền: tạo/sửa/gửi/huỷ hoá
 * đơn, ghi nhận thanh toán, đánh dấu mốc thu tiền xong.
 *
 * Cố ý làm mới cả nhóm thay vì chọn từng truy vấn: bảy truy vấn con chia số liệu theo
 * những chiều khác nhau (theo kỳ, theo khách, theo tháng) nên gần như thao tác nào cũng
 * chạm nhiều cái một lúc, liệt kê tay là chắc chắn bỏ sót.
 */
export function lamMoiSoLieuTien(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: analyticsKeys.all });
}

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

/** GET /analytics/revenue/monthly — invoiced/collected per month (continuous series). */
export function useMonthlyRevenue(params: { months?: number } = {}) {
  return useQuery({
    queryKey: ["analytics", "revenue-monthly", params],
    queryFn: () => getMonthlyRevenue(params),
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
