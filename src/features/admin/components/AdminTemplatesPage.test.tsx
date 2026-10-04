import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTemplatesPage } from "@/features/admin/components/AdminDashboard";
import { useAdminTemplates } from "@/features/admin/hooks/useAdmin";
import type { AdminTemplate } from "@/services/adminService";

/**
 * Thư viện mẫu của admin phải chia trang: mỗi mẫu thêm vào là trang dài thêm một thẻ, mẫu càng
 * nhiều thì trang kéo dài vô tận. Bộ lọc loại/nghề đổi thì về trang 1, và xoá bớt mẫu khiến trang
 * hiện tại không còn thì lùi về trang cuối chứ không để admin đứng ở một trang trống.
 */

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/features/admin/hooks/useAdmin", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAdminTemplates: vi.fn(),
  useCreateAdminTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminTemplate: () => ({ mutate: vi.fn(), isPending: false }),
}));

function mau(count: number): AdminTemplate[] {
  return Array.from({ length: count }, (_, index) => {
    const so = String(index + 1).padStart(2, "0");
    return {
      id: `t${so}`,
      name: `Mẫu số ${so}`,
      template_type: index % 2 === 0 ? "proposal" : "contract",
      profession: null,
      content: { standard_terms: `Điều khoản của mẫu ${so}.` },
      is_active: true,
      version_number: 1,
    } as unknown as AdminTemplate;
  });
}

function dungDanhSach(templates: AdminTemplate[]) {
  vi.mocked(useAdminTemplates).mockReturnValue({
    data: templates,
    isLoading: false,
  } as unknown as ReturnType<typeof useAdminTemplates>);
}

function veTrang() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminTemplatesPage />
    </QueryClientProvider>
  );
}

