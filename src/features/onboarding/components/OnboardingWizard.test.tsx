import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { OnboardingWizard } from "./OnboardingWizard";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUpdateMe = vi.fn();
const mockUpdateFreelancer = vi.fn();
const mockUpdateProfessional = vi.fn();
vi.mock("@/services/usersService", () => ({
  getMe: () =>
    Promise.resolve({
      id: "u1",
      email: "thiet.ke@example.com",
      full_name: "Trần Thị Thiết Kế",
      role: "freelancer",
      status: "active",
      phone: null,
      avatar_url: null,
      bio: null,
      intake_share_token: null,
      professional_profile: {
        skills: null,
        specialization: null,
        default_hourly_rate: null,
        currency: "VND",
        portfolio_url: null,
        business_name: null,
      },
      preferences: {
        locale: "vi",
        timezone: "Asia/Ho_Chi_Minh",
        notification_channel: "email",
        theme: "light",
      },
      created_at: "2026-07-11T00:00:00Z",
    }),
  updateMe: (...args: unknown[]) => mockUpdateMe(...args),
  updateFreelancerProfile: (...args: unknown[]) => mockUpdateFreelancer(...args),
  updateProfessionalProfile: (...args: unknown[]) => mockUpdateProfessional(...args),
}));

vi.mock("@/services/profileService", () => ({
  loadProfile: () => ({ skills: [], serviceCategories: [] }),
  saveProfile: vi.fn(),
}));

const mockMarkSkipped = vi.fn();
vi.mock("@/features/onboarding/skip", () => ({
  markOnboardingSkipped: () => mockMarkSkipped(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderWizard(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("<OnboardingWizard />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMe.mockResolvedValue({});
    mockUpdateFreelancer.mockResolvedValue({});
    mockUpdateProfessional.mockResolvedValue({});
  });

  it("hiện tên và email của tài khoản vừa đăng ký", async () => {
    renderWizard(<OnboardingWizard />);

    expect(await screen.findByText("Trần Thị Thiết Kế")).toBeInTheDocument();
    expect(screen.getByText("thiet.ke@example.com")).toBeInTheDocument();
  });

  it("điền sẵn chức danh và kỹ năng lên thẻ khi chọn mảng nghề", async () => {
    const user = userEvent.setup();
    renderWizard(<OnboardingWizard />);
    await screen.findByText("Trần Thị Thiết Kế");

    await user.click(screen.getByRole("button", { name: /lập trình web/i }));

    // Chức danh nhảy lên thẻ hồ sơ, kèm kỹ năng gợi ý — hồ sơ "thành hình" trước mắt.
    expect(await screen.findByText("ReactJS")).toBeInTheDocument();
    expect(screen.getByText("NodeJS")).toBeInTheDocument();
  });

  it("cho sửa tên hiển thị và thêm câu giới thiệu, rồi gửi lên BE", async () => {
    const user = userEvent.setup();
    renderWizard(<OnboardingWizard />);
    await screen.findByText("Trần Thị Thiết Kế");

    await user.click(screen.getByRole("button", { name: /trần thị thiết kế/i }));
    const nameInput = screen.getByLabelText(/tên hiển thị/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Thiết Kế Studio");

    await user.click(screen.getByRole("button", { name: /thêm câu giới thiệu ngắn/i }));
    await user.type(screen.getByLabelText(/câu giới thiệu/i), "5 năm làm nhận diện thương hiệu.");

    await user.click(screen.getByRole("button", { name: /lập trình web/i }));
    await user.click(screen.getByRole("button", { name: /bắt đầu dùng solodesk/i }));

    await waitFor(() =>
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Thiết Kế Studio",
          bio: "5 năm làm nhận diện thương hiệu.",
        })
      )
    );
  });

  it("ghi SLUG danh bạ vào service_categories, không phải chức danh nghề", async () => {
    // Đây chính là chỗ đã để lọt lỗi: trước đây onboarding ghi "Web Developer" trong khi
    // /find-freelancer lọc bằng "programming", nên chọn nhóm nào cũng ra rỗng — mà không
    // test nào khẳng định payload này. Backend giờ trả 422 nếu gửi sai.  #Huynh
    const user = userEvent.setup();
    renderWizard(<OnboardingWizard />);
    await screen.findByText("Trần Thị Thiết Kế");

    await user.click(screen.getByRole("button", { name: /lập trình web/i }));
    await user.click(screen.getByRole("button", { name: /bắt đầu dùng solodesk/i }));

    await waitFor(() =>
      expect(mockUpdateFreelancer).toHaveBeenCalledWith(
        expect.objectContaining({ service_categories: ["programming"] })
      )
    );

    // `specialization` thì GIỮ NGUYÊN chức danh: frontend dùng nó làm cờ đã-xong-onboarding.
    expect(mockUpdateProfessional).toHaveBeenCalledWith(
      expect.objectContaining({ specialization: "Web Developer" })
    );
  });

  it("lưu số điện thoại TRƯỚC hồ sơ nghề nghiệp, để 409 không ghi nửa vời", async () => {
    const user = userEvent.setup();
    // SĐT trùng → BE trả 409; specialization TUYỆT ĐỐI không được lưu, vì guard ở "/"
    // sẽ coi như đã onboard xong rồi thả người dùng đi với SĐT chưa lưu.
    mockUpdateMe.mockRejectedValue({ response: { status: 409 } });

    renderWizard(<OnboardingWizard />);
    await screen.findByText("Trần Thị Thiết Kế");

    await user.click(screen.getByRole("button", { name: /thêm số điện thoại/i }));
    await user.type(screen.getByLabelText(/số điện thoại/i), "0909123456");
    await user.click(screen.getByRole("button", { name: /lập trình web/i }));
    await user.click(screen.getByRole("button", { name: /bắt đầu dùng solodesk/i }));

    await waitFor(() => expect(mockUpdateMe).toHaveBeenCalled());
    expect(mockUpdateFreelancer).not.toHaveBeenCalled();
    expect(mockUpdateProfessional).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("ghi nhận việc bỏ qua để guard ở \"/\" không đá ngược lại thành vòng lặp", async () => {
    const user = userEvent.setup();
    renderWizard(<OnboardingWizard />);
    await screen.findByText("Trần Thị Thiết Kế");

    await user.click(screen.getByRole("button", { name: /bỏ qua, để sau/i }));

    expect(mockMarkSkipped).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });
});
