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
      ok({ total_clients: 12, active_deals: 5, total_revenue: 90_000_000, pending_invoices: 3 })) as never
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
        signed_deals: 2,
        // 200 triệu ÷ 2 deal.
        average_deal_value: 100_000_000,
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

/** Thẻ số liệu theo nhãn của nó — khối viền bo tròn chứa nhãn, số và dòng phụ. */
function theKpi(nhan: string): HTMLElement {
  const the = screen.getByText(nhan).closest("div.rounded-xl");
  if (!the) throw new Error(`Không thấy thẻ "${nhan}"`);
  return the as HTMLElement;
}

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
    expect(screen.getByText(/3 mốc thanh toán chưa tick/)).toBeInTheDocument();
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

/**
 * Hai con số "deal" trên cùng một màn hình từng cãi nhau: thẻ "Tổng" (trước là "Tổng đã ký") ghi 25 deal đang
 * chạy, phễu ghi 31 deal đang chạy. Mỗi con số giờ nói đúng việc của nó:
 *  - thẻ "Tổng": số deal ĐÃ KÝ — cùng phạm vi với số tiền (kể cả deal đã hoàn thành);
 *  - phễu: số deal ĐANG CHẠY (chưa hoàn thành) + số đã hoàn thành.
 */
describe("<RevenueDashboard /> — số deal khớp nhau", () => {
  const phanBoThat = [
    { stage: "new_lead", deal_count: 2, total_value: 0 },
    { stage: "qualified", deal_count: 6, total_value: 237_500_000 },
    { stage: "proposal_sent", deal_count: 4, total_value: 909_500_000 },
    { stage: "in_negotiation", deal_count: 8, total_value: 1_683_000_000 },
    { stage: "active", deal_count: 5, total_value: 877_000_000 },
    { stage: "completed_and_billed", deal_count: 6, total_value: 1_042_500_000 },
  ];

  it("thẻ 'Tổng' ghi 'Các deal đã chốt', phễu ghi 25 đang chạy + 6 hoàn thành — không còn 31", () => {
    mockAll({
      dashboard: ok({ total_clients: 18, active_deals: 25, total_revenue: 0, pending_invoices: 0 }),
      revenue: ok({
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        total_contracted: 2_642_500_000,
        milestone_collected: 826_275_000,
        milestone_outstanding: 1_816_225_000,
        milestones_pending: 32,
        signed_deals: 14,
      }),
      pipeline: ok(phanBoThat),
    });
    render(<RevenueDashboard />);

    expect(screen.getByText("Các deal đã chốt")).toBeInTheDocument();
    expect(screen.getByText("25 deal đang chạy · 6 đã hoàn thành")).toBeInTheDocument();
    expect(screen.queryByText(/31 deal/)).toBeNull();
  });

  it("số 'đang chạy' ở phễu bằng active_deals của backend (cùng một định nghĩa)", () => {
    mockAll({
      dashboard: ok({ total_clients: 18, active_deals: 25, total_revenue: 0, pending_invoices: 0 }),
      pipeline: ok(phanBoThat),
    });
    render(<RevenueDashboard />);

    expect(screen.getByText(/^25 deal đang chạy/)).toBeInTheDocument();
  });

  it("danh sách khách ghi 'hiện/tổng' thay vì '18 khách' trong khi chỉ có 6 dòng", () => {
    const sauKhach = Array.from({ length: 6 }, (_, i) => ({
      client_id: `c${i}`,
      name: `Khách ${i}`,
      revenue: 1,
      outstanding: 0,
      deal_count: 1,
    }));
    mockAll({
      dashboard: ok({ total_clients: 18, active_deals: 25, total_revenue: 0, pending_invoices: 0 }),
      topClients: ok(sauKhach),
    });
    render(<RevenueDashboard />);

    const nhan = screen.getByText("6/18 khách");
    expect(nhan).toHaveAttribute("title", "Chỉ hiện khách đã có hợp đồng ký");
    expect(screen.queryByText("18 khách")).toBeNull();
  });
});

/**
 * Người xem không biết các con số ở hàng đầu "đang được tính dựa trên cái gì". Mỗi thẻ có dòng phụ
 * nói nguồn cộng — đặc biệt phải phân biệt "mốc đã tick" (các thẻ này) với "hóa đơn" (biểu đồ bên
 * dưới). Không còn chú thích hiện khi rê chuột: user không muốn.
 */
