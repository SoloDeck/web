import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { TemplateCard } from "@/features/admin/components/AdminDashboard";

/**
 * Thẻ mẫu trong màn "Thư viện mẫu" của admin.
 *
 * Bản trước đọc DUY NHẤT khoá `body` kiểu cũ:
 *   const body = typeof template.content?.body === "string" ? template.content.body : "";
 * nên mẫu soạn theo cấu trúc nhiều khối hiện ra TRỐNG TRƠN — admin nhìn vào tưởng chưa nhập gì,
 * đúng lúc mẫu đó là mẫu đầy đủ nhất trong thư viện.
 *
 * Và giờ một mẫu phục vụ HAI đường soạn, nên thẻ phải nói tách bạch: điều khoản (chèn vào bản AI
 * viết) và khung phần thân (nền cho freelancer tự soạn khi không dùng AI).  #Huynh
 */

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
// Màn soạn mẫu dựng tờ giấy thật qua API. Test này kiểm THẺ mẫu, không kiểm tờ giấy — trả một
// khung HTML tối thiểu để iframe có gì đó nạp.
vi.mock("@/services/adminService", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  previewAdminTemplate: vi.fn().mockResolvedValue("<html><body>to giay</body></html>"),
}));

vi.mock("@/features/admin/hooks/useAdmin", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUpdateAdminTemplate: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderCard(content: Record<string, unknown>, type: "proposal" | "contract" = "proposal") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
    <TemplateCard
      template={
        {
          id: "t1",
          name: "Mẫu thử",
          template_type: type,
          profession: null,
          content,
          is_active: true,
          version_number: 2,
        } as never
      }
      />
    </QueryClientProvider>
  );
}

describe("TemplateCard", () => {
  it("mẫu NHIỀU KHỐI không còn hiện ra trống trơn", () => {
    // Đây là mẫu "Bàn giao file nguồn" có thật trong DB — mẫu đầy đủ nhất, mà bản trước là thẻ
    // duy nhất KHÔNG có dòng mô tả nào.
    renderCard({
      valid_days: 14,
      out_of_scope: ["Mua font bản quyền", "Chi phí in ấn"],
      standard_terms: "Bàn giao file nguồn sau khi thanh toán đủ 100%.",
      revision_policy: "2 vòng chỉnh sửa miễn phí, từ vòng 3 tính phí.",
    });

    expect(
      screen.getByText("Ngoài phạm vi · Chính sách chỉnh sửa · Điều khoản chuẩn")
    ).toBeInTheDocument();
    expect(screen.getByText(/Mua font bản quyền/)).toBeInTheDocument();
  });

  it("nói THẲNG khi mẫu chưa có khung phần thân", () => {
    // Vế quan trọng nhất với admin lúc này: mẫu thuần điều khoản thì freelancer chọn "Tự soạn
    // từ khung" vẫn phải gõ tay gần như toàn bộ tờ giấy.
    renderCard({ standard_terms: "Điều khoản chuẩn" });
    expect(screen.getByText(/chưa soạn — freelancer sẽ tự điền toàn bộ/)).toBeInTheDocument();
  });

  it("liệt kê đúng các mục phần thân đã soạn", () => {
    renderCard({
      project_overview: "Tổng quan",
      scope_of_work: ["Khảo sát", "Phác thảo"],
      standard_terms: "Điều khoản chuẩn",
    });
    expect(screen.getByText("Tổng quan dự án · Phạm vi công việc")).toBeInTheDocument();
    expect(screen.getByText("Điều khoản chuẩn")).toBeInTheDocument();
  });

  it("mẫu CŨ chỉ có khoá body vẫn đọc ra Điều khoản chuẩn", () => {
    // Ba trong bốn mẫu đang có trong DB dùng khoá này. Nâng cấp màn hình không được làm chúng
    // biến thành thẻ trống.
    renderCard({ body: "Đặt cọc 50%." });
    expect(screen.getByText("Điều khoản chuẩn")).toBeInTheDocument();
    expect(screen.getByText("Đặt cọc 50%.")).toBeInTheDocument();
  });

  it("hợp đồng có bộ mục khác báo giá", () => {
    renderCard({ scope_of_work: "Thiết kế và bàn giao.", ip_ownership: "Bàn giao sau thanh toán." }, "contract");
    expect(screen.getByText("Quyền sở hữu trí tuệ")).toBeInTheDocument();
    expect(screen.getByText("Nội dung và phạm vi công việc")).toBeInTheDocument();
  });
});

