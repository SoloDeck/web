import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeFormConfig } from "./IntakeFormConfig";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  useAuthStore.setState({
    user: { id: "u1", fullName: "Nguyễn Văn Test", email: "test@solodesk.vn" },
    isAuthenticated: true,
  });
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("<IntakeFormConfig />", () => {
  it("hiển thị đầy đủ các khu vực cấu hình chính", () => {
    render(<IntakeFormConfig />);

    expect(screen.getByText("Thông tin biểu mẫu")).toBeInTheDocument();
    expect(screen.getByText("Cấu hình trường thông tin")).toBeInTheDocument();
    expect(screen.getByText("Xem trước biểu mẫu")).toBeInTheDocument();
    expect(screen.getByText("Chia sẻ biểu mẫu")).toBeInTheDocument();
  });

  it("hiển thị 9 trường mặc định và dùng tên tài khoản trong bản xem trước", () => {
    render(<IntakeFormConfig />);

    expect(screen.getAllByRole("switch", { name: /^Hiển thị:/ })).toHaveLength(9);
    expect(screen.queryByLabelText("Tên hiển thị của Freelancer")).not.toBeInTheDocument();
    expect(screen.getByText("Biểu mẫu của Nguyễn Văn Test")).toBeInTheDocument();
    expect(screen.getByText("9/9 đang hiển thị")).toBeInTheDocument();
    expect(screen.queryByText("Zalo")).not.toBeInTheDocument();
  });

  it("cập nhật nội dung bản xem trước theo thời gian thực", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);

    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");
    await user.clear(titleInput);
    await user.type(titleInput, "Tư vấn nhận diện thương hiệu");

    expect(screen.getByRole("heading", { name: "Tư vấn nhận diện thương hiệu" })).toBeInTheDocument();
  });

  it("cho phép chỉnh sửa nhãn trường", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);

    await user.click(screen.getByRole("button", { name: "Chỉnh sửa nhãn Họ tên khách hàng" }));
    const labelInput = screen.getByRole("textbox", { name: "Chỉnh sửa nhãn trường" });
    await user.clear(labelInput);
    await user.type(labelInput, "Tên người liên hệ{Enter}");

    expect(screen.getAllByText("Tên người liên hệ")).toHaveLength(2);
  });

  it("cho phép thêm trường tùy chỉnh vào cấu hình và bản xem trước", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);

    await user.click(screen.getByRole("button", { name: "Thêm trường" }));
    await user.type(screen.getByLabelText("Nhãn trường"), "Nguồn giới thiệu");
    await user.type(screen.getByLabelText("Nội dung gợi ý"), "Bạn biết đến tôi qua đâu?");
    await user.click(screen.getByRole("button", { name: "Thêm vào biểu mẫu" }));

    expect(screen.getByText("10/10 đang hiển thị")).toBeInTheDocument();
    expect(screen.getAllByText("Nguồn giới thiệu")).toHaveLength(2);
    expect(screen.getByText("Bạn biết đến tôi qua đâu?")).toBeInTheDocument();
  });

  it("cho phép xóa một trường sau khi xác nhận", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);

    await user.click(screen.getByRole("button", { name: "Xóa trường Email" }));
    expect(screen.getByRole("heading", { name: "Xóa trường thông tin?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Xóa trường$/ }));

    expect(screen.queryByTestId("field-row-email")).not.toBeInTheDocument();
    expect(screen.getByText("8/8 đang hiển thị")).toBeInTheDocument();
  });

  it("cho phép đổi trạng thái bắt buộc và hiển thị", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);
    const firstRow = screen.getByTestId("field-row-fullName");

    await user.click(within(firstRow).getByRole("switch", { name: "Bắt buộc: Bật" }));
    expect(within(firstRow).getByRole("switch", { name: "Bắt buộc: Tắt" })).toBeInTheDocument();

    await user.click(within(firstRow).getByRole("switch", { name: "Hiển thị: Bật" }));
    expect(screen.getByText("8/9 đang hiển thị")).toBeInTheDocument();
    expect(within(firstRow).getByText("Trường này đang được ẩn")).toBeInTheDocument();
  });

  it("hiển thị trạng thái trống khi ẩn tất cả các trường", async () => {
    const user = userEvent.setup();
    render(<IntakeFormConfig />);

    for (const toggle of screen.getAllByRole("switch", { name: "Hiển thị: Bật" })) {
      await user.click(toggle);
    }

    expect(screen.getByText("Chưa có trường nào hiển thị")).toBeInTheDocument();
    expect(screen.getByText("0/9 đang hiển thị")).toBeInTheDocument();
  });

  it("sao chép đường dẫn mẫu", async () => {
    render(<IntakeFormConfig />);

    fireEvent.click(screen.getByRole("button", { name: "Sao chép link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://solodesk.vn/bieu-mau/yeu-cau-du-an");
    });
    expect(screen.getByRole("button", { name: "Đã sao chép" })).toBeInTheDocument();
  });
});
