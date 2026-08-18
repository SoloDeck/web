import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RevenueDashboard } from "./RevenueDashboard";
import * as useAnalytics from "@/features/revenue/hooks/useAnalytics";

vi.mock("@/features/revenue/hooks/useAnalytics");

// Tên khách giờ là một <Link> sang hồ sơ khách đó, mà Link thật đòi router context. Test này
// kiểm NỘI DUNG bảng doanh thu, không kiểm điều hướng — dựng một thẻ <a> giữ nguyên `to` và
// `params` để vẫn khẳng định được nó trỏ đúng chỗ.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={to} data-params={JSON.stringify(params ?? {})} {...rest}>
      {children}
    </a>
  ),
}));

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
  topClients?: QueryLike<unknown>;
}) {
  vi.mocked(useAnalytics.useTopClients).mockReturnValue(
    (opts?.topClients ??
      ok([
        {
          client_id: "c1",
          name: "Quán cà phê Nắng",
          revenue: 50_000_000,
          outstanding: 20_000_000,
          deal_count: 2,
        },
      ])) as never
  );
  vi.mocked(useAnalytics.useDashboard).mockReturnValue(
    (opts?.dashboard ??
      ok({ total_clients: 12, active_deals: 4, total_revenue: 90_000_000, pending_invoices: 3 })) as never
  );
  vi.mocked(useAnalytics.useRevenue).mockReturnValue(
    (opts?.revenue ??
      ok({
        // Theo hoá đơn — CỐ Ý để 0 để bắt lỗi nếu màn hình lại đọc nhầm nguồn này.
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        // Theo mốc thanh toán — nguồn thật của khối tiền.
        total_contracted: 200_000_000,
        milestone_collected: 50_000_000,
        milestone_outstanding: 150_000_000,
        milestones_pending: 3,
      })) as never
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
    expect(screen.getByText(/7 thắng · 3 thua/)).toBeInTheDocument();
    // collected revenue 50.000.000 ₫ appears (VND formatted, NBSP before ₫).
    expect(screen.getAllByText(/50\.000\.000/).length).toBeGreaterThan(0);
  });

  it("tiền lấy từ MỐC THANH TOÁN, không phải hoá đơn", () => {
    // Lỗi thật: khối tiền đọc `total_outstanding` (hiệu hai cột hoá đơn) nên hiện "Còn phải
    // thu: 0 đ" trong khi phễu ngay bên cạnh ghi 7 deal đang triển khai trị giá 1,24 tỷ.
    // Mock để hoá đơn = 0 và mốc = 150 triệu; màn hình phải đọc theo mốc.  #Huynh
    mockAll();
    render(<RevenueDashboard />);

    expect(screen.getAllByText(/150\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/3 mốc chưa thu/)).toBeInTheDocument();
    expect(screen.getByText(/200\.000\.000/)).toBeInTheDocument();
  });

  it("hiện Top khách hàng kèm số còn nợ", () => {
    mockAll();
    render(<RevenueDashboard />);

    expect(screen.getByText("Quán cà phê Nắng")).toBeInTheDocument();
    expect(screen.getByText(/2 dự án/)).toBeInTheDocument();
    expect(screen.getByText(/còn nợ/)).toBeInTheDocument();
  });

  it("KHÔNG cuộn cả trang — chỉ cuộn trong card danh sách", () => {
    // Anh Huynh chốt: mở ra là thấy hết, không phải lăn chuột. Đây là chốt chặn cho ràng
    // buộc đó — thêm card mới mà quên bố cục là test này đỏ.
    mockAll();
    const { container } = render(<RevenueDashboard />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/overflow-y-auto/);
    expect(root.className).toMatch(/h-full/);
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

/**
 * Bấm tên khách ở "Khách hàng mang lại nhiều tiền nhất" là sang hồ sơ khách đó.
 *
 * Phải điều hướng bằng `client_id`, KHÔNG phải tên: một người thật có thể ứng với nhiều bản ghi
 * khách (mỗi freelancer một bản riêng — `clients` có `owner_user_id`; và ngay trong cùng một
 * freelancer cũng dễ trùng vì `ClientsService.create` không chống trùng). Tra theo tên là có
 * ngày mở nhầm hồ sơ khách khác.  #Huynh
 */
describe("<RevenueDashboard /> — tên khách bấm được", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mỗi khách là một liên kết tới ĐÚNG hồ sơ của họ", () => {
    mockAll({
      topClients: ok([
        { client_id: "c-aaa", name: "Hoa Huynh", revenue: 1, outstanding: 0, deal_count: 1 },
        { client_id: "c-bbb", name: "Hỏa Huynh", revenue: 2, outstanding: 0, deal_count: 2 },
      ]),
    });
    render(<RevenueDashboard />);

    const a = screen.getByTitle("Mở hồ sơ Hoa Huynh");
    const b = screen.getByTitle("Mở hồ sơ Hỏa Huynh");

    expect(a).toHaveAttribute("href", "/clients/$clientId");
    // HAI khách TRÙNG TÊN gần như nhau vẫn ra hai id khác nhau — đây đúng là cảnh đang có
    // trong dữ liệu thật, và là lý do không được tra theo tên.
    expect(a).toHaveAttribute("data-params", JSON.stringify({ clientId: "c-aaa" }));
    expect(b).toHaveAttribute("data-params", JSON.stringify({ clientId: "c-bbb" }));
  });
});
