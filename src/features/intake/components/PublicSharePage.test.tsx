import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSharePage } from "./PublicSharePage";
import {
  getPublicIntakeFormConfig,
  getPublicProfile,
  type PublicIntakeFormConfigResponse,
  type PublicProfileResponse,
} from "@/services/intakeService";

// Trang này render cả IntakeForm nên phải mock đủ 4 hàm — thiếu một cái là component con
// gọi vào undefined.
vi.mock("@/services/intakeService", () => ({
  getPublicProfile: vi.fn(),
  getPublicIntakeFormConfig: vi.fn(),
  submitIntake: vi.fn(),
  uploadIntakeAttachment: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PROFILE: PublicProfileResponse = {
  full_name: "Trần Thị Thiết Kế",
  professional_title: "Thiết kế thương hiệu & nội dung",
  bio: "5 năm làm nhận diện thương hiệu.",
  avatar_url: null,
  cover_url: null,
  brand_color: null,
  skills: ["Figma", "Thiết kế logo"],
  portfolio_url: "https://behance.net/tran",
};

const CONFIG: PublicIntakeFormConfigResponse = {
  title: "Gửi yêu cầu dự án",
  description: "Điền giúp mình vài thông tin nhé.",
  freelancer_name: "Trần Thị Thiết Kế",
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
      placeholder: "Mô tả chi tiết...",
      field_type: "textarea",
      is_required: true,
    },
  ],
};

function renderPage(token = "tok-abc123") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PublicSharePage shareToken={token} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublicIntakeFormConfig).mockResolvedValue(CONFIG);
});

describe("<PublicSharePage />", () => {
  it("hồ sơ và biểu mẫu nằm trên CÙNG một trang, khách không phải bấm thêm lần nào", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(PROFILE);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" }),
    ).toBeInTheDocument();
    // Ô nhập của biểu mẫu có mặt ngay, không cần điều hướng đi đâu.
    expect(await screen.findByLabelText("Họ tên khách hàng")).toBeInTheDocument();
  });

  it("áp màu chủ đạo của freelancer cho cả trang bằng biến CSS", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ ...PROFILE, brand_color: "#0f766e" });
    const { container } = renderPage();

    await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" });
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--primary")).toBe("#0f766e");
    // Chữ trên nền màu phải tự đổi để còn đọc được.
    expect(root.style.getPropertyValue("--primary-foreground")).toBe("#ffffff");
  });

  it("chưa chọn màu thì KHÔNG ghi đè gì, rơi về tím mặc định của app", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(PROFILE);
    const { container } = renderPage();

    await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" });
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--primary")).toBe("");
  });

  it("chưa có ảnh bìa thì dựng gradient chứ không render thẻ ảnh rỗng", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(PROFILE);
    const { container } = renderPage();

    await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" });
    // Không avatar, không bìa ⇒ không có <img> nào cả.
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("không render bất kỳ tín hiệu xếp hạng kiểu sàn nào", async () => {
    // Trang cũ có sao đánh giá, số lượt review, số dự án và huy hiệu — những thứ chỉ có
    // nghĩa khi đem nhiều freelancer ra so. Chặn để chúng không bò lại.  #Huynh
    vi.mocked(getPublicProfile).mockResolvedValue(PROFILE);
    const { container } = renderPage();

    await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" });
    const text = container.textContent ?? "";
    for (const pattern of [/đánh giá/i, /dự án đã hoàn thành/i, /top rated/i, /nổi bật/i]) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("nút chính dẫn tới khối biểu mẫu ngay trong trang, và chỉ có MỘT nút như vậy", async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(PROFILE);
    renderPage();

    await screen.findByRole("heading", { name: "Trần Thị Thiết Kế" });
    const links = screen.getAllByRole("link", { name: /gửi yêu cầu/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "#bieu-mau");
  });

  it("đường dẫn sai thì báo không tìm thấy, và KHÔNG có link nào để đi tìm người khác", async () => {
    vi.mocked(getPublicProfile).mockRejectedValue(new Error("404"));
    renderPage("khong-co-that");

    await waitFor(() =>
      expect(screen.getByText(/không tìm thấy hồ sơ này/i)).toBeInTheDocument(),
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
