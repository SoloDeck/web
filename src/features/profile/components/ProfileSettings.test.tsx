import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileSettings } from "./ProfileSettings";
import { DEFAULT_PROFILE, type Profile } from "@/features/profile/types";

// Các tab khác gọi API/router riêng, không liên quan tới mật khẩu — thay bằng khối rỗng để
// bài test chỉ nói về tab Bảo mật.
vi.mock("@/features/intake/components/IntakeLinkCard", () => ({ IntakeLinkCard: () => null }));
vi.mock("@/features/profile/components/AvatarUpload", () => ({ AvatarUpload: () => null }));
vi.mock("@/features/reminders/components/ReminderRulesSettings", () => ({
  ReminderRulesSettings: () => null,
}));
vi.mock("@/features/profile/components/ZaloConnectionSettings", () => ({
  ZaloConnectionSettings: () => null,
}));

const mockChangePassword = vi.fn();
vi.mock("@/services/usersService", () => ({
  changePassword: (...a: unknown[]) => mockChangePassword(...a),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

async function moToBaoMat(hasPassword: boolean) {
  const user = userEvent.setup();
  const profile: Profile = { ...DEFAULT_PROFILE, hasPassword };
  render(<ProfileSettings profile={profile} onSave={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: /bảo mật/i }));
  return user;
}

/** Cả ba ô đều dùng chung placeholder "••••••••", nên lấy theo thứ tự hiển thị. */
const oNhapMatKhau = () => screen.getAllByPlaceholderText("••••••••");

describe("<ProfileSettings /> — tab Bảo mật", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangePassword.mockResolvedValue(undefined);
  });

  it("tài khoản CHƯA có mật khẩu: hiện 'Thêm mật khẩu', bỏ ô mật khẩu hiện tại", async () => {
    const user = await moToBaoMat(false);

    // Tiêu đề + nút cùng đổi chữ, nên "Thêm mật khẩu" xuất hiện hai lần — kiểm cả hai.
    expect(screen.getAllByText("Thêm mật khẩu")).toHaveLength(2);
    expect(screen.getByText(/đang đăng nhập bằng google nên chưa có mật khẩu/i)).toBeInTheDocument();
    // Đây là cả điểm mấu chốt: người đăng nhập bằng Google không có mật khẩu cũ để nhập,
    // còn ô này thì gõ gì vào cũng sai — để lại là họ kẹt vĩnh viễn.
    expect(screen.queryByText("Mật khẩu hiện tại")).not.toBeInTheDocument();
    expect(oNhapMatKhau()).toHaveLength(2);

    const [moi, xacNhan] = oNhapMatKhau();
    await user.type(moi, "MatKhauMoi2026");
    await user.type(xacNhan, "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /^thêm mật khẩu$/i }));

    // KHÔNG gửi current_password — backend phân nhánh theo tài khoản, gửi thừa là vô nghĩa.
    expect(mockChangePassword).toHaveBeenCalledWith({ new_password: "MatKhauMoi2026" });
  }, 20_000);

  it("đặt xong thì form đổi NGAY sang dạng 'Đổi mật khẩu' ba ô", async () => {
    const user = await moToBaoMat(false);

    const [moi, xacNhan] = oNhapMatKhau();
    await user.type(moi, "MatKhauMoi2026");
    await user.type(xacNhan, "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /^thêm mật khẩu$/i }));

    // `profile.hasPassword` chỉ tải lúc mount nên vẫn còn `false`; không có cờ tại chỗ thì
    // lần đổi thứ hai sẽ bị 401 mà người dùng không hiểu vì sao.
    expect(await screen.findByText("Mật khẩu hiện tại")).toBeInTheDocument();
    expect(oNhapMatKhau()).toHaveLength(3);
  }, 20_000);

  it("tài khoản ĐÃ có mật khẩu: vẫn đủ ba ô và vẫn gửi mật khẩu hiện tại", async () => {
    const user = await moToBaoMat(true);

    expect(screen.getAllByText("Đổi mật khẩu")).toHaveLength(2);
    expect(screen.queryByText("Thêm mật khẩu")).not.toBeInTheDocument();
    expect(screen.getByText("Mật khẩu hiện tại")).toBeInTheDocument();
    expect(oNhapMatKhau()).toHaveLength(3);

    const [hienTai, moi, xacNhan] = oNhapMatKhau();
    await user.type(hienTai, "MatKhauCu2026");
    await user.type(moi, "MatKhauMoi2026");
    await user.type(xacNhan, "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /^đổi mật khẩu$/i }));

    expect(mockChangePassword).toHaveBeenCalledWith({
      current_password: "MatKhauCu2026",
      new_password: "MatKhauMoi2026",
    });
  }, 20_000);

  it("đã có mật khẩu mà bỏ trống ô hiện tại thì nút vẫn khoá", async () => {
    const user = await moToBaoMat(true);

    const [, moi, xacNhan] = oNhapMatKhau();
    await user.type(moi, "MatKhauMoi2026");
    await user.type(xacNhan, "MatKhauMoi2026");

    expect(screen.getByRole("button", { name: /^đổi mật khẩu$/i })).toBeDisabled();
  }, 20_000);

  it("401 báo đúng là sai mật khẩu, lỗi mạng báo đúng là mất kết nối", async () => {
    mockChangePassword.mockRejectedValueOnce({ response: { status: 401 } });
    const user = await moToBaoMat(true);

    const [hienTai, moi, xacNhan] = oNhapMatKhau();
    await user.type(hienTai, "sai-roi");
    await user.type(moi, "MatKhauMoi2026");
    await user.type(xacNhan, "MatKhauMoi2026");
    await user.click(screen.getByRole("button", { name: /^đổi mật khẩu$/i }));

    expect(mockToast.error).toHaveBeenCalledWith("Mật khẩu hiện tại không đúng.");

    // Bản cũ gộp mọi nguyên nhân vào một câu, mất mạng cũng bị đổ cho sai mật khẩu.
    mockChangePassword.mockRejectedValueOnce(new Error("Network Error"));
    await user.click(screen.getByRole("button", { name: /^đổi mật khẩu$/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
    );
  }, 20_000);
});
