import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateDocEditor } from "@/features/admin/components/TemplateDocEditor";
import { previewAdminTemplate } from "@/services/adminService";
import type { AdminTemplate } from "@/services/adminService";

/**
 * Đầu mục TỰ THÊM của mẫu: thứ tự trong danh sách bên trái chính là thứ tự in trên giấy, nên admin
 * phải đổi được thứ tự bằng mũi tên lên/xuống. Bộ đầu mục có sẵn thì không dời được.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/services/adminService", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  previewAdminTemplate: vi.fn(),
}));

function mau(extra: { title: string; body: string }[]): AdminTemplate {
  return {
    id: "t1",
    name: "Báo giá thử",
    template_type: "proposal",
    profession: null,
    is_active: true,
    version_number: 1,
    content: { standard_terms: "Điều khoản chuẩn.", extra_sections: extra },
  } as unknown as AdminTemplate;
}

const BA_MUC = [
  { title: "Quyền sử dụng", body: "Một năm." },
  { title: "Bảo hành", body: "30 ngày." },
  { title: "Bảo mật", body: "Hai bên giữ kín." },
];

function dung(template: AdminTemplate) {
  const onSubmit = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TemplateDocEditor
        template={template}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    </QueryClientProvider>
  );
  return { onSubmit };
}

/** Các dòng của khối "Đầu mục tự thêm", theo thứ tự đang hiện. */
function dauMucTuThem(): string[] {
  const khoi = screen.getByText("Đầu mục tự thêm").parentElement as HTMLElement;
  return within(khoi)
    .getAllByRole("listitem")
    .map((li) => li.textContent?.trim() ?? "");
}

const len = (ten: string) => screen.getByRole("button", { name: `Đưa “${ten}” lên trên` });
const xuong = (ten: string) => screen.getByRole("button", { name: `Đưa “${ten}” xuống dưới` });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(previewAdminTemplate).mockResolvedValue("<html><body>to giay</body></html>");
});

