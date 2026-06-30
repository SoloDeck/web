import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeFormConfig } from "./IntakeFormConfig";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import {
  getIntakeFormConfig,
  updateIntakeFormConfig,
  type IntakeFormConfigPayload,
  type IntakeFormConfigResponse,
} from "@/services/intakeService";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/intakeService", () => ({
  getIntakeFormConfig: vi.fn(),
  updateIntakeFormConfig: vi.fn(),
}));

const SHARE_URL = "https://solodesk.vn/bieu-mau/token-demo";

function makeIntakeConfig(
  overrides: Partial<IntakeFormConfigResponse> = {},
): IntakeFormConfigResponse {
  return {
    id: "intake-form-1",
    title: "Gửi yêu cầu dự án",
    description:
      "Hãy chia sẻ một vài thông tin để tôi hiểu rõ nhu cầu và chuẩn bị tư vấn phù hợp cho bạn.",
    is_active: true,
    share_url: SHARE_URL,
    fields: [
      {
        id: "field-name",
        field_key: "name",
        label: "Họ tên khách hàng",
        placeholder: "Nguyễn Văn A",
        field_type: "text",
        is_required: true,
        is_visible: true,
        sort_order: 1,
      },
      {
        id: "field-phone",
        field_key: "phone",
        label: "Số điện thoại",
        placeholder: "09xx xxx xxx",
        field_type: "phone",
        is_required: true,
        is_visible: true,
        sort_order: 2,
      },
      {
        id: "field-email",
        field_key: "email",
        label: "Email",
        placeholder: "email@vidu.vn",
        field_type: "email",
        is_required: false,
        is_visible: true,
        sort_order: 3,
      },
      {
        id: "field-project",
        field_key: "project_name",
        label: "Tên dự án",
        placeholder: "Ví dụ: Thiết kế trang bán hàng",
        field_type: "text",
        is_required: true,
        is_visible: true,
        sort_order: 4,
      },
      {
        id: "field-inquiry",
        field_key: "inquiry_text",
        label: "Mô tả nhu cầu",
        placeholder: "Mô tả mục tiêu và yêu cầu chính của dự án...",
        field_type: "textarea",
        is_required: true,
        is_visible: true,
        sort_order: 5,
      },
      {
        id: "field-budget",
        field_key: "estimated_budget",
        label: "Ngân sách dự kiến",
        placeholder: "Ví dụ: 5.000.000 - 10.000.000 VNĐ",
        field_type: "text",
        is_required: false,
        is_visible: true,
        sort_order: 6,
      },
      {
        id: "field-timeline",
        field_key: "desired_timeline",
        label: "Thời gian mong muốn",
        placeholder: "Ví dụ: Trong 2 tuần",
        field_type: "text",
        is_required: false,
        is_visible: true,
        sort_order: 7,
      },
    ],
    ...overrides,
  };
}

function configFromPayload(payload: IntakeFormConfigPayload): IntakeFormConfigResponse {
  return makeIntakeConfig({
    title: payload.title,
    description: payload.description ?? null,
    is_active: payload.is_active,
    fields: payload.fields.map((field, index) => ({
      id: `saved-field-${index + 1}`,
      field_key: field.field_key,
      label: field.label,
      placeholder: field.placeholder ?? null,
      field_type: field.field_type,
      is_required: field.is_required,
      is_visible: field.is_visible,
      sort_order: field.sort_order,
    })),
  });
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
      <IntakeFormConfig />
    </QueryClientProvider>,
  );
}

async function renderReady() {
  const view = renderWithClient();
  await screen.findByDisplayValue("Gửi yêu cầu dự án");
  return view;
}

