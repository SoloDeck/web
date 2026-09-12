import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DealReminderPanel } from "./DealReminderPanel";
import type { Deal } from "@/features/deals/types";
import type { ReminderRecord } from "@/services/remindersService";

/**
 * Hỏi lại phải đặt ĐÚNG NÚT.
 *
 * Trên mỗi hàng lời nhắc đang chờ có ba nút liền nhau: "Gửi ngay", "Sửa", "Hủy". Bản cũ đặt
 * ngược: "Gửi ngay" — email rời máy chủ tới khách hàng thật, không thu hồi được — thì im lặng
 * chạy luôn, còn "Hủy" — chỉ bỏ một lịch hẹn chưa gửi, soạn lại mất 30 giây — lại bị chặn
 * bằng `window.confirm` (khoá cứng cả tab, và câu hỏi "Hủy lịch nhắc này?" cũng không nói
 * mất gì).  #Huynh
 */

const mockSendNow = vi.fn();
const mockCancel = vi.fn();

vi.mock("@/features/reminders/hooks/useReminders", () => ({
  useDealReminders: () => ({ data: reminders, isLoading: false }),
  useUpdateReminder: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelReminder: () => ({ mutate: mockCancel, isPending: false }),
  useSendReminderNow: () => ({ mutate: mockSendNow, isPending: false }),
}));
vi.mock("@/features/ai/components/FollowUpModal", () => ({
  FollowUpModal: () => null,
}));
vi.mock("@/features/reminders/components/ReminderComposerModal", () => ({
  ReminderComposerModal: () => null,
}));

const deal = {
  id: "deal-1",
  client: "Quán cà phê Nắng",
  projectType: "Website bán hàng",
} as unknown as Deal;

function reminder(over: Partial<ReminderRecord> = {}): ReminderRecord {
  return {
    id: "rem-1",
    reminder_type: "payment_overdue",
    channel: "email",
    status: "pending",
    scheduled_at: "2026-12-24T09:00:00Z",
    message_preview: "Nhắc anh khoản còn lại nhé.",
    requires_approval: false,
    created_by_rule: false,
    attachments: [],
    ...over,
  } as ReminderRecord;
}

let reminders: ReminderRecord[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  reminders = [reminder()];
});

describe("<DealReminderPanel /> — gửi ngay", () => {
  it("bấm 'Gửi ngay' CHƯA gửi gì — thư ra khách thì phải hỏi trước", async () => {
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /gửi ngay/i }));

    expect(mockSendNow).not.toHaveBeenCalled();
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent("Quán cà phê Nắng");
    expect(hopThoai).toHaveTextContent(/không thu hồi được/i);
    // Nhắc lại lịch hẹn ban đầu để người dùng biết mình đang phá vỡ cái gì.
    expect(hopThoai).toHaveTextContent(/24\/12\/2026/);
  });

  it("xác nhận xong mới thật sự gửi", async () => {
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /gửi ngay/i }));
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: /gửi ngay cho khách/i }));

    expect(mockSendNow).toHaveBeenCalledWith("rem-1");
  });

  it("bấm 'Giữ đúng lịch' thì không gửi gì cả", async () => {
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /gửi ngay/i }));
    await userEvent.click(screen.getByRole("button", { name: /giữ đúng lịch/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockSendNow).not.toHaveBeenCalled();
  });

  it("kênh 'Chỉ nhắc tôi' thì gửi thẳng — hỏi là thừa một cú bấm", async () => {
    reminders = [reminder({ id: "rem-2", channel: "in_app" })];
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /gửi ngay/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockSendNow).toHaveBeenCalledWith("rem-2");
  });

  it("kênh Zalo cũng chạm tới khách nên vẫn hỏi", async () => {
    reminders = [reminder({ id: "rem-3", channel: "zalo" })];
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /gửi ngay/i }));

    expect(mockSendNow).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/Zalo/);
  });
});

describe("<DealReminderPanel /> — bỏ lịch nhắc", () => {
  it("hỏi bằng hộp thoại của dự án, không phải hộp thoại trình duyệt", async () => {
    // `window.confirm` khoá cứng cả tab và không theo giao diện chung. Nếu code còn gọi nó,
    // spy này sẽ dính.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /^hủy$/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
    const hopThoai = screen.getByRole("alertdialog");
    // Nói rõ mất gì và lấy lại được không.
    expect(hopThoai).toHaveTextContent(/sẽ không gửi nữa/i);
    expect(hopThoai).toHaveTextContent(/soạn được lời nhắc mới/i);
    confirmSpy.mockRestore();
  });

  it("xác nhận xong mới bỏ lịch", async () => {
    render(<DealReminderPanel deal={deal} />);

    await userEvent.click(screen.getByRole("button", { name: /^hủy$/i }));
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: /bỏ lịch nhắc/i }));

    expect(mockCancel).toHaveBeenCalledWith("rem-1");
  });
});