const hienMau = (so: string) => screen.queryByText(`Mẫu số ${so}`);
const sauNut = () => screen.getByRole("button", { name: "Sau" });
const truocNut = () => screen.getByRole("button", { name: "Trước" });
const trang = (n: number) => screen.getByRole("button", { name: `Trang ${n}` });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<AdminTemplatesPage /> — phân trang", () => {
  it("14 mẫu chỉ hiện 6 mẫu đầu, kèm dòng 'Hiển thị 1-6 trong 14 mẫu'", () => {
    dungDanhSach(mau(14));
    veTrang();

    for (const so of ["01", "02", "03", "04", "05", "06"]) expect(hienMau(so)).toBeInTheDocument();
    expect(hienMau("07")).toBeNull();
    expect(hienMau("14")).toBeNull();
    expect(screen.getByText("Hiển thị 1-6 trong 14 mẫu")).toBeInTheDocument();
  });

  it("chia đúng số trang: 14 mẫu → 3 trang", () => {
    dungDanhSach(mau(14));
    veTrang();

    expect(trang(1)).toBeInTheDocument();
    expect(trang(2)).toBeInTheDocument();
    expect(trang(3)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trang 4" })).toBeNull();
  });

  it("sang trang 2 thì hiện mẫu 7-12 và bỏ các mẫu trang 1", async () => {
    dungDanhSach(mau(14));
    veTrang();

    await userEvent.click(trang(2));

    expect(hienMau("01")).toBeNull();
    expect(hienMau("06")).toBeNull();
    expect(hienMau("07")).toBeInTheDocument();
    expect(hienMau("12")).toBeInTheDocument();
    expect(hienMau("13")).toBeNull();
    expect(screen.getByText("Hiển thị 7-12 trong 14 mẫu")).toBeInTheDocument();
  });

  it("trang cuối chỉ có phần mẫu còn lại: 'Hiển thị 13-14 trong 14 mẫu'", async () => {
    dungDanhSach(mau(14));
    veTrang();

    await userEvent.click(trang(3));

    expect(hienMau("13")).toBeInTheDocument();
    expect(hienMau("14")).toBeInTheDocument();
    expect(hienMau("12")).toBeNull();
    expect(screen.getByText("Hiển thị 13-14 trong 14 mẫu")).toBeInTheDocument();
  });

  it("nút Trước/Sau đi từng trang và bị khoá ở hai đầu", async () => {
    dungDanhSach(mau(14));
    veTrang();
    expect(truocNut()).toBeDisabled();

    await userEvent.click(sauNut());
    expect(hienMau("07")).toBeInTheDocument();
    expect(truocNut()).toBeEnabled();

    await userEvent.click(sauNut());
    expect(hienMau("13")).toBeInTheDocument();
    expect(sauNut()).toBeDisabled();

    await userEvent.click(truocNut());
    expect(hienMau("07")).toBeInTheDocument();
  });

  it("đúng 6 mẫu thì chỉ một trang", () => {
    dungDanhSach(mau(6));
    veTrang();

    expect(hienMau("06")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 1-6 trong 6 mẫu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trang 2" })).toBeNull();
    expect(sauNut()).toBeDisabled();
  });

  it("7 mẫu thì mẫu thứ 7 nằm riêng ở trang 2", async () => {
    dungDanhSach(mau(7));
    veTrang();
    expect(hienMau("07")).toBeNull();

    await userEvent.click(trang(2));

    expect(hienMau("07")).toBeInTheDocument();
    expect(hienMau("06")).toBeNull();
    expect(screen.getByText("Hiển thị 7-7 trong 7 mẫu")).toBeInTheDocument();
  });

  it("các thẻ số liệu đếm cả thư viện, không chỉ trang đang xem", () => {
    dungDanhSach(mau(14));
    veTrang();

    const theTong = (nhan: string) =>
      screen
        .getAllByText(nhan)
        .map((el) => el.closest("section"))
        .find((the) => the?.textContent?.includes("Theo bộ lọc") || the?.textContent?.includes("dùng được"));
    expect(theTong("Tổng mẫu")).toHaveTextContent("14");
    // Mỗi thẻ mẫu cũng có huy hiệu "Đang bật"; thẻ số liệu là thẻ có dòng phụ "Mẫu đang dùng được".
    expect(theTong("Đang bật")).toHaveTextContent("14");
  });

  it("đổi bộ lọc loại tài liệu thì về trang 1", async () => {
    dungDanhSach(mau(14));
    veTrang();
    await userEvent.click(trang(2));
    expect(screen.getByText("Hiển thị 7-12 trong 14 mẫu")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Lọc loại tài liệu" }));
    await userEvent.click(await screen.findByRole("option", { name: "Báo giá" }));

    expect(screen.getByText("Hiển thị 1-6 trong 14 mẫu")).toBeInTheDocument();
    expect(hienMau("01")).toBeInTheDocument();
  });

  it("đổi bộ lọc nghề thì về trang 1", async () => {
    dungDanhSach(mau(14));
    veTrang();
    await userEvent.click(trang(3));
    expect(screen.getByText("Hiển thị 13-14 trong 14 mẫu")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Lọc nghề" }));
    await userEvent.click(await screen.findByRole("option", { name: "Thiết kế UI/UX" }));

    expect(screen.getByText("Hiển thị 1-6 trong 14 mẫu")).toBeInTheDocument();
  });

  it("xoá bớt mẫu khiến trang hiện tại không còn → lùi về trang cuối, không để trang trống", async () => {
    dungDanhSach(mau(14));
    const { rerender } = veTrang();
    await userEvent.click(trang(3));
    expect(hienMau("13")).toBeInTheDocument();

    dungDanhSach(mau(8));
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AdminTemplatesPage />
      </QueryClientProvider>
    );

    expect(screen.getByText("Hiển thị 7-8 trong 8 mẫu")).toBeInTheDocument();
    expect(hienMau("07")).toBeInTheDocument();
    expect(hienMau("08")).toBeInTheDocument();
    expect(screen.queryByText(/Chưa có mẫu nào khớp/)).toBeNull();
  });

  it("thư viện trống thì hiện lời nhắn tạo mẫu và không có thanh phân trang", () => {
    dungDanhSach([]);
    veTrang();

    expect(screen.getByText(/Chưa có mẫu nào khớp bộ lọc/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sau" })).toBeNull();
    expect(screen.queryByText(/Hiển thị/)).toBeNull();
  });
});

describe("<AdminTemplatesPage /> — tìm theo tên", () => {
  const TEN = [
    "Báo giá Lập trình phần mềm",
    "Hợp đồng Lập trình phần mềm",
    "Báo giá Thiết kế UI/UX",
    "Hợp đồng Thiết kế UI/UX",
    "Báo giá Thiết kế đồ họa",
    "Hợp đồng Nhiếp ảnh và Quay dựng video",
  ];

  function dungTheoTen(names: string[]) {
    dungDanhSach(
      names.map(
        (name, index) =>
          ({
            id: `n${index}`,
            name,
            template_type: "proposal",
            profession: null,
            content: { standard_terms: "x" },
            is_active: true,
            version_number: 1,
          }) as unknown as AdminTemplate
      )
    );
  }

  const oTim = () => screen.getByRole("textbox", { name: "Tìm mẫu theo tên" });

  it("có ô tìm và gõ không dấu vẫn ra mẫu có dấu", async () => {
    dungTheoTen(TEN);
    veTrang();

    await userEvent.type(oTim(), "lap trinh");

    expect(screen.getByText("Báo giá Lập trình phần mềm")).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng Lập trình phần mềm")).toBeInTheDocument();
    expect(screen.queryByText("Báo giá Thiết kế UI/UX")).toBeNull();
    expect(screen.getByText("Hiển thị 1-2 trong 2 mẫu")).toBeInTheDocument();
  });

  it("không phân biệt hoa thường, khớp cả giữa tên", async () => {
    dungTheoTen(TEN);
    veTrang();

    await userEvent.type(oTim(), "UI/UX");

    expect(screen.getByText("Báo giá Thiết kế UI/UX")).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng Thiết kế UI/UX")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 1-2 trong 2 mẫu")).toBeInTheDocument();
  });

  it("không khớp mẫu nào thì báo rõ chữ đang tìm và bỏ thanh phân trang", async () => {
    dungTheoTen(TEN);
    veTrang();

    await userEvent.type(oTim(), "xyz");

    expect(screen.getByText(/Không có mẫu nào có tên chứa “xyz”/)).toBeInTheDocument();
    expect(screen.queryByText(/Hiển thị/)).toBeNull();
    // Khác lời nhắn "thư viện trống": ở đây thư viện KHÔNG trống, chỉ là chữ tìm không ra.
    expect(screen.queryByText(/Chưa có mẫu nào khớp bộ lọc/)).toBeNull();
  });

  it("nút X xoá chữ tìm và trả lại cả thư viện", async () => {
    dungTheoTen(TEN);
    veTrang();
    await userEvent.type(oTim(), "xyz");

    await userEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));

    expect(oTim()).toHaveValue("");
    expect(screen.getByText("Hiển thị 1-6 trong 6 mẫu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa tìm kiếm" })).toBeNull();
  });

  it("ô tìm trống thì không có nút X", () => {
    dungTheoTen(TEN);
    veTrang();

    expect(screen.queryByRole("button", { name: "Xóa tìm kiếm" })).toBeNull();
  });

  it("chỉ gõ khoảng trắng thì coi như chưa tìm gì", async () => {
    dungTheoTen(TEN);
    veTrang();

    await userEvent.type(oTim(), "   ");

    expect(screen.getByText("Hiển thị 1-6 trong 6 mẫu")).toBeInTheDocument();
  });

  it("gõ tìm khi đang ở trang 2 thì về trang 1 của kết quả", async () => {
    dungDanhSach(mau(14));
    veTrang();
    await userEvent.click(trang(2));
    expect(screen.getByText("Hiển thị 7-12 trong 14 mẫu")).toBeInTheDocument();

    await userEvent.type(oTim(), "mau so 1");

    // "Mẫu số 10" … "Mẫu số 14" — năm kết quả, nằm gọn trang 1.
    expect(screen.getByText("Hiển thị 1-5 trong 5 mẫu")).toBeInTheDocument();
    expect(hienMau("10")).toBeInTheDocument();
    expect(hienMau("14")).toBeInTheDocument();
    expect(hienMau("01")).toBeNull();
  });

  it("đang ở trang cuối mà gõ tìm → về trang 1 của kết quả, không đứng ở trang giữa chừng", async () => {
    dungDanhSach(mau(14));
    veTrang();
    await userEvent.click(trang(3));
    expect(screen.getByText("Hiển thị 13-14 trong 14 mẫu")).toBeInTheDocument();

    await userEvent.type(oTim(), "mau");

    expect(screen.getByText("Hiển thị 1-6 trong 14 mẫu")).toBeInTheDocument();
  });

  it("thư viện trống mà chỉ gõ khoảng trắng → vẫn là lời nhắn 'chưa có mẫu', không đổ cho chữ tìm", async () => {
    dungDanhSach([]);
    veTrang();

    await userEvent.type(oTim(), "   ");

    expect(screen.getByText(/Chưa có mẫu nào khớp bộ lọc/)).toBeInTheDocument();
    expect(screen.queryByText(/Không có mẫu nào có tên chứa/)).toBeNull();
  });

  it("kết quả tìm dài vẫn chia trang", async () => {
    dungDanhSach(mau(14));
    veTrang();

    await userEvent.type(oTim(), "mau");
    await userEvent.click(trang(2));

    expect(screen.getByText("Hiển thị 7-12 trong 14 mẫu")).toBeInTheDocument();
  });

  it("các thẻ số liệu đếm theo kết quả tìm", async () => {
    dungTheoTen(TEN);
    veTrang();

    await userEvent.type(oTim(), "lap trinh");

    const the = screen
      .getAllByText("Tổng mẫu")
      .map((el) => el.closest("section"))
      .find((x) => x?.textContent?.includes("Theo bộ lọc"));
    expect(the).toHaveTextContent("2");
  });
});
