import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPaymentTransactionsPage } from "@/features/admin/components/AdminPaymentTransactionsPage";
import { useAdminPayments } from "@/features/admin/hooks/useAdmin";
import type { AdminPayment, AdminPaymentPage } from "@/services/adminService";

vi.mock("@/features/admin/hooks/useAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/admin/hooks/useAdmin")>()),
  useAdminPayments: vi.fn(),
}));

/**
 * Trang Giao dịch thanh toán:
 *  - Thẻ "Đã thu / Thành công / Đang chờ" do MÁY CHỦ cộng trên cả tập đang lọc, nên không còn nhãn
 *    "(trang này)" — con số không đổi khi lật trang.
 *  - Ô tìm và hai ô "Từ / Đến" ngày nằm CÙNG MỘT hàng; ngày hiện dạng ngày/tháng/năm, không phải
 *    "mm/dd/yyyy" của trình duyệt tiếng Anh.
 */

function giaoDich(over: Partial<AdminPayment> = {}): AdminPayment {
  return {
    id: "p1",
    user_id: "u1",
    user_email: "an@example.com",
    user_full_name: "An Nguyen",
    plan_id: "pl1",
    plan_name: "Pro",
    provider: "momo",
    status: "succeeded",
    amount: "199000.00",
    currency: "VND",
    provider_reference: "MOMO-1",
    paid_at: "2026-10-03T12:00:00Z",
    created_at: "2026-10-03T11:59:00Z",
    ...over,
  } as AdminPayment;
}