/**
 * Form soạn mẫu nằm trong CỬA SỔ RIÊNG.
 *
 * Bản trước form thay chỗ chính cái thẻ, mà thẻ nằm trong lưới 2 cột. Từ khi một mẫu gánh cả
 * hai đường soạn, form dài gấp ba bản cũ — nhét vào một ô lưới thì vừa chật vừa làm cả lưới
 * nhảy chiều cao, và admin mất luôn tầm nhìn sang các mẫu khác để đối chiếu.  #Huynh
 */
describe("TemplateCard — sửa trong cửa sổ riêng", () => {
  it("chưa bấm Sửa thì không có form nào bày sẵn", () => {
    renderCard({ standard_terms: "Điều khoản chuẩn" });
    expect(screen.queryByText("Lưu mẫu")).toBeNull();
  });

  it("bấm Sửa thì mở cửa sổ, thẻ vẫn nằm nguyên chỗ cũ", () => {
    renderCard({ standard_terms: "Điều khoản chuẩn" });
    fireEvent.click(screen.getByText("Sửa"));

    expect(screen.getByText("Sửa mẫu · Mẫu thử")).toBeInTheDocument();
    expect(screen.getByText("Lưu mẫu")).toBeInTheDocument();
    // Thẻ KHÔNG bị form thế chỗ — lưới không nhảy chiều cao. Dùng `getByText` chứ không phải
    // `getByRole`: cửa sổ là modal thật nên nền bị ẩn khỏi cây trợ năng, đó là hành vi ĐÚNG.
    expect(screen.getByText("Mẫu thử")).toBeInTheDocument();
  });

  it("cửa sổ mở ra là màn soạn TRÊN TỜ GIẤY, không phải một rừng ô chữ", () => {
    // Đổi thiết kế: nội dung mẫu giờ gõ thẳng lên tờ giấy thật trong iframe. Chỉ những thứ
    // KHÔNG in ra giấy được (tên mẫu, nghề, hạn hiệu lực, bật/tắt) mới còn là ô nhập.
    renderCard({ standard_terms: "Bàn giao file nguồn.", valid_days: 14 });
    fireEvent.click(screen.getByText("Sửa"));

    expect(screen.getByText("Đầu mục · phần thân 0/6")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mẫu thử")).toBeInTheDocument();
    expect(screen.getByDisplayValue("14")).toBeInTheDocument();
  });

  it("dàn bài đánh dấu mục nào đã soạn, mục nào còn trống", () => {
    renderCard({ project_overview: "Tổng quan", timeline: "4 tuần" });
    fireEvent.click(screen.getByText("Sửa"));

    // Hai trên sáu mục phần thân đã có chữ — admin nhìn một cái là biết còn thiếu gì.
    expect(screen.getByText("Đầu mục · phần thân 2/6")).toBeInTheDocument();
  });

  it("hợp đồng có dàn bài riêng, không dùng chung với báo giá", () => {
    renderCard({ scope_of_work: "Thiết kế và bàn giao." }, "contract");
    fireEvent.click(screen.getByText("Sửa"));

    expect(screen.getByText("Đầu mục · phần thân 1/3")).toBeInTheDocument();
    expect(screen.getByText("Quyền sở hữu trí tuệ")).toBeInTheDocument();
    // Ô hạn hiệu lực chỉ có nghĩa với báo giá.
    expect(screen.queryByText("Hiệu lực báo giá (ngày)")).toBeNull();
  });
});
