import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  getPublicIntakeFormConfig: vi.fn(),
  submitIntake: vi.fn(),
  uploadIntakeAttachment: vi.fn(),
}));

vi.mock("@/services/usersService", () => ({
  getMe: (...a: unknown[]) => mockGetMe(...a),
  updateFreelancerProfile: (...a: unknown[]) => mockUpdateFreelancerProfile(...a),
  usersKeys: { me: ["users", "me"] as const },
}));

const SHARE_URL = "https://solodesk.vn/bieu-mau/token-demo";

const mockGetMe = vi.fn();
const mockUpdateFreelancerProfile = vi.fn();

/** Chỉ những trường màn "Trang công khai" thật sự đọc từ GET /users/me. */
function makeMe(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    full_name: "Nguyễn Văn Test",
    email: "test@solodesk.vn",
    professional_title: null,
    bio: null,
    avatar_url: null,
    cover_url: null,
    brand_color: null,
    profile_slug: null,
    intake_share_token: "token-demo",
    professional_profile: { skills: [], portfolio_url: null },
    ...overrides,
  };
}

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

/** Cột chỉnh sửa chia hai trang; màn mở ở trang 1 (Diện mạo). */
async function renderAppearance() {
  const view = renderWithClient();
  await screen.findByLabelText("Tên đường dẫn");
  return view;
}

/** Phần lớn bài test nói về trang 2 (nội dung biểu mẫu) nên chuyển sang luôn. */
async function renderReady() {
  const view = renderWithClient();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Biểu mẫu tiếp nhận/ }));
  await screen.findByDisplayValue("Gửi yêu cầu dự án");
  return view;
}

