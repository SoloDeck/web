import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminLayout } from "./AdminLayout";
import { renderLayoutRoute } from "@/test/renderWithRouter";
import { useAdminPlans, useAdminUsers } from "@/features/admin/hooks/useAdmin";

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: { id: "admin-1", email: "admin@solodesk.dev", role: "admin" },
      logout: vi.fn(),
    }),
}));

vi.mock("@/features/admin/hooks/useAdmin", () => ({
  adminKeys: { all: ["admin"] },
  useAdminUsers: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useAdminPlans: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
}));

/** Sáu tab con + route index, đúng như cây route thật dưới `/admin`. */
const ADMIN_CHILD_PATHS = [
  "/",
  "/users",
  "/plans",
  "/templates",
  "/ai-config",
  "/ai-costs",
  "/audit",
];

function renderAdminLayout(initialPath: string) {
  return renderLayoutRoute({
    layoutPath: "/admin",
    layout: AdminLayout,
    childPaths: ADMIN_CHILD_PATHS,
    initialPath,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<AdminLayout /> — điều hướng trong ứng dụng", () => {
  it("mục nav là Link của router, KHÔNG phải <a href> trần", async () => {
    const { pathname } = await renderAdminLayout("/admin");

    const link = screen.getByRole("link", { name: /Tài khoản/ });
    expect(link).toHaveAttribute("href", "/admin/users");

    // Đây là ranh giới CHÍNH XÁC giữa con bug và bản vá, và là lý do không được mock
    // `Link`: anchor trần KHÔNG gọi `preventDefault` — trình duyệt cầm lấy sự kiện rồi
    // tải lại cả tài liệu. `Link` của router thì chặn. `fireEvent.click` trả về `false`
    // khi sự kiện bị chặn.
    expect(fireEvent.click(link)).toBe(false);
    await waitFor(() => expect(pathname()).toBe("/admin/users"));
  });

  it("đổi tab không dựng lại khung — vẫn đúng node thanh bên cũ", async () => {
    await renderAdminLayout("/admin");
    const sidebarTruoc = screen.getByRole("complementary");

    await userEvent.click(screen.getByRole("link", { name: /Nhật ký/ }));

    // `toBe` chứ không phải `toBeInTheDocument`: so DANH TÍNH node. Còn nguyên node cũ
    // nghĩa là React không hề unmount khung — thứ mà sáu route anh em ngày trước không
    // làm được, vì mỗi tab là một cây component riêng.
    expect(screen.getByRole("complementary")).toBe(sidebarTruoc);
  });

  it("tiêu đề và mục đang sáng chạy theo đường dẫn", async () => {
    await renderAdminLayout("/admin/plans");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gói dịch vụ");
  });

  it("/admin sáng đúng Tổng quan, không nuốt các tab con", async () => {
    // So khớp hẳn chứ không `startsWith`: `startsWith` thì `/admin` nuốt luôn mọi tab con
    // và cả bảy mục cùng sáng một lúc.
    await renderAdminLayout("/admin");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tổng quan");
    expect(screen.getAllByText("Tổng quan vận hành SoloDesk").length).toBeGreaterThan(0);
  });

  it("khung không gọi truy vấn riêng của tab nào", async () => {
    await renderAdminLayout("/admin/audit");

    expect(useAdminUsers).not.toHaveBeenCalled();
    expect(useAdminPlans).not.toHaveBeenCalled();
  });

  it("mở menu mobile rồi chọn tab thì menu tự đóng", async () => {
    await renderAdminLayout("/admin");
    const sidebar = screen.getByRole("complementary");

    // Thanh bên luôn nằm trong DOM, đóng/mở bằng `translate-x`. Bám vào lớp `translate-x-0`
    // là bám vào Tailwind, nên đọc trạng thái qua chính lớp phủ: nó chỉ tồn tại khi mở.
    await userEvent.click(screen.getByRole("button", { name: /Mở menu quản trị/ }));
    expect(document.querySelector("[aria-hidden='true'].fixed.inset-0")).not.toBeNull();

    await userEvent.click(within(sidebar).getByRole("link", { name: /Gói dịch vụ/ }));

    // Trước bản vá việc này xảy ra MIỄN PHÍ vì bấm tab là tải lại cả trang. Giờ khung
    // không rời DOM nữa nên phải đóng tay, nếu không trên điện thoại drawer che kín màn.
    await waitFor(() =>
      expect(document.querySelector("[aria-hidden='true'].fixed.inset-0")).toBeNull(),
    );
  });
});
