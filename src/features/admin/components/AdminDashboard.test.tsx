import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AdminAuditPage,
  AdminDashboardPage,
  AdminPlansPage,
  AdminUsersPage,
} from "./AdminDashboard";
import {
  useAdminPlans,
  useAdminUsers,
  useAuditLogs,
  useCreateAdminPlan,
  useDeleteAdminPlan,
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
  price_monthly: "199000",
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
const mockDeletePlan = vi.fn();

beforeEach(() => {
  mockCreatePlan.mockClear();
  mockDeletePlan.mockClear();

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
    mutate: vi.fn(),
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

  it("giá 0đ lưu được — đó là gói miễn phí, không đi qua cổng thanh toán", async () => {
    await dienForm("Dùng thử", "0");
    await userEvent.click(nutLuu());

    expect(mockCreatePlan).toHaveBeenCalledTimes(1);
    expect(mockCreatePlan.mock.calls[0][0]).toMatchObject({ price_monthly: "0" });
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
    expect(screen.getByRole("button", { name: /sửa gói/i })).toBeInTheDocument();
  });
});
