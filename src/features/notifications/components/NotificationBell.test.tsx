import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { resolveNotificationTarget } from "@/features/notifications/notificationTarget";

/**
 * Bấm một dòng thông báo: đánh dấu đã đọc, LÀM MỚI dữ liệu của deal, rồi mở đúng tab + đúng mục.
 *
 * Làm mới là bắt buộc: thông báo sinh ra từ việc chạy nền (beat gửi lời nhắc, job quá hạn), không
 * qua mutation nào của web, nên cache còn "tươi" mà đã sai.  #Huynh
 */

const mockNavigate = vi.fn();
const mockMarkRead = vi.fn();

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));
vi.mock("@/features/notifications/notificationTarget", () => ({
  resolveNotificationTarget: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/features/notifications/hooks/useNotifications", () => ({
  useUnreadCount: () => ({ data: 1 }),
  useNotifications: () => ({
    isLoading: false,
    data: {
      items: [
        {
          id: "n1",
          type: "invoice_overdue",
          title: "Hoá đơn INV-1 đã quá hạn 1 ngày",
          body: null,
          entity_type: "invoice",
          entity_id: "inv-1",
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    },
  }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
  useMarkAllRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

function withClient(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<NotificationBell />", () => {
  it("hoá đơn quá hạn: làm mới cache của deal rồi mở tab Tài liệu kèm hoá đơn", async () => {
    vi.mocked(resolveNotificationTarget).mockResolvedValue({
      kind: "deal",
      dealId: "d1",
      tab: "documents",
      invoiceId: "inv-1",
    });
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    render(<NotificationBell />, { wrapper: withClient(qc) });

    await userEvent.click(screen.getByRole("button", { name: /thông báo/i }));
    await userEvent.click(screen.getByText(/INV-1 đã quá hạn/));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/deals/$dealId",
        params: { dealId: "d1" },
        search: { tab: "documents", invoice: "inv-1", reminder: undefined },
      })
    );
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
    const keys = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    expect(keys).toContain(JSON.stringify(["reminders", "deal", "d1"]));
    expect(keys).toContain(JSON.stringify(["invoices", "deal", "d1"]));
  });
});
