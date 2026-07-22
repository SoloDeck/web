import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDashboard } from "./AdminDashboard";
import {
  useAdminPlans,
  useAdminUsers,
  useCreateAdminPlan,
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

vi.mock("@/features/admin/hooks/useAdmin", () => ({
  useAdminUsers: vi.fn(),
  useAdminPlans: vi.fn(),
  useUpdateAdminUser: vi.fn(),
  useCreateAdminPlan: vi.fn(),
  useUpdateAdminPlan: vi.fn(),
  // Admin đổi gói cho freelancer — cách DUY NHẤT để nâng gói (không có thanh toán tự động).
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

beforeEach(() => {
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
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateAdminPlan>);
  vi.mocked(useUpdateAdminPlan).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateAdminPlan>);
});

describe("<AdminDashboard />", () => {
  it("renders the admin dashboard summary without developer-only coverage data", () => {
    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { name: "Tổng quan" })).toBeInTheDocument();
    expect(screen.getAllByText("Tổng quan vận hành SoloDesk").length).toBeGreaterThan(0);
    expect(screen.getByText("Người dùng hoạt động")).toBeInTheDocument();
    expect(screen.getAllByText("Quản trị viên").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tạm khóa").length).toBeGreaterThan(0);
    expect(screen.queryByText("Backend readiness")).not.toBeInTheDocument();
  });

  it("renders user management rows on the users page", async () => {
    render(<AdminDashboard page="users" />);

    expect(screen.getAllByText("SoloDesk Admin").length).toBeGreaterThan(0);
    expect(screen.getByText("Freelancer Demo")).toBeInTheDocument();
    expect(screen.getAllByText("Tạm khóa").length).toBeGreaterThan(0);

    await userEvent.type(screen.getByPlaceholderText("Tìm theo tên hoặc email"), "demo");
    expect(screen.getByText("Freelancer Demo")).toBeInTheDocument();
  });

  it("does not allow admin to edit a user's display name", async () => {
    render(<AdminDashboard page="users" />);

    await userEvent.click(screen.getAllByRole("button", { name: /Sửa/i })[0]);

    expect(screen.queryByLabelText("Tên người dùng")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quyền")).toBeInTheDocument();
    expect(screen.getByLabelText("Trạng thái")).toBeInTheDocument();
  });
});