describe("<RevenueDashboard /> — các thẻ nói rõ tính từ đâu", () => {
  it("dòng phụ của từng thẻ nêu nguồn cộng", () => {
    mockAll();
    render(<RevenueDashboard />);

    expect(screen.getByText("Các deal đã chốt")).toBeInTheDocument();
    expect(screen.getByText("Các mốc thanh toán đã tick xong")).toBeInTheDocument();
    expect(screen.getByText("3 mốc thanh toán chưa tick")).toBeInTheDocument();
    expect(screen.getByText("7 thắng · 3 thua · chưa tính deal đang chạy")).toBeInTheDocument();
  });

  it("thẻ đầu tên là 'Tổng' (cộng cả mốc đã tick lẫn chưa tick), không còn 'Tổng đã ký'", () => {
    mockAll();
    render(<RevenueDashboard />);

    expect(screen.getByText("Tổng")).toBeInTheDocument();
    expect(screen.queryByText("Tổng đã ký")).toBeNull();
  });

  it("rê chuột vào thẻ KHÔNG hiện chú thích: không title, không biểu tượng thông tin", () => {
    mockAll();
    render(<RevenueDashboard />);

    for (const nhan of ["Tổng", "Đã thu", "Còn phải thu", "Tỷ lệ thắng", "Giá trị deal trung bình"]) {
      const the = theKpi(nhan);
      expect(the, nhan).not.toHaveAttribute("title");
      expect(the.querySelectorAll("[title]"), nhan).toHaveLength(0);
      // Chỉ còn biểu tượng nhỏ trước nhãn; biểu tượng "i" từng báo hiệu có chú thích ẩn.
      expect(the.querySelectorAll("svg"), nhan).toHaveLength(1);
    }
  });

  it("thẻ thứ tư tên 'Tỷ lệ thắng' đúng chữ phiếu, không còn 'Tỷ lệ chốt deal'", () => {
    // Phiếu đề tài ghi "tỷ lệ thắng"; "chốt deal" lại nghe như tỷ lệ ký được hợp đồng, trong khi
    // thắng ở đây là deal HOÀN THÀNH.
    mockAll();
    render(<RevenueDashboard />);

    expect(screen.getByText("Tỷ lệ thắng")).toBeInTheDocument();
    expect(screen.queryByText("Tỷ lệ chốt deal")).toBeNull();
  });

  it("có thẻ 'Giá trị deal trung bình' hiện đúng số backend tính sẵn", () => {
    mockAll();
    render(<RevenueDashboard />);

    const the = theKpi("Giá trị deal trung bình");
    expect(the).toHaveTextContent(/100\.000\.000/);
    expect(the).toHaveTextContent("Trung bình mỗi deal đã chốt");
  });

  it("Decimal của backend về dạng chuỗi vẫn hiện thành tiền, không ra NaN", () => {
    mockAll({
      revenue: ok({
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        total_contracted: 2_642_500_000,
        milestone_collected: 826_275_000,
        milestone_outstanding: 1_816_225_000,
        milestones_pending: 32,
        signed_deals: 14,
        average_deal_value: "188750000.00",
      }),
    });
    render(<RevenueDashboard />);

    const the = theKpi("Giá trị deal trung bình");
    expect(the).toHaveTextContent(/188\.750\.000/);
    expect(the).not.toHaveTextContent("NaN");
  });

  it("backend cũ chưa trả giá trị trung bình thì hiện '—', không tự chia ra một con số bịa", () => {
    mockAll({
      revenue: ok({
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        total_contracted: 200_000_000,
        milestone_collected: 50_000_000,
        milestone_outstanding: 150_000_000,
        milestones_pending: 3,
        signed_deals: 2,
      }),
    });
    render(<RevenueDashboard />);

    const the = theKpi("Giá trị deal trung bình");
    expect(the).toHaveTextContent("—");
    expect(the).not.toHaveTextContent(/100\.000\.000/);
  });

  it("backend cũ chưa trả signed_deals: dòng phụ vẫn là 'Các deal đã chốt', không in số deal bịa", () => {
    mockAll({
      revenue: ok({
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        total_contracted: 200_000_000,
        milestone_collected: 50_000_000,
        milestone_outstanding: 150_000_000,
        milestones_pending: 3,
      }),
    });
    render(<RevenueDashboard />);

    expect(screen.getByText("Các deal đã chốt")).toBeInTheDocument();
    expect(screen.getByText(/200\.000\.000/)).toBeInTheDocument();
  });
});
