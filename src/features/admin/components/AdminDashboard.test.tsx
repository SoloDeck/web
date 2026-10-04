import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AdminAiConfigPage,
  AdminAuditPage,
  AdminDashboardPage,
  AdminPlansPage,
  AdminUsersPage,
} from "./AdminDashboard";
import {
  useAdminLLMProvider,
  useAdminPlans,
  useAdminUsers,
  useAuditLogs,
  useCreateAdminPlan,
  useDeleteAdminPlan,
  useUpdateAdminLLMProvider,
  useUpdateAdminPlan,
  useUpdateAdminUser,
} from "@/features/admin/hooks/useAdmin";
import type { AdminPlan, AdminUser } from "@/services/adminService";

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: {
        id: "admin-1",
        email: "admin@solodesk.dev",
        fullName: "SoloDesk Admin",
        role: "admin",
      },
      logout: vi.fn(),
    }),
}));

// Từ khi bảy màn admin nằm chung một đồ thị import, factory này phải khai ĐỦ mọi hook mà
// bất kỳ màn nào dùng — thiếu một cái là `TypeError: useX is not a function` ở màn khác.
vi.mock("@/features/admin/hooks/useAdmin", () => ({
  adminKeys: { all: ["admin"] },
  useAdminUsers: vi.fn(),
  useAdminPlans: vi.fn(),
  useUpdateAdminUser: vi.fn(),
  useCreateAdminPlan: vi.fn(),
  useUpdateAdminPlan: vi.fn(),
  useDeleteAdminPlan: vi.fn(),
  useAdminTemplates: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useCreateAdminTemplate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateAdminTemplate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAiCosts: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useAuditLogs: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useAdminLLMProvider: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useUpdateAdminLLMProvider: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  // Admin đổi gói tay cho freelancer — dùng khi thu tiền ngoài hệ thống. Không còn là
  // cách duy nhất để nâng gói kể từ khi có checkout MoMo.
  useOverrideSubscription: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const adminUser: AdminUser = {
  id: "u1",
  email: "admin@solodesk.dev",
  full_name: "SoloDesk Admin",
  role: "admin",
  status: "active",
  phone: null,
  created_at: "2026-06-01T00:00:00Z",
};

const freelancerUser: AdminUser = {
  id: "u2",
  email: "freelancer@solodesk.dev",
  full_name: "Freelancer Demo",
  role: "freelancer",
  status: "suspended",
  phone: null,
  created_at: "2026-06-02T00:00:00Z",
};

const plan: AdminPlan = {
  id: "p1",
  name: "Pro",
  slug: "pro",
  // ĐÚNG hình dạng backend trả: cột là `NUMERIC(10,2)` nên Decimal serialize ra kèm hai số
  // lẻ. Fixture cũ ghi "199000" trơn — vì thế bộ test này bỏ lọt lỗi form sửa gói đọc
  // "199000.00" thành 19.900.000.  #Huynh
  price_monthly: "199000.00",
  currency: "VND",
  can_use_ai: true,
  can_export_pdf: true,
  max_clients: 100,
  max_deals: 200,
  max_ai_generations_per_month: 50,
  is_active: true,
  created_at: "2026-06-01T00:00:00Z",
};

const mockCreatePlan = vi.fn();
const mockUpdatePlan = vi.fn();
const mockDeletePlan = vi.fn();
const mockUpdateProvider = vi.fn();

beforeEach(() => {
  mockCreatePlan.mockClear();
  mockUpdatePlan.mockClear();
  mockDeletePlan.mockClear();
  mockUpdateProvider.mockClear();

  vi.mocked(useAdminLLMProvider).mockReturnValue({
    data: { llm_provider: "groq", llm_model: "openai/gpt-oss-120b" },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAdminLLMProvider>);
  vi.mocked(useUpdateAdminLLMProvider).mockReturnValue({
    mutate: mockUpdateProvider,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateAdminLLMProvider>);

  vi.mocked(useAdminUsers).mockReturnValue({
    data: [adminUser, freelancerUser],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAdminUsers>);

  vi.mocked(useAdminPlans).mockReturnValue({
    data: [plan],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAdminPlans>);

  vi.mocked(useUpdateAdminUser).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateAdminUser>);
  vi.mocked(useCreateAdminPlan).mockReturnValue({
    mutate: mockCreatePlan,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateAdminPlan>);
  vi.mocked(useUpdateAdminPlan).mockReturnValue({
    mutate: mockUpdatePlan,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateAdminPlan>);
  vi.mocked(useDeleteAdminPlan).mockReturnValue({
    mutate: mockDeletePlan,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteAdminPlan>);
});

describe("<AdminDashboardPage /> + <AdminUsersPage />", () => {
  // Tiêu đề "Tổng quan" và câu mô tả nằm ở KHUNG, không phải ở màn này — hai khẳng định
  // đó đã chuyển sang `AdminLayout.test.tsx`.
  it("renders the admin dashboard summary without developer-only coverage data", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByText("Người dùng hoạt động")).toBeInTheDocument();
    expect(screen.getAllByText("Quản trị viên").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tạm khóa").length).toBeGreaterThan(0);
    expect(screen.queryByText("Backend readiness")).not.toBeInTheDocument();
  });

  it("tab Nhật ký hiện ngay, không đợi hai truy vấn nó không dùng", () => {
    // Bản cũ: khung gọi sẵn users + plans rồi lấy `isLoading` của chúng thay TOÀN BỘ vùng
    // nội dung — nên Nhật ký bị hai truy vấn không liên quan chặn ngang mặt.
    vi.mocked(useAdminUsers).mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminUsers>);
    vi.mocked(useAdminPlans).mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminPlans>);
    vi.mocked(useAuditLogs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAuditLogs>);

    render(<AdminAuditPage />);

    expect(screen.queryByText(/Đang tải dữ liệu quản trị/i)).not.toBeInTheDocument();
  });

  it("renders user management rows on the users page", async () => {
    render(<AdminUsersPage />);

    expect(screen.getAllByText("SoloDesk Admin").length).toBeGreaterThan(0);
    expect(screen.getByText("Freelancer Demo")).toBeInTheDocument();
    expect(screen.getAllByText("Tạm khóa").length).toBeGreaterThan(0);

    await userEvent.type(screen.getByPlaceholderText("Tìm theo tên hoặc email"), "demo");
    expect(screen.getByText("Freelancer Demo")).toBeInTheDocument();
  });

  it("does not allow admin to edit a user's display name", async () => {
    render(<AdminUsersPage />);

    await userEvent.click(screen.getAllByRole("button", { name: /Sửa/i })[0]);

    expect(screen.queryByLabelText("Tên người dùng")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quyền")).toBeInTheDocument();
    expect(screen.getByLabelText("Trạng thái")).toBeInTheDocument();
  });
});

/**
 * Các ô chọn ở trang Tài khoản phải hiện NHÃN TIẾNG VIỆT cả khi đã chọn xong / đang đóng, không in
 * giá trị thô. Lỗi thật: danh sách xổ ra ghi "Người dùng" nhưng ô chọn lại ghi "freelancer",
 * "active", "all" và nút "Đổi" gói hiện cả mã UUID của gói.
 */
describe("<AdminUsersPage /> — ô chọn hiện nhãn tiếng Việt", () => {
  const nguoiCoGoi: AdminUser = {
    ...freelancerUser,
    status: "active",
    subscription: { id: "s1", plan_id: "p1", plan_name: "Pro", plan_slug: "pro", status: "active" },
  };

  it("bộ lọc quyền và trạng thái lúc mới mở ghi 'Tất cả ...', không ghi 'all'", () => {
    render(<AdminUsersPage />);

    expect(screen.getByRole("combobox", { name: "Lọc quyền" })).toHaveTextContent("Tất cả quyền");
    expect(screen.getByRole("combobox", { name: "Lọc trạng thái" })).toHaveTextContent(
      "Tất cả trạng thái"
    );
    expect(screen.queryByText("all")).toBeNull();
  });

  it("chọn lọc 'Người dùng' xong thì ô chọn ghi 'Người dùng', không ghi 'freelancer'", async () => {
    render(<AdminUsersPage />);

    await userEvent.click(screen.getByRole("combobox", { name: "Lọc quyền" }));
    await userEvent.click(await screen.findByRole("option", { name: "Người dùng" }));

    const o = screen.getByRole("combobox", { name: "Lọc quyền" });
    expect(o).toHaveTextContent("Người dùng");
    expect(o).not.toHaveTextContent("freelancer");
  });

  it("chọn lọc 'Đang hoạt động' xong thì ô chọn ghi tiếng Việt, không ghi 'active'", async () => {
    render(<AdminUsersPage />);

    await userEvent.click(screen.getByRole("combobox", { name: "Lọc trạng thái" }));
    await userEvent.click(await screen.findByRole("option", { name: "Đang hoạt động" }));

    const o = screen.getByRole("combobox", { name: "Lọc trạng thái" });
    expect(o).toHaveTextContent("Đang hoạt động");
    expect(o).not.toHaveTextContent("active");
  });

  it("bấm Sửa thì ô Quyền và Trạng thái của dòng ghi nhãn tiếng Việt", async () => {
    render(<AdminUsersPage />);

    // Dòng thứ hai là Freelancer Demo: quyền freelancer, trạng thái suspended.
    await userEvent.click(screen.getAllByRole("button", { name: /Sửa/i })[1]);

    expect(screen.getByRole("combobox", { name: "Quyền" })).toHaveTextContent("Người dùng");
    expect(screen.getByRole("combobox", { name: "Quyền" })).not.toHaveTextContent("freelancer");
    expect(screen.getByRole("combobox", { name: "Trạng thái" })).toHaveTextContent("Tạm khóa");
    expect(screen.getByRole("combobox", { name: "Trạng thái" })).not.toHaveTextContent(
      "suspended"
    );
  });

  it("bấm Đổi gói thì ô chọn ghi TÊN gói, không ghi mã gói", async () => {
    vi.mocked(useAdminUsers).mockReturnValue({
      data: [nguoiCoGoi],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAdminUsers>);
    render(<AdminUsersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Đổi" }));

    const o = screen.getByRole("combobox", { name: "Đổi gói" });
    expect(o).toHaveTextContent("Pro");
    expect(o).not.toHaveTextContent("p1");
  });
});

/**
 * Hạn mức giá gói.
 *
 * Sự cố gốc: quản trị viên tạo được một gói giá 200đ. Form không cản, backend không cản,
 * DB không cản — và chỗ duy nhất biết 200đ là sai lại là MoMo, lúc người dùng đã bấm mua.
 *
 * Báo lỗi khi BẤM LƯU, không phải trong lúc gõ: gõ "1.000.000" thì có một khoảnh khắc
 * giá trị là "1", báo đỏ ngay lúc đó là mắng người ta giữa chừng câu.
 */
describe("<AdminPlansPage /> — hạn mức giá gói", () => {
  async function dienForm(ten: string, gia: string) {
    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^tạo gói$/i }));
    await userEvent.type(screen.getByLabelText("Tên gói"), ten);
    await userEvent.type(screen.getByLabelText("Giá tháng (VND)"), gia);
  }

  function nutLuu() {
    return screen.getByRole("button", { name: /tạo gói mới/i });
  }

  it("giá 200đ: bấm lưu thì báo ngay tại ô giá và KHÔNG gửi đi", async () => {
    await dienForm("abc", "200");

    // Nút vẫn bấm được — người dùng phải được quyền bấm rồi mới nghe phản hồi.
    expect(nutLuu()).toBeEnabled();
    await userEvent.click(nutLuu());

    expect(screen.getByText(/từ 1\.000đ đến 50\.000\.000đ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Giá tháng \(VND\)/)).toHaveAttribute("aria-invalid", "true");
    expect(mockCreatePlan).not.toHaveBeenCalled();
  });

  it("không treo sẵn dòng hướng dẫn khi chưa bấm lưu", async () => {
    await dienForm("abc", "200");

    expect(screen.queryByText(/từ 1\.000đ đến 50\.000\.000đ/i)).not.toBeInTheDocument();
  });

  it("sửa lại giá thì lỗi biến mất ngay, không bắt bấm lưu lần nữa mới hết đỏ", async () => {
    await dienForm("abc", "200");
    await userEvent.click(nutLuu());
    expect(screen.getByText(/từ 1\.000đ đến 50\.000\.000đ/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Giá tháng (VND)"), "0");

    expect(screen.queryByText(/từ 1\.000đ đến 50\.000\.000đ/i)).not.toBeInTheDocument();
  });

  it("giá trên 50 triệu cũng bị chặn", async () => {
    await dienForm("Khủng", "50000001");
    await userEvent.click(nutLuu());

    expect(mockCreatePlan).not.toHaveBeenCalled();
  });

  it("gói TỰ TẠO để 0đ thì bị chặn — không ai đăng ký được một gói như thế", async () => {
    // Đảo chiều so với bản trước, và đây là chỗ dễ hiểu nhầm nhất: 0đ nghe như "miễn phí"
    // nên tưởng vô hại. Thực tế backend từ chối mở phiên thanh toán cho mọi gói giá <= 0
    // (`initiate_checkout` → `PlanNotPurchasableError`), còn MoMo không nhận giao dịch dưới
    // 1.000đ — nên gói kiểu này nằm trong bảng giá chỉ để bày một cái nút bấm không được.
    //   #Huynh
    await dienForm("Dùng thử", "0");
    await userEvent.click(nutLuu());

    expect(screen.getByText(/chỉ gói free của hệ thống mới được để 0đ/i)).toBeInTheDocument();
    expect(mockCreatePlan).not.toHaveBeenCalled();
  });

  it("SỬA gói Free của hệ thống thì 0đ vẫn hợp lệ", async () => {
    // Gói `free` là gói seed, ai đăng ký cũng rơi vào nó và nó vốn không đi qua cổng thanh
    // toán. Chặn luôn cả nó là admin không lưu nổi một thay đổi nào trên gói Free.
    vi.mocked(useAdminPlans).mockReturnValue({
      data: [{ ...plan, id: "p-free", name: "Free", slug: "free", price_monthly: "0.00" }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAdminPlans>);

    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^sửa$/i }));
    await userEvent.clear(screen.getByLabelText("Giá tháng (VND)"));
    await userEvent.click(screen.getByRole("button", { name: /^lưu$/i }));

    expect(screen.queryByText(/hạn mức MoMo/i)).not.toBeInTheDocument();
    expect(mockUpdatePlan).toHaveBeenCalledTimes(1);
    expect(mockUpdatePlan.mock.calls[0][0].payload).toMatchObject({ price_monthly: "0" });
  });

  it("giá đúng hạn mức thì lưu được", async () => {
    await dienForm("Cơ bản", "99000");
    await userEvent.click(nutLuu());

    expect(mockCreatePlan).toHaveBeenCalledTimes(1);
    expect(mockCreatePlan.mock.calls[0][0]).toMatchObject({
      price_monthly: "99000",
      currency: "VND",
    });
  });
});

/**
 * Sửa gói — đọc giá cũ về form.
 *
 * Gói 199.000đ mở form sửa ra hiện 19.900.000: hai số lẻ của `NUMERIC(10,2)` bị đọc như
 * chữ số hàng đơn vị. Nhìn đã sai, nhưng phần nguy hiểm nằm ở nút Lưu — admin vào sửa mỗi
 * cái tên rồi bấm Lưu là con số phồng 100 lần đó đi thẳng lên server.
 */
describe("<AdminPlansPage /> — sửa gói đọc lại giá cũ", () => {
  async function moFormSua() {
    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^sửa$/i }));
  }

  it("giá 199.000 mở form sửa ra ĐÚNG 199.000, không phải 19.900.000", async () => {
    await moFormSua();

    expect(screen.getByLabelText("Giá tháng (VND)")).toHaveValue("199.000");
  });

  it("nút lưu của form sửa chỉ ghi 'Lưu', không còn 'Lưu gói'", async () => {
    await moFormSua();

    expect(screen.getByRole("button", { name: "Lưu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lưu gói/i })).toBeNull();
  });

  it("chỉ sửa tên rồi lưu thì giá gửi lên vẫn nguyên, không gấp 100 lần", async () => {
    await moFormSua();

    await userEvent.clear(screen.getByLabelText("Tên gói"));
    await userEvent.type(screen.getByLabelText("Tên gói"), "Pro 2026");
    await userEvent.click(screen.getByRole("button", { name: /^lưu$/i }));

    expect(mockUpdatePlan).toHaveBeenCalledTimes(1);
    expect(mockUpdatePlan.mock.calls[0][0]).toMatchObject({
      id: "p1",
      payload: expect.objectContaining({ name: "Pro 2026", price_monthly: "199000" }),
    });
  });
});

/**
 * Bốn thẻ số liệu của trang Gói dịch vụ xếp NGANG (số và dòng phụ cùng một hàng) cho thấp, giống các
 * trang quản trị khác — bản xếp dọc cao gấp đôi mà chỉ bày bốn con số.
 */
describe("<AdminPlansPage /> — thẻ số liệu gọn", () => {
  const THE: [string, string][] = [
    ["Tổng gói", "Danh mục gói dịch vụ"],
    ["Đang mở bán", "Có thể bán cho người dùng"],
    ["Gói có AI", "Cho phép tạo nội dung bằng AI"],
    ["Gói có PDF", "Cho phép xuất PDF"],
  ];

  it.each(THE)("thẻ '%s': số và dòng phụ nằm cùng một hàng, nhãn ở trên", (nhan, phu) => {
    render(<AdminPlansPage />);

    const the = screen.getByText(nhan).closest("section") as HTMLElement;
    const hang = within(the).getByText(phu).parentElement as HTMLElement;
    expect(hang.className).toContain("flex");
    expect(hang).not.toContainElement(screen.getByText(nhan));
    expect(hang.querySelector("p")).not.toBeNull();
  });

  it("bốn thẻ nằm chung một lưới, không có thẻ nào cao hơn kiểu xếp dọc cũ", () => {
    const { container } = render(<AdminPlansPage />);

    const luoi = screen.getByText("Tổng gói").closest("section")?.parentElement as HTMLElement;
    expect(luoi.querySelectorAll(":scope > section")).toHaveLength(4);
    // Kiểu xếp dọc cũ để biểu tượng nằm TRÊN nhãn (hàng đầu là cột); kiểu gọn để biểu tượng cạnh chữ.
    for (const section of Array.from(luoi.querySelectorAll(":scope > section"))) {
      expect((section.firstElementChild as HTMLElement).className).not.toContain("flex-col");
      expect((section.firstElementChild as HTMLElement).className).toContain("flex");
    }
    expect(container).toBeTruthy();
  });
});

/**
 * Xoá gói.
 *
 * Xoá thật chỉ dành cho ca "lỡ tay tạo nhầm". Gói đã có người dùng thì backend từ chối —
 * xoá là hoá đơn cũ mất chỗ trỏ về. Còn gói Free là gói hệ thống, không xoá được bao giờ.
 */
describe("<AdminPlansPage /> — xoá gói", () => {
  it("bấm Xoá thì mở hộp thoại hỏi lại, chưa gọi xoá", async () => {
    render(<AdminPlansPage />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^xoá$/i }));

    // Phải là hộp thoại thật (chặn thao tác khác, ghim tiêu điểm, Esc thoát), không phải
    // một khối chữ nở ra trong thẻ gói.
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toBeInTheDocument();
    expect(hopThoai).toHaveTextContent(/xoá hẳn gói/i);
    expect(hopThoai).toHaveTextContent("Pro");
    expect(mockDeletePlan).not.toHaveBeenCalled();
  });

  it("hộp thoại chỉ ra đường thay thế cho gói đã có người dùng", async () => {
    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^xoá$/i }));

    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent(/không hoàn tác được/i);
    expect(hopThoai).toHaveTextContent(/ngừng bán/i);
    expect(hopThoai).toHaveTextContent(/giữ quyền lợi tới hết kỳ/i);
  });

  it("xác nhận xong mới thật sự gọi xoá", async () => {
    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^xoá$/i }));

    // Nút trên thẻ gói và nút xác nhận cùng tên "Xoá" — phải khoanh trong hộp thoại,
    // nếu không test sẽ mơ hồ và chỉ tình cờ đúng nhờ Radix ẩn phần nền.
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: /^xoá$/i }));

    expect(mockDeletePlan).toHaveBeenCalledTimes(1);
    expect(mockDeletePlan.mock.calls[0][0]).toBe("p1");
  });

  it("bấm Huỷ thì đóng phần xác nhận và không xoá gì", async () => {
    render(<AdminPlansPage />);
    await userEvent.click(screen.getByRole("button", { name: /^xoá$/i }));

    await userEvent.click(screen.getByRole("button", { name: /^huỷ$/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockDeletePlan).not.toHaveBeenCalled();
  });

  it("gói Free không có nút xoá — backend từ chối, đừng bày nút chắc chắn hỏng", () => {
    vi.mocked(useAdminPlans).mockReturnValue({
      data: [{ ...plan, id: "p-free", name: "Free", slug: "free" }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAdminPlans>);

    render(<AdminPlansPage />);

    expect(screen.queryByRole("button", { name: /^xoá$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sửa$/i })).toBeInTheDocument();
  });
});

/**
 * Cấu hình AI.
 *
 * Backend bắt buộc cả `llm_provider` lẫn `llm_model` (openapi: AdminUpdateLLMProviderRequest)
 * và từ chối model không thuộc nhà cung cấp. Bản cũ tin rằng model ghi cứng trong code nên chỉ
 * gửi nhà cung cấp — mọi lần lưu đều 422, admin không đổi được AI. Mấy bài test cũ còn khoá
 * đúng cái sai đó ("lưu chỉ gửi llm_provider"), nên đã được viết lại.  #Huynh
 */
describe("<AdminAiConfigPage />", () => {
  // Ô chọn giờ là <Select> dùng chung (base-ui), KHÔNG phải <select> thuần: danh sách nằm
  // trong portal và chỉ tồn tại sau khi bấm mở.
  async function moOChon(nhan: RegExp) {
    await userEvent.click(screen.getByLabelText(nhan));
    return screen.findByRole("listbox");
  }

  it("chỉ cho chọn đúng ba nhà cung cấp backend chấp nhận", async () => {
    render(<AdminAiConfigPage />);

    const danhSach = await moOChon(/nhà cung cấp ai/i);
    const options = within(danhSach)
      .getAllByRole("option")
      .map((o) => o.textContent);

    expect(options).toEqual(["Groq", "Gemini", "Ollama"]);
  });

  it("đổi sang Gemini rồi lưu thì gửi cả nhà cung cấp lẫn model của Gemini", async () => {
    render(<AdminAiConfigPage />);

    const danhSach = await moOChon(/nhà cung cấp ai/i);
    await userEvent.click(within(danhSach).getByRole("option", { name: "Gemini" }));
    await userEvent.click(screen.getByRole("button", { name: /lưu cấu hình/i }));

    expect(mockUpdateProvider).toHaveBeenCalledTimes(1);
    expect(mockUpdateProvider.mock.calls[0][0]).toEqual({
      llm_provider: "gemini",
      llm_model: "gemini-2.5-flash",
    });
  });

  it("ô Model chỉ bày model của nhà cung cấp đang chọn", async () => {
    render(<AdminAiConfigPage />);

    const hang = await moOChon(/nhà cung cấp ai/i);
    await userEvent.click(within(hang).getByRole("option", { name: "Gemini" }));
    const models = await moOChon(/^model$/i);

    expect(within(models).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "gemini-2.5-flash",
      "gemini-3.5-flash-lite",
    ]);
  });

  it("phần 'Đang chạy' hiện cấu hình trên server, không phải ô đang chọn chưa lưu", async () => {
    render(<AdminAiConfigPage />);

    const danhSach = await moOChon(/nhà cung cấp ai/i);
    await userEvent.click(within(danhSach).getByRole("option", { name: "Gemini" }));

    expect(screen.getByText("openai/gpt-oss-120b", { selector: "span" })).toBeInTheDocument();
  });
});
