import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import type React from "react";
import { SubscriptionPage } from "./SubscriptionPage";
import type { PaymentIntentResponse } from "@/services/subscriptionsService";

const mockCheckout = vi.fn();
const mockIntent = vi.fn(() => ({ data: undefined }) as { data?: PaymentIntentResponse });

vi.mock("@/features/subscriptions/hooks/useSubscriptions", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/subscriptions/hooks/useSubscriptions")
  >("@/features/subscriptions/hooks/useSubscriptions");
  return {
    ...actual,
    usePlans: () => ({
      data: [
        {
          id: "plan-free",
          name: "Free",
          slug: "free",
          price_monthly: 0,
          currency: "VND",
          can_use_ai: false,
          can_export_pdf: false,
          max_clients: 5,
          max_deals: 5,
          max_ai_generations_per_month: 0,
        },
        {
          id: "plan-pro",
          name: "Pro",
          slug: "pro",
          price_monthly: 199000,
          currency: "VND",
          can_use_ai: true,
          can_export_pdf: true,
          max_clients: null,
          max_deals: null,
          max_ai_generations_per_month: 50,
        },
      ],
      isLoading: false,
    }),
    useMySubscription: () => ({
      data: {
        id: "sub-1",
        user_id: "u-1",
        plan_id: "plan-free",
        plan_name: "Free",
        plan_slug: "free",
        status: "active",
        current_period_start: "2026-01-01T00:00:00Z",
        current_period_end: "2126-01-01T00:00:00Z",
        cancel_at_period_end: false,
      },
      isLoading: false,
    }),
    useCreateCheckout: () => ({ mutateAsync: mockCheckout, isPending: false }),
    usePaymentIntent: () => mockIntent(),
  };
});

vi.mock("@/features/revenue/hooks/useAnalytics", () => ({
  useAiUsage: () => ({ data: undefined }),
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => mockToastError(m) } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <StrictMode>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </StrictMode>
  );
}

function intentStub(over: Partial<PaymentIntentResponse> = {}): PaymentIntentResponse {
  return {
    id: "intent-1",
    subscription_id: "sub-1",
    plan_id: "plan-pro",
    provider: "momo",
    status: "pending",
    amount: 199000,
    currency: "VND",
    payment_link: { type: "checkout_url", url: null, qr_code_url: null, instructions: null },
    provider_reference: null,
    paid_at: null,
    expires_at: "2026-01-01T00:30:00Z",
    failure_reason: null,
    ...over,
  };
}

describe("<SubscriptionPage /> — mua gói", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntent.mockReturnValue({ data: undefined });
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("bấm nâng cấp thì gọi checkout kèm return_url tuyệt đối và nhớ id trước khi rời trang", async () => {
    mockCheckout.mockResolvedValue(
      intentStub({
        payment_link: {
          type: "checkout_url",
          url: "https://test-payment.momo.vn/pay/abc",
          qr_code_url: null,
          instructions: null,
        },
      })
    );

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: /nâng cấp qua momo/i }));

    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(1));
    const arg = mockCheckout.mock.calls[0][0];
    expect(arg.planId).toBe("plan-pro");
    // Backend chỉ nhận http(s) tuyệt đối — đường dẫn tương đối bị từ chối.
    expect(arg.returnUrl).toMatch(/^https?:\/\/.+\?tab=subscription$/);
    // Phải nhớ id TRƯỚC khi rời trang, vì return_url không mang được id.
    expect(sessionStorage.getItem("intent")).toBe("intent-1");
  });

  it("checkout lỗi thì hiện đúng câu backend trả, không phải câu chung chung", async () => {
    mockCheckout.mockRejectedValue({
      response: { status: 402, data: { error: { message: "Gói free không cần thanh toán." } } },
    });

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: /nâng cấp qua momo/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Gói free không cần thanh toán.")
    );
  });

  it("MoMo không trả link thì báo lỗi thay vì điều hướng đi đâu đó", async () => {
    mockCheckout.mockResolvedValue(intentStub());

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: /nâng cấp qua momo/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(sessionStorage.getItem("intent")).toBeNull();
  });

  it("quay về mà backend chưa nhận IPN thì nói ĐANG CHỜ, không nói thất bại", () => {
    // Đây là ca dễ làm người dùng trả tiền hai lần: IPN chạy song song với việc trình
    // duyệt quay về, nên lúc trang mở lại trạng thái vẫn còn `pending`.
    mockIntent.mockReturnValue({ data: intentStub({ status: "pending" }) });

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/đang xác nhận/i);
  });

  it("thanh toán xong thì báo đã kích hoạt", () => {
    mockIntent.mockReturnValue({ data: intentStub({ status: "succeeded" }) });

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/thành công/i);
  });

  it("thất bại thì hiện lý do backend trả về", () => {
    mockIntent.mockReturnValue({
      data: intentStub({ status: "failed", failure_reason: "Số dư không đủ" }),
    });

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Số dư không đủ");
  });

  it("chỉ gói trả phí mới có nút thanh toán", () => {
    // Mock đang ở gói free, nên thẻ free hiện "Đang sử dụng"; chỉ còn đúng thẻ Pro là mua
    // được. Khẳng định số lượng để nếu sau này ai đó vô tình gắn nút mua vào gói free —
    // thứ không có gì để trả tiền — thì test đổ.
    render(<SubscriptionPage />, { wrapper });

    expect(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })).toHaveLength(1);
    expect(screen.getByText(/đang sử dụng/i)).toBeInTheDocument();
  });
});
