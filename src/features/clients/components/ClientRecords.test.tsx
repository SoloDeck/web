import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientRecords } from "./ClientRecords";
import { useClients, useUpdateClient } from "@/features/clients/hooks/useClients";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { ClientRecord } from "@/services/clientsService";

vi.mock("@/features/clients/hooks/useClients", () => ({
  useClients: vi.fn(),
  useUpdateClient: vi.fn(),
}));

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "c1",
    owner_user_id: "u1",
    name: "Công ty ABC",
    email: "abc@example.com",
    phone: "0900000000",
    type: "company",
    status: "active",
    website: null,
    linkedin_url: null,
    address_city: null,
    address_country: null,
    notes: null,
    description: null,
    deal_count: 2,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

function mockUseClients(data: ClientRecord[] | undefined, isLoading = false) {
  vi.mocked(useClients).mockReturnValue({ data, isLoading } as ReturnType<typeof useClients>);
}

const mutate = vi.fn();

beforeEach(() => {
  useDealStore.setState({ deals: [], hydrated: true });
  mutate.mockClear();
  vi.mocked(useUpdateClient).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateClient>);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<ClientRecords />", () => {
  it("renders client rows from the API response", () => {
    mockUseClients([makeClient({ name: "Công ty ABC" }), makeClient({ id: "c2", name: "Nguyễn Văn B", type: "individual" })]);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText("Công ty ABC")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn B")).toBeInTheDocument();
    // deal_count comes straight from the API payload.
    expect(screen.getAllByText(/2 dự án/).length).toBeGreaterThan(0);
  });

  it("shows the empty state when the API returns no clients", () => {
    mockUseClients([]);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText(/Chưa có khách hàng nào/)).toBeInTheDocument();
  });

  it("shows the loading state while the query is pending", () => {
    mockUseClients(undefined, true);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText(/Đang tải/)).toBeInTheDocument();
  });
});

/**
 * Hồ sơ khách hàng: đầu trang chỉ nêu "N khách hàng · M deal"; trạng thái chỉ còn hai nhãn "Tiềm
 * năng" và "Lưu trữ"; bộ lọc có ba mục (Tất cả gồm cả khách đã lưu trữ). Lưu trữ khách thì các dự án
 * đang chạy của khách tự vào Kho lưu trữ.
 */
const hang = (ten: string) => screen.getByText(ten).closest("tr") as HTMLElement;

async function chonLoc(nhan: string) {
  await userEvent.click(screen.getAllByRole("combobox")[0]);
  await userEvent.click(await screen.findByRole("option", { name: nhan }));
}

function bayKhach() {
  mockUseClients([
    makeClient({ id: "c1", name: "Khách tiềm năng", status: "prospect", deal_count: 2 }),
    makeClient({ id: "c2", name: "Khách cũ hoạt động", status: "active", deal_count: 3 }),
    makeClient({ id: "c3", name: "Khách đã lưu trữ", status: "archived", deal_count: 1 }),
  ]);
  render(<ClientRecords onOpenClient={vi.fn()} />);
}

describe("<ClientRecords /> — đầu trang", () => {
  it("chỉ nêu tổng khách hàng và tổng deal, không còn 'đang hoạt động' / 'tiềm năng'", () => {
    bayKhach();

    expect(screen.getByText("3 khách hàng")).toBeInTheDocument();
    expect(screen.getByText("6 deal")).toBeInTheDocument();
    expect(screen.queryByText(/đang hoạt động/i)).toBeNull();
    expect(screen.queryByText(/^\d+ tiềm năng/)).toBeNull();
  });

  it("không có khách nào thì tổng là 0 khách hàng · 0 deal", () => {
    mockUseClients([]);
    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText("0 khách hàng")).toBeInTheDocument();
    expect(screen.getByText("0 deal")).toBeInTheDocument();
  });
});

describe("<ClientRecords /> — nhãn trạng thái", () => {
  it("chỉ còn 'Tiềm năng' và 'Lưu trữ': trạng thái cũ (đang hoạt động...) được coi là Tiềm năng", () => {
    bayKhach();

    expect(within(hang("Khách tiềm năng")).getByText("Tiềm năng")).toBeInTheDocument();
    expect(within(hang("Khách cũ hoạt động")).getByText("Tiềm năng")).toBeInTheDocument();
    expect(within(hang("Khách đã lưu trữ")).getByText("Lưu trữ")).toBeInTheDocument();
    expect(screen.queryByText("Đang hoạt động")).toBeNull();
    expect(screen.queryByText("Không hoạt động")).toBeNull();
  });
});

