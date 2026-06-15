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
    expect(screen.getByText("Gửi yêu cầu tư vấn")).toBeInTheDocument();
    expect(screen.getByLabelText("Họ và tên")).toBeInTheDocument();
    expect(screen.getByLabelText("Nội dung yêu cầu")).toBeInTheDocument();
  });

  it("submits the correct body and shows the success state", async () => {
    vi.mocked(submitIntake).mockResolvedValue({ id: "i1", submitted_at: "2026-06-15", message: "ok" });
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Văn A");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Nội dung yêu cầu"), "Cần làm website");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(submitIntake).toHaveBeenCalledTimes(1));
    expect(submitIntake).toHaveBeenCalledWith("tok123", {
      name: "Nguyễn Văn A",
      email: "a@example.com",
      inquiry_text: "Cần làm website",
    });
    await waitFor(() => expect(screen.getByText("Đã nhận yêu cầu của bạn")).toBeInTheDocument());
  });

  it("shows an error toast and does not crash when the submit fails", async () => {
    vi.mocked(submitIntake).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.type(screen.getByLabelText("Họ và tên"), "Lê Văn B");
    await user.type(screen.getByLabelText("Nội dung yêu cầu"), "Tư vấn dự án");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Form is still mounted (no crash, no success screen).
    expect(screen.getByText("Gửi yêu cầu tư vấn")).toBeInTheDocument();
  });

  it("does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<IntakeForm shareToken="tok123" />);

    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    expect(submitIntake).not.toHaveBeenCalled();
  });
});