describe("<TemplateDocEditor /> — đổi thứ tự đầu mục tự thêm", () => {
  it("mỗi đầu mục có mũi tên lên và xuống", () => {
    dung(mau(BA_MUC));

    for (const ten of ["Quyền sử dụng", "Bảo hành", "Bảo mật"]) {
      expect(len(ten)).toBeInTheDocument();
      expect(xuong(ten)).toBeInTheDocument();
    }
  });

  it("mục đầu không lên được, mục cuối không xuống được", () => {
    dung(mau(BA_MUC));

    expect(len("Quyền sử dụng")).toBeDisabled();
    expect(xuong("Quyền sử dụng")).toBeEnabled();
    expect(len("Bảo mật")).toBeEnabled();
    expect(xuong("Bảo mật")).toBeDisabled();
    expect(len("Bảo hành")).toBeEnabled();
    expect(xuong("Bảo hành")).toBeEnabled();
  });

  it("bấm 'xuống dưới' ở mục đầu thì nó đứng thứ hai", async () => {
    dung(mau(BA_MUC));

    await userEvent.click(xuong("Quyền sử dụng"));

    expect(dauMucTuThem()).toEqual(["Bảo hành", "Quyền sử dụng", "Bảo mật"]);
  });

  it("bấm 'lên trên' ở mục cuối thì nó đứng thứ hai", async () => {
    dung(mau(BA_MUC));

    await userEvent.click(len("Bảo mật"));

    expect(dauMucTuThem()).toEqual(["Quyền sử dụng", "Bảo mật", "Bảo hành"]);
  });

  it("đưa một mục từ cuối lên đầu bằng hai lần bấm", async () => {
    dung(mau(BA_MUC));

    await userEvent.click(len("Bảo mật"));
    await userEvent.click(len("Bảo mật"));

    expect(dauMucTuThem()).toEqual(["Bảo mật", "Quyền sử dụng", "Bảo hành"]);
    // Tới đầu rồi thì mũi tên lên của chính mục đó khoá lại.
    expect(len("Bảo mật")).toBeDisabled();
  });

  it("lưu mẫu sau khi đổi: extra_sections đi theo thứ tự mới, mỗi mục giữ nguyên tên và nội dung", async () => {
    const { onSubmit } = dung(mau(BA_MUC));

    await userEvent.click(len("Bảo hành"));
    await userEvent.click(screen.getByRole("button", { name: "Lưu mẫu" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const content = onSubmit.mock.calls[0][0].content as Record<string, unknown>;
    expect(content.extra_sections).toEqual([
      { title: "Bảo hành", body: "30 ngày." },
      { title: "Quyền sử dụng", body: "Một năm." },
      { title: "Bảo mật", body: "Hai bên giữ kín." },
    ]);
    // Các phần khác của mẫu không bị đụng tới.
    expect(content.standard_terms).toBe("Điều khoản chuẩn.");
  });

  it("đổi thứ tự thì dựng lại tờ giấy với thứ tự mới", async () => {
    dung(mau(BA_MUC));
    await waitFor(() => expect(previewAdminTemplate).toHaveBeenCalledTimes(1));

    await userEvent.click(xuong("Quyền sử dụng"));

    await waitFor(() => expect(previewAdminTemplate).toHaveBeenCalledTimes(2));
    const guiLanHai = vi.mocked(previewAdminTemplate).mock.calls[1][0];
    expect(
      (guiLanHai.content.extra_sections as { title: string }[]).map((m) => m.title)
    ).toEqual(["Bảo hành", "Quyền sử dụng", "Bảo mật"]);
  });

  it("mục chưa đặt tên cũng dời được, nút nói rõ là 'đầu mục chưa đặt tên'", async () => {
    dung(mau([{ title: "", body: "" }, { title: "Bảo hành", body: "30 ngày." }]));

    const xuongMucTrong = screen.getByRole("button", {
      name: "Đưa đầu mục chưa đặt tên xuống dưới",
    });
    await userEvent.click(xuongMucTrong);

    expect(dauMucTuThem()[0]).toContain("Bảo hành");
    expect(dauMucTuThem()[1]).toContain("Chưa đặt tên");
  });

  it("tên có khoảng trắng thừa vẫn ra nhãn gọn; tên toàn khoảng trắng coi như chưa đặt tên", () => {
    dung(mau([{ title: "   ", body: "" }, { title: "  Bảo hành ", body: "30 ngày." }]));

    expect(
      screen.getByRole("button", { name: "Đưa đầu mục chưa đặt tên xuống dưới" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đưa “Bảo hành” lên trên" })).toBeInTheDocument();
  });

  it("ba nút điều khiển gom thành MỘT cụm ở cuối hàng — vị trí không phụ thuộc độ dài tên", () => {
    // Tên rất dài (bị cắt "...") và tên ngắn phải cho ra cùng một bố cục: nút tên chiếm chỗ còn
    // lại, cụm điều khiển luôn sát mép phải theo thứ tự lên – xuống – xoá.
    const tenDai = "Một đầu mục có cái tên dài lê thê chắc chắn phải bị cắt bớt khi hiện";
    dung(mau([{ title: tenDai, body: "x" }, { title: "Ngắn", body: "y" }]));

    for (const ten of [tenDai, "Ngắn"]) {
      const hang = len(ten).closest("li") as HTMLElement;
      const cum = hang.lastElementChild as HTMLElement;

      expect(hang.firstElementChild?.tagName).toBe("BUTTON"); // nút tên đứng đầu hàng
      expect(hang.firstElementChild).not.toBe(cum);
      expect(cum).toHaveClass("shrink-0");
      expect(
        within(cum)
          .getAllByRole("button")
          .map((nut) => nut.getAttribute("title"))
      ).toEqual(["Đưa lên trên", "Đưa xuống dưới", "Xoá hẳn đầu mục này"]);
    }
  });

  it("thùng rác hiện sẵn, không đợi rê chuột — để cụm điều khiển luôn thấy sát mép phải", () => {
    dung(mau(BA_MUC));

    const thungRac = screen.getAllByTitle("Xoá hẳn đầu mục này");

    expect(thungRac).toHaveLength(3);
    for (const nut of thungRac) {
      expect(nut).not.toHaveClass("opacity-0");
      expect(nut.className).not.toContain("group-hover");
    }
  });

  it("chỉ có một đầu mục thì cả hai mũi tên đều khoá", () => {
    dung(mau([{ title: "Bảo hành", body: "30 ngày." }]));

    expect(len("Bảo hành")).toBeDisabled();
    expect(xuong("Bảo hành")).toBeDisabled();
  });

  it("chưa có đầu mục tự thêm nào thì không có mũi tên nào", () => {
    dung(mau([]));

    expect(screen.queryByRole("button", { name: /Đưa .* lên trên/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Đưa .* xuống dưới/ })).toBeNull();
  });

  it("sau khi xoá một mục, mũi tên của các mục còn lại cập nhật theo", async () => {
    dung(mau(BA_MUC));

    await userEvent.click(screen.getAllByTitle("Xoá hẳn đầu mục này")[2]);

    expect(dauMucTuThem()).toEqual(["Quyền sử dụng", "Bảo hành"]);
    expect(xuong("Bảo hành")).toBeDisabled();
    expect(xuong("Quyền sử dụng")).toBeEnabled();
  });
});
