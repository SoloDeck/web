import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RevenueDashboard } from "./RevenueDashboard";
import * as useAnalytics from "@/features/revenue/hooks/useAnalytics";

vi.mock("@/features/revenue/hooks/useAnalytics");

type QueryLike<T> = { data?: T; isLoading: boolean; isError: boolean };

function ok<T>(data: T): QueryLike<T> {
  return { data, isLoading: false, isError: false };
}

function mockAll(opts?: {
  dashboard?: QueryLike<unknown>;
  revenue?: QueryLike<unknown>;
  winRate?: QueryLike<unknown>;
  monthly?: QueryLike<unknown>;
  pipeline?: QueryLike<unknown>;
}) {
  vi.mocked(useAnalytics.useDashboard).mockReturnValue(
    (opts?.dashboard ??
      ok({ total_clients: 12, active_deals: 4, total_revenue: 90_000_000, pending_invoices: 3 })) as never
  );
  vi.mocked(useAnalytics.useRevenue).mockReturnValue(
    (opts?.revenue ??
      ok({ total_invoiced: 80_000_000, total_collected: 50_000_000, total_outstanding: 30_000_000 })) as never
  );
  vi.mocked(useAnalytics.useWinRate).mockReturnValue(
    (opts?.winRate ?? ok({ won: 7, lost: 3, win_rate: 0.7 })) as never
  );
  vi.mocked(useAnalytics.useMonthlyRevenue).mockReturnValue(
    (opts?.monthly ??
      ok([
        { month: "2026-06", invoiced: 30_000_000, collected: 20_000_000 },
        { month: "2026-07", invoiced: 50_000_000, collected: 30_000_000 },
      ])) as never
  );
  vi.mocked(useAnalytics.usePipeline).mockReturnValue(
    (opts?.pipeline ??
      ok([
        { stage: "proposal_sent", deal_count: 3, total_value: 60_000_000 },
        { stage: "active", deal_count: 2, total_value: 40_000_000 },
      ])) as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<RevenueDashboard />", () => {
  it("renders the mocked win rate, won/lost counts and collected revenue", () => {
    mockAll();
    render(<RevenueDashboard />);

    // win_rate 0.7 -> 70%
    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
    // lost count reflects the mocked value (3), NOT the old hardcoded 2.
    expect(screen.getByText(/7 deal thắng · 3 deal thua/)).toBeInTheDocument();
    expect(screen.queryByText(/· 2 deal thua/)).not.toBeInTheDocument();
    // collected revenue 50.000.000 ₫ appears (VND formatted, NBSP before ₫).
    expect(screen.getAllByText(/50\.000\.000/).length).toBeGreaterThan(0);
  });

  it("shows a loading state while any query is pending", () => {
    mockAll({ dashboard: { isLoading: true, isError: false } });
    render(<RevenueDashboard />);
    expect(screen.getByText(/Đang tải dữ liệu doanh thu/)).toBeInTheDocument();
  });

  it("shows a graceful error state when a query errors", () => {
    mockAll({ revenue: { isLoading: false, isError: true } });
    render(<RevenueDashboard />);
    expect(screen.getByText(/Không thể tải dữ liệu doanh thu/)).toBeInTheDocument();
  });
});
