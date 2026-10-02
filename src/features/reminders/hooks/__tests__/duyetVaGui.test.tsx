import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApproveAndSend } from "@/features/reminders/hooks/useReminders";
import {
  cancelReminder,
  createReminder,
  sendReminderNow,
  type ReminderPayload,
} from "@/services/remindersService";
import { SEND_NOW_LEAD_MS, sendNowScheduledAt } from "@/features/reminders/dateTime";

/**
 * "Duyệt và gửi" trong hộp Nhắc khách bằng AI: tạo lời nhắc rồi gửi ngay.
 *
 * Hỏng hoàn toàn từ 02/08: web đặt giờ hẹn đúng lúc bấm, backend chỉ nhận giờ ở tương lai —
 * request tới nơi thì giờ đó đã là quá khứ → 422, người dùng chỉ thấy "Không gửi được".  #Huynh
 */

vi.mock("@/services/remindersService", () => ({
  createReminder: vi.fn(),
  sendReminderNow: vi.fn(),
  cancelReminder: vi.fn(),
  previewReminder: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

function boc(qc: QueryClient) {
  return function Boc({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const payload: ReminderPayload = {
  target_type: "deal",
  target_id: "deal-1",
  reminder_type: "follow_up",
  channel: "email",
  scheduled_at: sendNowScheduledAt(),
  message_preview: "Chào anh",
};

describe("sendNowScheduledAt", () => {
  it("luôn lùi về tương lai đủ xa để request tới nơi vẫn còn là tương lai", () => {
    const now = new Date("2026-09-13T10:00:00Z");
    const at = new Date(sendNowScheduledAt(now)).getTime();
    expect(at - now.getTime()).toBe(SEND_NOW_LEAD_MS);
    expect(SEND_NOW_LEAD_MS).toBeGreaterThanOrEqual(60_000);
  });
});

describe("useApproveAndSend", () => {
  beforeEach(() => {
    vi.mocked(createReminder).mockReset().mockResolvedValue({ id: "rem-1" } as never);
    vi.mocked(sendReminderNow).mockReset();
    vi.mocked(cancelReminder).mockReset().mockResolvedValue(undefined);
  });

  it("gửi được thì không huỷ gì", async () => {
    vi.mocked(sendReminderNow).mockResolvedValue({
      delivered: true,
      detail: "Đã gửi",
      status: "sent",
    } as never);
    const { result } = renderHook(() => useApproveAndSend("deal-1"), {
      wrapper: boc(new QueryClient()),
    });

    await act(() => result.current.mutateAsync(payload));

    expect(sendReminderNow).toHaveBeenCalledWith("rem-1");
    expect(cancelReminder).not.toHaveBeenCalled();
  });

  it("bước gửi hỏng hẳn thì huỷ lời nhắc vừa tạo — kẻo ít phút sau beat gửi thư đi thật", async () => {
    vi.mocked(sendReminderNow).mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useApproveAndSend("deal-1"), {
      wrapper: boc(new QueryClient({ defaultOptions: { mutations: { retry: false } } })),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow("Network Error");
    });

    expect(cancelReminder).toHaveBeenCalledWith("rem-1");
  });
});
