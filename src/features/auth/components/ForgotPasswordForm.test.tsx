import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockRequest = vi.fn();
const mockConfirm = vi.fn();
vi.mock("@/services/authService", () => ({
  requestPasswordReset: (...a: unknown[]) => mockRequest(...a),
  confirmPasswordReset: (...a: unknown[]) => mockConfirm(...a),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function goToOtpStep(user: ReturnType<typeof userEvent.setup>, email = "a@b.com") {
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: /gửi mã otp/i }));
  await screen.findByLabelText("Mã OTP");
}

describe("<ForgotPasswordForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue(undefined);
    mockConfirm.mockResolvedValue(undefined);
  });

  it("gửi OTP rồi chuyển sang bước nhập mã", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await goToOtpStep(user, "freelancer@solodesk.dev");

    expect(mockRequest).toHaveBeenCalledWith("freelancer@solodesk.dev");
    expect(screen.getByLabelText("Mật khẩu mới")).toBeInTheDocument();
  });

  it("đổi mật khẩu bằng OTP và báo thành công", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await goToOtpStep(user);

    await user.type(screen.getByLabelText("Mã OTP"), "123456");
    await user.type(screen.getByLabelText("Mật khẩu mới"), "MatKhauMoi2026");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu mới"), "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /đổi mật khẩu/i }));

    // BE chỉ nhận otp + new_password, KHÔNG cần email — mã tự định danh người dùng.
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith("123456", "MatKhauMoi2026"));
    expect(await screen.findByText(/đã đổi mật khẩu thành công/i)).toBeInTheDocument();
  });

  it("báo rõ khi mã OTP sai hoặc hết hạn, và KHÔNG đá người dùng đi đâu cả", async () => {
    const user = userEvent.setup();
    // BE trả 401 cho cả mã sai lẫn mã hết hạn — không phân biệt được.
    mockConfirm.mockRejectedValue({ response: { status: 401 } });

    render(<ForgotPasswordForm />);
    await goToOtpStep(user);

    await user.type(screen.getByLabelText("Mã OTP"), "000000");
    await user.type(screen.getByLabelText("Mật khẩu mới"), "MatKhauMoi2026");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu mới"), "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /đổi mật khẩu/i }));

    expect(await screen.findByText(/mã otp không đúng hoặc đã hết hạn/i)).toBeInTheDocument();
    // Người dùng phải được ở lại để gõ lại mã, không bị điều hướng đi đâu.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Mã OTP")).toBeInTheDocument();
  });

  it("mật khẩu xác nhận không khớp thì chặn ngay ở FE, không gọi API", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await goToOtpStep(user);

    await user.type(screen.getByLabelText("Mã OTP"), "123456");
    await user.type(screen.getByLabelText("Mật khẩu mới"), "MatKhauMoi2026");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu mới"), "KhacHoanToan2026");
    await user.click(screen.getByRole("button", { name: /đổi mật khẩu/i }));

    expect(await screen.findByText(/mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
