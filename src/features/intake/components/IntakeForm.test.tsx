import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { IntakeForm } from "./IntakeForm";
import { submitIntake } from "@/services/intakeService";

vi.mock("@/services/intakeService", () => ({ submitIntake: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.mocked(submitIntake).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<IntakeForm />", () => {
  it("renders the public form without any auth/router context", () => {
    render(<IntakeForm shareToken="tok123" />);
    expect(screen.getByText("Gửi yêu cầu dự án")).toBeInTheDocument();
    expect(screen.getByLabelText("Họ tên khách hàng")).toBeInTheDocument();
    expect(screen.getByLabelText("Mô tả nhu cầu")).toBeInTheDocument();
    expect(screen.getByLabelText("Loại dịch vụ")).toBeInTheDocument();
    expect(screen.queryByLabelText("Zalo")).not.toBeInTheDocument();
  });

  it("submits the correct body and shows the success state", async () => {
    vi.mocked(submitIntake).mockResolvedValue({ id: "i1", submitted_at: "2026-06-15", message: "ok" });
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.type(screen.getByLabelText("Họ tên khách hàng"), "Nguyễn Văn A");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Tên dự án"), "Website bán hàng");
    await user.selectOptions(screen.getByLabelText("Loại dịch vụ"), "Thiết kế website");
    await user.type(screen.getByLabelText("Mô tả nhu cầu"), "Cần làm website");
    await user.type(screen.getByLabelText("Ghi chú thêm"), "Ưu tiên giao diện tối giản");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(submitIntake).toHaveBeenCalledTimes(1));
    expect(submitIntake).toHaveBeenCalledWith("tok123", {
      name: "Nguyễn Văn A",
      phone: "0901234567",
      email: "a@example.com",
      inquiry_text: [
        "Tên dự án: Website bán hàng",
        "Loại dịch vụ: Thiết kế website",
        "Mô tả nhu cầu: Cần làm website",
        "Ghi chú thêm: Ưu tiên giao diện tối giản",
      ].join("\n"),
    });
    await waitFor(() => expect(screen.getByText("Đã nhận yêu cầu của bạn")).toBeInTheDocument());
  });

  it("shows an error toast and does not crash when the submit fails", async () => {
    vi.mocked(submitIntake).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.type(screen.getByLabelText("Họ tên khách hàng"), "Lê Văn B");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.type(screen.getByLabelText("Tên dự án"), "Ứng dụng nội bộ");
    await user.type(screen.getByLabelText("Mô tả nhu cầu"), "Tư vấn dự án");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Form is still mounted (no crash, no success screen).
    expect(screen.getByText("Gửi yêu cầu dự án")).toBeInTheDocument();
  });

  it("does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    expect(submitIntake).not.toHaveBeenCalled();
  });
});
