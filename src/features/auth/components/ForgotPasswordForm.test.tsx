import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
  }, 20_000);

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
  }, 20_000);

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
  }, 20_000);

  it("nói rõ mã CHỈ được gửi nếu email đã đăng ký", async () => {
    // Không được khẳng định chắc nịch "đã gửi mã tới email của bạn" — với email chưa đăng ký
    // thì đó là nói dối, và người dùng sẽ ngồi đợi.
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await goToOtpStep(user, "nguoi-la@example.com");

    expect(screen.getByText(/nếu/i)).toBeInTheDocument();
    expect(screen.getByText(/đã đăng ký/i)).toBeInTheDocument();
  }, 20_000);

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
  }, 20_000);
});

/**
 * Bản trước gộp MỌI kiểu hỏng vào một câu "Hệ thống chưa gửi được email lúc này. Vui lòng
 * thử lại sau ít phút." — nên khi staging thật sự hỏng ngày 04/08, màn hình không nói được
 * gì và phải đi gọi API thật để đo mới biết nguyên nhân.
 *
 * Bộ test này canh đúng một điều: BA tình huống khác nhau phải cho BA câu khác nhau.
 */
describe("<ForgotPasswordForm /> — nói ra vì sao không gửi được mã", () => {
  const LOI_MANG = { message: "Network Error" };
  const LOI_HOP_THU = {
    response: {
      status: 502,
      data: {
        error: {
          code: "EMAIL_DELIVERY_FAILED",
          message: "Hộp thư hệ thống đã chạm giới hạn gửi trong ngày. Vui lòng thử lại sau vài giờ.",
        },
      },
    },
  };
  const LOI_QUA_NHIEU_LAN = {
    response: {
      status: 429,
      data: { error: { code: "RATE_LIMITED", message: "Thử lại sau 5 phút." } },
    },
  };

  async function guiEmailVaDocLoi(loi: unknown): Promise<string> {
    mockRequest.mockRejectedValue(loi);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /gửi mã otp/i }));
    return (await screen.findByRole("alert")).textContent ?? "";
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(undefined);
    // Nuốt log trong test cho output sạch — nhưng vẫn khẳng định nó ĐƯỢC gọi ở dưới.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("mất mạng thì nói là mất mạng, không đổ cho hệ thống thư", async () => {
    // Không có `response` = request chưa từng nhận được câu trả lời. Bảo người dùng
    // "hệ thống thư hỏng" lúc này là nói sai — mà họ thì đi báo nhầm chỗ.
    expect(await guiEmailVaDocLoi(LOI_MANG)).toMatch(/không kết nối được máy chủ/i);
  }, 20_000);

  it("hộp thư hỏng thì hiện NGUYÊN câu backend gửi về", async () => {
    // Backend đã phân loại và soạn câu an toàn; FE vẽ lại là dựng nguồn sự thật thứ hai.
    expect(await guiEmailVaDocLoi(LOI_HOP_THU)).toMatch(/chạm giới hạn gửi trong ngày/i);
  }, 20_000);

  it("gửi quá nhiều lần thì nói rõ là quá nhiều lần", async () => {
    expect(await guiEmailVaDocLoi(LOI_QUA_NHIEU_LAN)).toMatch(/thử lại sau 5 phút/i);
  }, 20_000);

  it("ba tình huống cho ba câu KHÁC NHAU — đây mới là điểm của lần sửa này", async () => {
    const cauMang = await guiEmailVaDocLoi(LOI_MANG);
    cleanup();
    const cauHopThu = await guiEmailVaDocLoi(LOI_HOP_THU);
    cleanup();
    const cauQuaNhieu = await guiEmailVaDocLoi(LOI_QUA_NHIEU_LAN);

    expect(new Set([cauMang, cauHopThu, cauQuaNhieu]).size).toBe(3);
  }, 30_000);

  it("luôn log lỗi thô ra console — màn hình nói ngắn, devtools phải nói đủ", async () => {
    await guiEmailVaDocLoi(LOI_HOP_THU);
    // Nuốt trọn lỗi là tự bịt mắt mình cho lần sửa sau.
    expect(console.error).toHaveBeenCalledWith(expect.any(String), LOI_HOP_THU);
  }, 20_000);
});