describe("<ClientRecords /> — bộ lọc trạng thái", () => {
  it("chỉ có ba mục: Tất cả, Tiềm năng, Lưu trữ", async () => {
    bayKhach();

    await userEvent.click(screen.getAllByRole("combobox")[0]);

    const mucs = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(mucs).toEqual(["Trạng thái: Tất cả", "Tiềm năng", "Lưu trữ"]);
  });

  it("'Tất cả' (mặc định) hiện cả khách đã lưu trữ", () => {
    bayKhach();

    expect(screen.getByText("Khách tiềm năng")).toBeInTheDocument();
    expect(screen.getByText("Khách cũ hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Khách đã lưu trữ")).toBeInTheDocument();
  });

  it("'Tiềm năng' chỉ hiện khách còn làm việc, ẩn khách đã lưu trữ", async () => {
    bayKhach();

    await chonLoc("Tiềm năng");

    expect(screen.getByText("Khách tiềm năng")).toBeInTheDocument();
    expect(screen.getByText("Khách cũ hoạt động")).toBeInTheDocument();
    expect(screen.queryByText("Khách đã lưu trữ")).toBeNull();
  });

  it("'Lưu trữ' chỉ hiện khách đã lưu trữ", async () => {
    bayKhach();

    await chonLoc("Lưu trữ");

    expect(screen.getByText("Khách đã lưu trữ")).toBeInTheDocument();
    expect(screen.queryByText("Khách tiềm năng")).toBeNull();
    expect(screen.queryByText("Khách cũ hoạt động")).toBeNull();
  });
});

describe("<ClientRecords /> — lưu trữ khách", () => {
  async function moHopLuuTru(ten: string) {
    await userEvent.click(within(hang(ten)).getByTitle("Xóa"));
    return screen.getByRole("heading", { name: "Lưu trữ khách hàng" }).parentElement
      ?.parentElement as HTMLElement;
  }

  it("hộp xác nhận nói rõ: dự án đang chạy của khách sẽ tự đưa vào Kho lưu trữ", async () => {
    bayKhach();

    const hop = await moHopLuuTru("Khách tiềm năng");

    expect(hop).toHaveTextContent("Khách tiềm năng");
    expect(hop).toHaveTextContent("Khách hàng sẽ chuyển sang trạng thái Lưu trữ.");
    expect(hop).toHaveTextContent(
      "Các dự án đang chạy của khách hàng sẽ tự động đưa vào Kho lưu trữ."
    );
  });

  it("xác nhận thì lưu trữ đúng khách và báo là lần CHUYỂN sang lưu trữ (để làm mới dự án)", async () => {
    bayKhach();
    const hop = await moHopLuuTru("Khách tiềm năng");

    await userEvent.click(within(hop).getByRole("button", { name: "Lưu trữ" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({
      id: "c1",
      payload: { name: "Khách tiềm năng", status: "archived" },
      archiving: true,
    });
  });

  it("bấm Hủy thì không lưu trữ gì", async () => {
    bayKhach();
    const hop = await moHopLuuTru("Khách tiềm năng");

    await userEvent.click(within(hop).getByRole("button", { name: "Hủy" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Lưu trữ khách hàng" })).toBeNull();
  });

  it("khách đã lưu trữ rồi thì không còn nút lưu trữ", () => {
    bayKhach();

    expect(within(hang("Khách đã lưu trữ")).queryByTitle("Xóa")).toBeNull();
    expect(within(hang("Khách tiềm năng")).getByTitle("Xóa")).toBeInTheDocument();
    expect(screen.getAllByTitle("Xóa")).toHaveLength(2);
  });

  it("dạng thẻ cũng vậy: chỉ khách chưa lưu trữ mới có nút lưu trữ", async () => {
    bayKhach();

    await userEvent.click(screen.getByTitle("Dạng thẻ"));

    expect(screen.getByText("Khách đã lưu trữ")).toBeInTheDocument();
    expect(screen.getAllByTitle("Xóa")).toHaveLength(2);
  });
});
