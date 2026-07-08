import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { IntakeForm } from "./IntakeForm";
import {
  getPublicIntakeFormConfig,
  submitIntake,
  type PublicIntakeFormConfigResponse,
} from "@/services/intakeService";

vi.mock("@/services/intakeService", () => ({
  getPublicIntakeFormConfig: vi.fn(),
  submitIntake: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makePublicConfig(
  overrides: Partial<PublicIntakeFormConfigResponse> = {},
): PublicIntakeFormConfigResponse {
  return {
    title: "Form brief dự án",
    description: "Mô tả ngắn để khách hàng điền thông tin.",
    freelancer_name: "Nguyễn Văn Freelancer",
    fields: [
      {
        field_key: "name",
        label: "Họ tên khách hàng",
        placeholder: "Nguyễn Văn A",
        field_type: "text",
        is_required: true,
      },
      {
        field_key: "phone",
        label: "Số điện thoại",
        placeholder: "09xx xxx xxx",
        field_type: "phone",
        is_required: true,
      },
      {
        field_key: "email",
        label: "Email",
        placeholder: "email@vidu.vn",
        field_type: "email",
        is_required: false,
      },
      {
        field_key: "project_name",
        label: "Tên dự án",
        placeholder: "Website bán hàng",
        field_type: "text",
        is_required: true,
      },
      {
        field_key: "inquiry_text",
        label: "Mô tả nhu cầu",
        placeholder: "Mô tả mục tiêu dự án",
        field_type: "textarea",
        is_required: true,
      },
      {
        field_key: "estimated_budget",
        label: "Ngân sách dự kiến",
        placeholder: "10.000.000 VNĐ",
        field_type: "text",
        is_required: false,
      },
      {
        field_key: "desired_timeline",
        label: "Thời gian mong muốn",
        placeholder: "Trong 3 tuần",
        field_type: "text",
        is_required: false,
      },
    ],
    ...overrides,
  };
}

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <IntakeForm shareToken="tok123" />
    </QueryClientProvider>,
  );
}

async function renderReady() {
  const view = renderWithClient();
  await screen.findByText("Form brief dự án");
  return view;
}

beforeEach(() => {
  vi.mocked(getPublicIntakeFormConfig).mockResolvedValue(makePublicConfig());
  vi.mocked(submitIntake).mockResolvedValue({
    id: "i1",
    submitted_at: "2026-06-15",
    message: "ok",
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<IntakeForm />", () => {
  it("render biểu mẫu public từ cấu hình backend", async () => {
    await renderReady();

    expect(getPublicIntakeFormConfig).toHaveBeenCalledWith("tok123");
    // Thẻ hồ sơ hiển thị tên freelancer chủ biểu mẫu.
    expect(screen.getByText("Nguyễn Văn Freelancer")).toBeInTheDocument();
    expect(screen.getByLabelText("Họ tên khách hàng")).toBeInTheDocument();
    expect(screen.getByLabelText("Mô tả nhu cầu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Zalo")).not.toBeInTheDocument();
  });

  it("submit đúng body public intake và hiện màn thành công", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.type(screen.getByLabelText("Họ tên khách hàng"), "Nguyễn Văn A");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Tên dự án"), "Website bán hàng");
    await user.type(screen.getByLabelText("Mô tả nhu cầu"), "Cần làm website");
    await user.type(screen.getByLabelText("Ngân sách dự kiến"), "10.000.000 VNĐ");
    await user.type(screen.getByLabelText("Thời gian mong muốn"), "Trong 3 tuần");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(submitIntake).toHaveBeenCalledTimes(1));
    expect(submitIntake).toHaveBeenCalledWith("tok123", {
      name: "Nguyễn Văn A",
      phone: "0901234567",
      email: "a@example.com",
      project_name: "Website bán hàng",
      inquiry_text: "Cần làm website",
      estimated_budget: "10.000.000 VNĐ",
      desired_timeline: "Trong 3 tuần",
    });
    expect(await screen.findByText("Đã nhận yêu cầu của bạn")).toBeInTheDocument();
  });

  it("gom field tùy chỉnh vào mô tả để backend không mất thông tin", async () => {
    vi.mocked(getPublicIntakeFormConfig).mockResolvedValue(
      makePublicConfig({
        fields: [
          {
            field_key: "name",
            label: "Họ tên khách hàng",
            placeholder: "Nguyễn Văn A",
            field_type: "text",
            is_required: true,
          },
          {
            field_key: "inquiry_text",
            label: "Mô tả nhu cầu",
            placeholder: "Mô tả mục tiêu dự án",
            field_type: "textarea",
            is_required: true,
          },
          {
            field_key: "preferred_contact",
            label: "Kênh liên hệ ưu tiên",
            placeholder: "Ví dụ: Zalo buổi tối",
            field_type: "text",
            is_required: false,
          },
        ],
      }),
    );
    const user = userEvent.setup();
    await renderReady();

    await user.type(screen.getByLabelText("Họ tên khách hàng"), "Lê Văn B");
    await user.type(screen.getByLabelText("Mô tả nhu cầu"), "Cần website");
    await user.type(screen.getByLabelText("Kênh liên hệ ưu tiên"), "Zalo buổi tối");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(submitIntake).toHaveBeenCalledTimes(1));
    expect(submitIntake).toHaveBeenCalledWith("tok123", {
      name: "Lê Văn B",
      inquiry_text: "Cần website\nKênh liên hệ ưu tiên: Zalo buổi tối",
    });
  });

  it("hiện toast lỗi và giữ form khi submit thất bại", async () => {
    vi.mocked(submitIntake).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    await renderReady();

    await user.type(screen.getByLabelText("Họ tên khách hàng"), "Lê Văn B");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.type(screen.getByLabelText("Tên dự án"), "Ứng dụng nội bộ");
    await user.type(screen.getByLabelText("Mô tả nhu cầu"), "Tư vấn dự án");
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText("Form brief dự án")).toBeInTheDocument();
  });

  it("không submit khi còn thiếu field bắt buộc", async () => {
    const user = userEvent.setup();
    await renderReady();

    expect(screen.getByRole("button", { name: /Gửi yêu cầu/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));

    expect(submitIntake).not.toHaveBeenCalled();
  });

  it("hiện trạng thái lỗi khi link public không hợp lệ", async () => {
    vi.mocked(getPublicIntakeFormConfig).mockRejectedValue(new Error("not found"));
    renderWithClient();

    expect(await screen.findByText("Không mở được biểu mẫu")).toBeInTheDocument();
    expect(submitIntake).not.toHaveBeenCalled();
  });
});
