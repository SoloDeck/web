import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "@/features/deals/types";
import { FollowUpModal } from "./FollowUpModal";

/**
 * Hộp "Nhắc khách bằng AI" — hai lỗi đã có thật:
 * 1. "Duyệt và gửi" gửi giờ hẹn = đúng lúc bấm, backend từ chối vì đã thành quá khứ → 422.
 * 2. Ô tiêu đề sửa được nhưng thư gửi qua SoloDesk không dùng nó — người dùng tưởng đã đổi
 *    tiêu đề thư, khách nhận tiêu đề khác hẳn.  #Huynh
 */

const mockApprove = vi.fn();
const mockGenerate = vi.fn();

vi.mock("@/features/ai/hooks/useFollowUp", () => ({
  useGenerateFollowUp: () => ({ mutate: mockGenerate, isPending: false }),
}));
vi.mock("@/features/reminders/hooks/useReminders", () => ({
  useApproveAndSend: () => ({ mutate: mockApprove, isPending: false }),
  useCreateReminder: () => ({ mutate: vi.fn(), isPending: false }),
  useReminderSubject: (_type: string, _deal: string, enabled: boolean) => ({
    data: enabled ? "Hỏi thăm dự án Website bán hàng" : undefined,
  }),
}));
vi.mock("@/features/deals/dealHistoryStorage", () => ({ addDealHistoryEntry: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const deal = {
  id: "deal-1",
  client: "Quán cà phê Nắng",
  clientEmail: "khach@example.com",
  clientPhone: "",
  projectType: "Website bán hàng",
  stage: "new_lead",
} as unknown as Deal;

async function soanXong(user: ReturnType<typeof userEvent.setup>) {
  mockGenerate.mockImplementation((_vars, { onSuccess }) =>
    onSuccess({ message_text: "Chào anh, dự án tới đâu rồi ạ?", subject: "Tiêu đề AI gợi ý" })
  );
  await user.click(screen.getByRole("button", { name: "Hỏi thăm" }));
}

describe("<FollowUpModal />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Duyệt và gửi đặt giờ hẹn ở TƯƠNG LAI để backend không từ chối", async () => {
    const user = userEvent.setup();
    render(<FollowUpModal deal={deal} onClose={vi.fn()} />);
    await soanXong(user);

    const bamLuc = Date.now();
    await user.click(screen.getByRole("button", { name: /duyệt và gửi/i }));

    const payload = mockApprove.mock.calls[0][0];
    expect(new Date(payload.scheduled_at).getTime()).toBeGreaterThan(bamLuc + 60_000);
    expect(payload.message_preview).toBe("Chào anh, dự án tới đâu rồi ạ?");
  });

  it("nói rõ tiêu đề khách thật sự nhận, và ô sửa tiêu đề chỉ dành cho Gmail", async () => {
    const user = userEvent.setup();
    render(<FollowUpModal deal={deal} onClose={vi.fn()} />);
    await soanXong(user);

    expect(screen.getByText(/Tiêu đề khi bấm "Tự gửi" qua Gmail/)).toBeInTheDocument();
    expect(screen.getByText("“Hỏi thăm dự án Website bán hàng”")).toBeInTheDocument();
  });
});