function trang(over: Partial<AdminPaymentPage> = {}) {
  const rows = over.data ?? [giaoDich()];
  vi.mocked(useAdminPayments).mockReturnValue({
    data: {
      data: rows,
      total: rows.length,
      page: 1,
      page_size: 20,
      totals: {
        collected_amount: "2018000.00",
        currency: "VND",
        succeeded_count: 8,
        pending_count: 3,
      },
      ...over,
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAdminPayments>);
}

/** Thẻ tổng theo nhãn — "Thành công" còn xuất hiện ở ô lọc và nhãn của từng dòng nên không tra thẳng theo chữ. */
function theTong(nhan: string): HTMLElement {
  const nhanThe = screen
    .getAllByText(nhan)
    .find((el) => el.tagName === "P" && el.className.includes("text-muted-foreground"));
  const the = nhanThe?.closest("section");
  if (!the) throw new Error(`Không thấy thẻ "${nhan}"`);
  return the as HTMLElement;
}

const boLocGanNhat = () => vi.mocked(useAdminPayments).mock.calls.at(-1)?.[0];
const oTim = () => screen.getByPlaceholderText("Tìm theo tên hoặc email người mua");
const oTuNgay = () => screen.getByRole("textbox", { name: "Từ ngày" });
const oDenNgay = () => screen.getByRole("textbox", { name: "Đến ngày" });

beforeEach(() => {
  vi.clearAllMocks();
  trang();
});

describe("<AdminPaymentTransactionsPage /> — thẻ tổng", () => {
  it("không còn nhãn '(trang này)'", () => {
    render(<AdminPaymentTransactionsPage />);

    expect(screen.queryByText(/trang này/)).toBeNull();
    for (const nhan of ["Giao dịch", "Đã thu", "Thành công", "Đang chờ"]) {
      expect(theTong(nhan)).toBeInTheDocument();
    }
  });

  it("số liệu lấy từ tổng của máy chủ, không tự cộng các dòng của trang", () => {
    // Trang chỉ có 1 dòng 199.000 đ nhưng tổng toàn bộ là 2.018.000 đ / 8 thành công / 3 đang chờ.
    render(<AdminPaymentTransactionsPage />);

    expect(within(theTong("Đã thu")).getByText(/2\.018\.000/)).toBeInTheDocument();
    expect(within(theTong("Thành công")).getByText("8")).toBeInTheDocument();
    expect(within(theTong("Đang chờ")).getByText("3")).toBeInTheDocument();
    // Số giao dịch của chính trang (1 dòng) vẫn là con số của bảng, không lẫn với tổng.
    expect(within(theTong("Giao dịch")).getByText("1")).toBeInTheDocument();
  });

  it("chưa có dữ liệu thì các thẻ ghi 0, không vỡ", () => {
    vi.mocked(useAdminPayments).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAdminPayments>);
    render(<AdminPaymentTransactionsPage />);

    expect(within(theTong("Đã thu")).getByText(/^0\s*₫$/)).toBeInTheDocument();
    expect(within(theTong("Thành công")).getByText("0")).toBeInTheDocument();
    expect(within(theTong("Đang chờ")).getByText("0")).toBeInTheDocument();
  });
});

describe("<AdminPaymentTransactionsPage /> — thanh bộ lọc một hàng", () => {
  it("ô tìm và hai ô ngày nằm cùng một hàng", () => {
    render(<AdminPaymentTransactionsPage />);

    const hang = oTim().closest("div.flex-wrap") as HTMLElement;
    expect(hang).not.toBeNull();
    expect(hang).toContainElement(oTuNgay());
    expect(hang).toContainElement(oDenNgay());
    expect(hang).toContainElement(screen.getByRole("combobox", { name: "Lọc trạng thái" }));
  });

  it("ô ngày hiện kiểu ngày/tháng/năm, không phải ô ngày của trình duyệt", () => {
    render(<AdminPaymentTransactionsPage />);

    expect(oTuNgay()).toHaveAttribute("placeholder", "dd/mm/yyyy");
    expect(oTuNgay()).toHaveAttribute("type", "text");
  });

  it("gõ một ngày đầy đủ thì lọc từ 0h của ngày đó và về trang 1", async () => {
    render(<AdminPaymentTransactionsPage />);

    await userEvent.type(oTuNgay(), "05/10/2026");

    await waitFor(() =>
      expect(boLocGanNhat()?.from_date).toBe(new Date(2026, 9, 5, 0, 0, 0, 0).toISOString())
    );
    expect(boLocGanNhat()?.page).toBe(1);
  });

  it("'Đến ngày' lọc tới hết ngày đó (23:59:59)", async () => {
    render(<AdminPaymentTransactionsPage />);

    await userEvent.type(oDenNgay(), "07/10/2026");

    await waitFor(() =>
      expect(boLocGanNhat()?.to_date).toBe(new Date(2026, 9, 7, 23, 59, 59, 999).toISOString())
    );
  });

  it("gõ dở dang (chưa thành một ngày thật) thì CHƯA đổi bộ lọc", async () => {
    render(<AdminPaymentTransactionsPage />);

    await userEvent.type(oTuNgay(), "05/10/20");

    expect(boLocGanNhat()?.from_date).toBeUndefined();
  });

  it("ngày không có thật (31/02) không được chấp nhận", async () => {
    render(<AdminPaymentTransactionsPage />);

    await userEvent.type(oTuNgay(), "31/02/2026");

    expect(boLocGanNhat()?.from_date).toBeUndefined();
  });

  it("rời ô khi còn gõ dở thì chữ trả về ngày đang lọc (ô trống nếu chưa lọc)", async () => {
    render(<AdminPaymentTransactionsPage />);
    await userEvent.type(oTuNgay(), "05/10/20");

    await userEvent.tab();

    expect(oTuNgay()).toHaveValue("");
  });

  it("xóa hết chữ thì bỏ lọc ngày đó", async () => {
    render(<AdminPaymentTransactionsPage />);
    await userEvent.type(oTuNgay(), "05/10/2026");
    await waitFor(() => expect(boLocGanNhat()?.from_date).toBeDefined());

    await userEvent.clear(oTuNgay());

    await waitFor(() => expect(boLocGanNhat()?.from_date).toBeUndefined());
  });

  it("nút 'Xoá bộ lọc' xóa luôn chữ trong hai ô ngày", async () => {
    render(<AdminPaymentTransactionsPage />);
    await userEvent.type(oTuNgay(), "05/10/2026");
    await userEvent.type(oDenNgay(), "07/10/2026");
    await waitFor(() => expect(boLocGanNhat()?.to_date).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: "Xoá bộ lọc" }));

    expect(oTuNgay()).toHaveValue("");
    expect(oDenNgay()).toHaveValue("");
    await waitFor(() => expect(boLocGanNhat()?.from_date).toBeUndefined());
  });

  it("bấm biểu tượng lịch ở 'Từ ngày' thì mở lịch tiếng Việt và chọn ngày được", async () => {
    render(<AdminPaymentTransactionsPage />);

    await userEvent.click(screen.getByRole("button", { name: "Mở lịch: Từ ngày" }));
    const lich = screen.getByRole("dialog", { name: "Lịch chọn ngày" });
    await userEvent.click(
      Array.from(lich.querySelectorAll("button")).find((b) => b.textContent === "15") as HTMLElement
    );

    expect(oTuNgay().getAttribute("value") ?? (oTuNgay() as HTMLInputElement).value).toMatch(
      /^15\/\d{2}\/\d{4}$/
    );
    await waitFor(() => expect(boLocGanNhat()?.from_date).toBeDefined());
  });

  it("'Đến ngày' không cho chọn ngày trước 'Từ ngày'", async () => {
    render(<AdminPaymentTransactionsPage />);
    await userEvent.type(oTuNgay(), "10/10/2026");
    await waitFor(() => expect(boLocGanNhat()?.from_date).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: "Mở lịch: Đến ngày" }));
    const lich = screen.getByRole("dialog", { name: "Lịch chọn ngày" });
    const ngay5 = Array.from(lich.querySelectorAll("button")).find(
      (b) => b.textContent === "5"
    ) as HTMLButtonElement;

    expect(ngay5).toBeDisabled();
  });

  it("'Từ ngày' không cho chọn ngày sau 'Đến ngày'", async () => {
    render(<AdminPaymentTransactionsPage />);
    await userEvent.type(oDenNgay(), "10/10/2026");
    await waitFor(() => expect(boLocGanNhat()?.to_date).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: "Mở lịch: Từ ngày" }));
    const lich = screen.getByRole("dialog", { name: "Lịch chọn ngày" });
    const ngay15 = Array.from(lich.querySelectorAll("button")).find(
      (b) => b.textContent === "15"
    ) as HTMLButtonElement;

    expect(ngay15).toBeDisabled();
  });

  it.each([
    ["Từ ngày", oTuNgay, "from_date"],
    ["Đến ngày", oDenNgay, "to_date"],
  ] as const)("đổi '%s' khi đang ở trang 2 thì về trang 1", async (_ten, o, khoa) => {
    trang({ data: Array.from({ length: 20 }, (_, i) => giaoDich({ id: `p${i}` })), total: 45 });
    render(<AdminPaymentTransactionsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Trang 2" }));
    expect(boLocGanNhat()?.page).toBe(2);

    await userEvent.type(o(), "05/10/2026");

    await waitFor(() => expect(boLocGanNhat()?.[khoa]).toBeDefined());
    expect(boLocGanNhat()?.page).toBe(1);
  });

  it.each([
    ["Từ ngày", oTuNgay],
    ["Đến ngày", oDenNgay],
  ] as const)(
    "chỉ đặt '%s' mà không khớp dòng nào thì báo 'không khớp bộ lọc', không phải 'chưa có giao dịch'",
    async (_ten, o) => {
      trang({ data: [], total: 0 });
      render(<AdminPaymentTransactionsPage />);
      expect(screen.getByText(/Chưa có giao dịch thanh toán nào/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Xoá bộ lọc" })).toBeNull();

      await userEvent.type(o(), "05/10/2026");

      await waitFor(() =>
        expect(screen.getByText(/Không có giao dịch nào khớp bộ lọc/)).toBeInTheDocument()
      );
      expect(screen.getByRole("button", { name: "Xoá bộ lọc" })).toBeInTheDocument();
    }
  );

  it("ghi chú nói rõ khoảng ngày lọc theo lúc tạo giao dịch, đặt DƯỚI bảng chứ không trong thanh lọc", () => {
    render(<AdminPaymentTransactionsPage />);

    const ghiChu = screen.getByText(/lúc tạo giao dịch/).closest("p") as HTMLElement;
    const hang = oTim().closest("div.flex-wrap") as HTMLElement;
    expect(hang).not.toContainElement(ghiChu);
    expect(hang.compareDocumentPosition(ghiChu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Nằm sau cả chân phân trang, tức dưới cùng của khung.
    const chan = screen.getByText(/Hiển thị 1-1 trong 1 giao dịch/);
    expect(chan.compareDocumentPosition(ghiChu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