async function moTrang(user: ReturnType<typeof userEvent.setup>, ten: RegExp) {
  await user.click(screen.getByRole("button", { name: ten }));
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

  mockGetMe.mockResolvedValue(makeMe());
  mockUpdateFreelancerProfile.mockResolvedValue(makeMe());
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
  it("chia hai trang: Diện mạo và Biểu mẫu, khỏi phải kéo xuống", async () => {
    const user = userEvent.setup();
    await renderAppearance();

    // Trang 1
    expect(screen.getByText("Ảnh bìa")).toBeInTheDocument();
    expect(screen.getByText("Màu chủ đạo")).toBeInTheDocument();
    expect(screen.queryByText("Cấu hình trường thông tin")).not.toBeInTheDocument();

    // Trang 2
    await moTrang(user, /Biểu mẫu tiếp nhận/);
    expect(screen.getByLabelText("Tiêu đề biểu mẫu")).toBeInTheDocument();
    expect(screen.getByText("Cấu hình trường thông tin")).toBeInTheDocument();
    expect(screen.queryByText("Ảnh bìa")).not.toBeInTheDocument();

    // Khung xem trước, link và ô tên đường dẫn đứng NGOÀI phân trang — luôn nhìn thấy.
    expect(screen.getByText("Xem trước trang công khai")).toBeInTheDocument();
    expect(screen.getByText("Link công khai của bạn")).toBeInTheDocument();
    expect(screen.getByLabelText("Tên đường dẫn")).toBeInTheDocument();
  });

  it("hiển thị 7 trường từ API, riêng Họ tên không có công tắc ẩn", async () => {
    await renderReady();

    expect(screen.getByText("7/7 đang hiển thị")).toBeInTheDocument();
    // 6, không phải 7: Họ tên bắt buộc ở schema backend và `IntakeForm` tự chèn lại nếu
    // thiếu — bày một công tắc rồi vẫn hiện là giao diện nói dối.
    expect(screen.getAllByRole("switch", { name: /^Hiển thị:/ })).toHaveLength(6);
    const hangHoTen = screen.getByTestId("field-row-name");
    expect(within(hangHoTen).getByText("Luôn hiển thị")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tên hiển thị của Freelancer")).not.toBeInTheDocument();
    // Dòng "Biểu mẫu của X" từng được khoá ở đây — nó là câu chữ của bản xem trước VẼ TAY,
    // không hề tồn tại trên trang thật. Bản xem trước nay dùng chính component trang thật.
    expect(screen.queryByText("Biểu mẫu của Nguyễn Văn Test")).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Thêm vào biểu mẫu" }));

    expect(screen.getByText("8/8 đang hiển thị")).toBeInTheDocument();
    expect(screen.getAllByText("Nguồn giới thiệu")).toHaveLength(2);
    // Không còn ô "Nội dung gợi ý": mỗi loại câu trả lời đã có sẵn câu mặc định, và backend
    // để `placeholder` nullable nên bỏ hẳn được.
    expect(screen.queryByLabelText("Nội dung gợi ý")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nhập câu trả lời ngắn")).toBeInTheDocument();
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
    const hangTenDuAn = screen.getByTestId("field-row-project_name");

    await user.click(within(hangTenDuAn).getByRole("switch", { name: "Bắt buộc: Bật" }));
    expect(within(hangTenDuAn).getByRole("switch", { name: "Bắt buộc: Tắt" })).toBeInTheDocument();

    await user.click(within(hangTenDuAn).getByRole("switch", { name: "Hiển thị: Bật" }));
    expect(screen.getByText("6/7 đang hiển thị")).toBeInTheDocument();
    expect(within(hangTenDuAn).getByRole("switch", { name: "Hiển thị: Tắt" })).toBeInTheDocument();
  });

  it("không cho ẩn nốt cách liên hệ cuối cùng", async () => {
    // Ẩn cả email lẫn SĐT thì lead về mà không hồi âm lại được — đúng thứ CRM sinh ra để tránh.
    const user = userEvent.setup();
    await renderReady();

    const hangEmail = screen.getByTestId("field-row-email");
    await user.click(within(hangEmail).getByRole("switch", { name: "Hiển thị: Bật" }));

    const hangSdt = screen.getByTestId("field-row-phone");
    expect(within(hangSdt).queryByRole("switch", { name: /^Hiển thị:/ })).not.toBeInTheDocument();
    expect(within(hangSdt).getByText(/ít nhất một cách liên hệ/i)).toBeInTheDocument();
  });

  it("ẩn hết mức có thể vẫn còn Họ tên và một cách liên hệ", async () => {
    const user = userEvent.setup();
    await renderReady();

    for (const toggle of screen.getAllByRole("switch", { name: "Hiển thị: Bật" })) {
      await user.click(toggle);
    }

    // 7 trường, ẩn được 5: Họ tên khoá cứng, và một trong hai email/SĐT phải ở lại.
    expect(screen.getByText("2/7 đang hiển thị")).toBeInTheDocument();
    expect(screen.queryByText("Chưa có trường nào hiển thị")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Họ tên khách hàng/).length).toBeGreaterThan(0);
  });

  it("tên đường dẫn sửa ngay trong thẻ link, và chỉ có MỘT link", async () => {
    // Ô sửa nằm luôn trong thẻ link: cái người dùng gõ chính là cái họ đọc ra trong link,
    // tách thành mục "Địa chỉ riêng" riêng là bắt họ nhìn cùng một chuỗi ở hai chỗ.
    mockGetMe.mockResolvedValue(makeMe({ profile_slug: "thu-thuy" }));
    await renderAppearance();

    await waitFor(() => {
      expect(screen.getByLabelText("Tên đường dẫn")).toHaveValue("thu-thuy");
    });
    expect(screen.getByText(`${window.location.origin}/thu-thuy`)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sao chép link/ })).toHaveLength(1);
    expect(screen.queryByText(/ho-so\//)).not.toBeInTheDocument();
  });

  it("công tắc nhận yêu cầu nằm cùng thẻ link, và lưu được", async () => {
    // Công tắc quyết định chính cái link này có ăn hay không — để lẻ ở trang cấu hình biểu
    // mẫu thì người dùng phải đi tìm. Backend nay ĐỌC `is_active` thật (chặn ở
    // `validate_submission`), nên tắt là khách hết gửi được.
    const user = userEvent.setup();
    await renderAppearance();

    const toggle = await screen.findByRole("switch", { name: /Đang nhận yêu cầu/ });
    expect(toggle).toBeChecked();

    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(updateIntakeFormConfig).toHaveBeenCalled());
    expect(vi.mocked(updateIntakeFormConfig).mock.calls[0][0].is_active).toBe(false);
  });

  it("gõ tên mới thì nhắc là phải bấm Lưu link mới chạy", async () => {
    // Nút Sao chép bám giá trị ĐÃ LƯU — đưa link chưa lưu cho người ta đi phát là đưa một
    // đường dẫn hỏng.
    const user = userEvent.setup();
    mockGetMe.mockResolvedValue(makeMe({ profile_slug: "thu-thuy" }));
    await renderAppearance();

    await waitFor(() => expect(screen.getByLabelText("Tên đường dẫn")).toHaveValue("thu-thuy"));
    await replaceText(user, screen.getByLabelText("Tên đường dẫn"), "ten-moi");

    expect(screen.getByText(/chỉ chạy sau khi bấm Lưu/i)).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/thu-thuy`)).toBeInTheDocument();
  });

  it("chặn Lưu khi tên đường dẫn sai, và nói rõ vì sao", async () => {
    // Bộ kiểm này trước ở màn Cài đặt hồ sơ; ô tên đường dẫn dời sang đây thì nó dời theo.
    const user = userEvent.setup();
    await renderAppearance();

    const slugInput = screen.getByLabelText("Tên đường dẫn");
    await replaceText(user, slugInput, "-sai-");

    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
    expect(screen.getByText(/chỉ dùng chữ thường/i)).toBeInTheDocument();
  });

  it("tên dành riêng cho hệ thống cũng bị chặn ngay tại chỗ", async () => {
    const user = userEvent.setup();
    await renderAppearance();

    await replaceText(user, screen.getByLabelText("Tên đường dẫn"), "login");

    expect(screen.getByText(/dành riêng/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
  });

  it("một nút Lưu ghi cả nội dung biểu mẫu lẫn diện mạo", async () => {
    const user = userEvent.setup();
    await renderAppearance();

    await replaceText(user, screen.getByLabelText("Tên đường dẫn"), "thu-thuy");
    await moTrang(user, /Biểu mẫu tiếp nhận/);
    await replaceText(user, screen.getByLabelText("Tiêu đề biểu mẫu"), "Form brief");

    // Nút Lưu nằm ngoài phân trang nên bấm được từ cả hai trang.
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(updateIntakeFormConfig).toHaveBeenCalled());
    await waitFor(() => expect(mockUpdateFreelancerProfile).toHaveBeenCalled());
    // Chỉ ba trường diện mạo — không kéo theo cả gói ngân hàng/MoMo/nhắc nhở của màn Cài đặt.
    expect(mockUpdateFreelancerProfile.mock.calls[0][0]).toEqual({
      cover_url: "",
      brand_color: "",
      profile_slug: "thu-thuy",
    });
  });

  it("lưu cấu hình biểu mẫu bằng PUT /intake-form", async () => {
    const user = userEvent.setup();
    await renderReady();

    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");
    await replaceText(user, titleInput, "Form brief dự án");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      expect(updateIntakeFormConfig).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
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

    const saveButton = screen.getByRole("button", { name: "Lưu thay đổi" });
    const titleInput = screen.getByLabelText("Tiêu đề biểu mẫu");

    expect(saveButton).toBeDisabled();

    await replaceText(user, titleInput, "Tiêu đề mới");
    expect(saveButton).toBeEnabled();

    await replaceText(user, titleInput, "Gửi yêu cầu dự án");
    expect(saveButton).toBeDisabled();
  });
});
