import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { createClient, getClients } from "@/services/clientsService";
import { createDeal } from "@/services/dealsService";

/**
 * Tạo yêu cầu mới hỏng giữa chừng rồi bấm lại.
 *
 * Khách chưa có sẵn thì hệ thống tạo KHÁCH trước, tạo DEAL sau. Bước sau là bước hay hỏng
 * (mạng chập, 500, 422). Bản cũ giữ khách vừa tạo trong một biến cục bộ, không ghim vào
 * state nào, nên lần bấm lại — đúng như toast bảo — lại tạo THÊM một khách nữa cùng tên.
 * Mở tab Hồ sơ khách hàng thấy hai "Nguyễn Văn A", một cái rỗng không dự án; lịch sử hợp tác
 * và doanh thu của khách bị chẻ đôi. Backend không chặn trùng nên cứ bấm là cứ đẻ.  #Huynh
 */

vi.mock("@/services/clientsService", () => ({
  getClients: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/services/dealsService", () => ({
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
}));
vi.mock("@/services/dealAttachmentsService", () => ({ uploadDealAttachment: vi.fn() }));
vi.mock("@/features/deals/hooks/useDealStore", () => ({
  useDealStore: (select: (state: { addDeal: () => void; updateDeal: () => void }) => unknown) =>
    select({ addDeal: vi.fn(), updateDeal: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const khach = {
  id: "c1",
  name: "Nguyễn Văn A",
  phone: null,
  email: null,
  notes: null,
} as never;

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NewDealModal open onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

async function dienForm() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("VD: Nguyễn Văn A / Công ty XYZ"), "Nguyễn Văn A");
  await user.type(
    screen.getByPlaceholderText("VD: Thiết kế website bán hàng..."),
    "Website bán hàng"
  );
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClients).mockResolvedValue([]);
  vi.mocked(createClient).mockResolvedValue(khach);
  vi.mocked(createDeal).mockRejectedValue(new Error("500"));
});

describe("<NewDealModal /> — tạo deal hỏng rồi bấm lại", () => {
  it("bấm lại KHÔNG đẻ thêm một khách trùng tên", async () => {
    renderModal();
    const user = await dienForm();

    await user.click(screen.getByRole("button", { name: /Tạo khách hàng & yêu cầu/i }));
    await waitFor(() => expect(createDeal).toHaveBeenCalledTimes(1));
    expect(createClient).toHaveBeenCalledTimes(1);

    // Lần bấm thứ hai: khách đã được ghim nên chỉ tạo deal.
    await user.click(screen.getByRole("button", { name: /Tạo yêu cầu/i }));
    await waitFor(() => expect(createDeal).toHaveBeenCalledTimes(2));
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createDeal).mock.calls[1][0]).toMatchObject({ client_id: "c1" });
  }, 20_000);

  it("nói rõ cái gì ĐÃ xong và cái gì CHƯA, thay vì một câu chung chung", async () => {
    renderModal();
    const user = await dienForm();

    await user.click(screen.getByRole("button", { name: /Tạo khách hàng & yêu cầu/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const cau = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(cau).toMatch(/Đã tạo khách hàng/);
    expect(cau).toMatch(/chưa tạo được yêu cầu/i);
    expect(cau).toMatch(/không bị tạo trùng/i);
  }, 20_000);
});