async function replaceText(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, value: string) {
  await user.click(element);
  await user.keyboard("{Control>}a{/Control}");
  await user.keyboard(value);
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  useAuthStore.setState({
    user: { id: "u1", fullName: "Nguyễn Văn Test", email: "test@solodesk.vn" },
    isAuthenticated: true,
  });

  vi.mocked(getIntakeFormConfig).mockResolvedValue(makeIntakeConfig());
  vi.mocked(updateIntakeFormConfig).mockImplementation(async (payload) =>
    configFromPayload(payload),
  );

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
  it("hiển thị đầy đủ các khu vực cấu hình chính", async () => {
    await renderReady();

    expect(screen.getByText("Thông tin biểu mẫu")).toBeInTheDocument();
    expect(screen.getByText("Cấu hình trường thông tin")).toBeInTheDocument();
    expect(screen.getByText("Xem trước biểu mẫu")).toBeInTheDocument();
    expect(screen.getByText("Chia sẻ biểu mẫu")).toBeInTheDocument();
  });

  it("hiển thị 7 trường từ API và dùng tên tài khoản trong bản xem trước", async () => {
    await renderReady();

    expect(screen.getAllByRole("switch", { name: /^Hiển thị:/ })).toHaveLength(7);
    expect(screen.queryByLabelText("Tên hiển thị của Freelancer")).not.toBeInTheDocument();
    expect(screen.getByText("Biểu mẫu của Nguyễn Văn Test")).toBeInTheDocument();
    expect(screen.getByText("7/7 đang hiển thị")).toBeInTheDocument();
    expect(screen.queryByText("Zalo")).not.toBeInTheDocument();
  });

  it("cập nhật nội dung bản xem trước theo thời gian thực", async () => {
    const user = userEvent.setup();
    await renderReady();

    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");
    await replaceText(user, titleInput, "Tư vấn nhận diện thương hiệu");

    expect(screen.getByRole("heading", { name: "Tư vấn nhận diện thương hiệu" })).toBeInTheDocument();
  });

  it("cho phép chỉnh sửa nhãn trường", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Chỉnh sửa nhãn Họ tên khách hàng" }));
    const labelInput = screen.getByRole("textbox", { name: "Chỉnh sửa nhãn trường" });
    await user.clear(labelInput);
    await user.type(labelInput, "Tên người liên hệ{Enter}");

    expect(screen.getAllByText("Tên người liên hệ")).toHaveLength(2);
  });

  it("cho phép thêm trường tùy chỉnh vào cấu hình và bản xem trước", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Thêm trường" }));
    await user.type(screen.getByLabelText("Nhãn trường"), "Nguồn giới thiệu");
    await user.type(screen.getByLabelText("Nội dung gợi ý"), "Bạn biết đến tôi qua đâu?");
    await user.click(screen.getByRole("button", { name: "Thêm vào biểu mẫu" }));

    expect(screen.getByText("8/8 đang hiển thị")).toBeInTheDocument();
    expect(screen.getAllByText("Nguồn giới thiệu")).toHaveLength(2);
    expect(screen.getByText("Bạn biết đến tôi qua đâu?")).toBeInTheDocument();
  });

  it("cho phép xóa một trường sau khi xác nhận", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Xóa trường Email" }));
    expect(screen.getByRole("heading", { name: "Xóa trường thông tin?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Xóa trường$/ }));

    expect(screen.queryByTestId("field-row-email")).not.toBeInTheDocument();
    expect(screen.getByText("6/6 đang hiển thị")).toBeInTheDocument();
  });

  it("cho phép đổi trạng thái bắt buộc và hiển thị", async () => {
    const user = userEvent.setup();
    await renderReady();
    const firstRow = screen.getByTestId("field-row-name");

    await user.click(within(firstRow).getByRole("switch", { name: "Bắt buộc: Bật" }));
    expect(within(firstRow).getByRole("switch", { name: "Bắt buộc: Tắt" })).toBeInTheDocument();

    await user.click(within(firstRow).getByRole("switch", { name: "Hiển thị: Bật" }));
    expect(screen.getByText("6/7 đang hiển thị")).toBeInTheDocument();
    expect(within(firstRow).getByText("Trường này đang được ẩn")).toBeInTheDocument();
  });

  it("hiển thị trạng thái trống khi ẩn tất cả các trường", async () => {
    const user = userEvent.setup();
    await renderReady();

    for (const toggle of screen.getAllByRole("switch", { name: "Hiển thị: Bật" })) {
      await user.click(toggle);
    }

    expect(screen.getByText("Chưa có trường nào hiển thị")).toBeInTheDocument();
    expect(screen.getByText("0/7 đang hiển thị")).toBeInTheDocument();
  });

  it("sao chép đường dẫn chia sẻ theo domain hiện tại", async () => {
    await renderReady();

    const copyButton = screen.getByRole("button", { name: "Sao chép link" });
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/bieu-mau/token-demo`);
    });
    expect(screen.getByDisplayValue(`${window.location.origin}/bieu-mau/token-demo`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã sao chép" })).toBeInTheDocument();
  });

  it("lưu cấu hình biểu mẫu bằng PUT /intake-form", async () => {
    const user = userEvent.setup();
    await renderReady();

    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");
    await replaceText(user, titleInput, "Form brief dự án");
    await user.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => {
      expect(updateIntakeFormConfig).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeDisabled();
    });
    const payload = vi.mocked(updateIntakeFormConfig).mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        title: "Form brief dự án",
        description: expect.any(String),
        is_active: true,
        fields: expect.any(Array),
      }),
    );
    expect(payload.fields[0]).toMatchObject({
      field_key: "name",
      field_type: "text",
      sort_order: 1,
    });
    expect(payload.fields[1]).toMatchObject({
      field_key: "phone",
      field_type: "phone",
      sort_order: 2,
    });
  });

  it("chỉ bật nút lưu khi cấu hình khác bản đã lưu", async () => {
    const user = userEvent.setup();
    await renderReady();

    const saveButton = screen.getByRole("button", { name: "Lưu cấu hình" });
    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");

    expect(saveButton).toBeDisabled();

    await replaceText(user, titleInput, "Tiêu đề mới");
    expect(saveButton).toBeEnabled();

    await replaceText(user, titleInput, "Gửi yêu cầu dự án");
    expect(saveButton).toBeDisabled();
  });
});
