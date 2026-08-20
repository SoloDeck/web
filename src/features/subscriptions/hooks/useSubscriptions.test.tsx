import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePaymentIntent, useMySubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import type { PaymentIntentResponse, SubscriptionResponse } from "@/services/subscriptionsService";

/**
 * Vì sao phải có file này.
 *
 * Bộ test của trang Gói dịch vụ mock THẲNG `usePaymentIntent` và `useMySubscription`, nên
 * nó chứng minh được "backend trả succeeded thì banner báo đã kích hoạt" — nhưng KHÔNG
 * chứng minh được điều người dùng thật sự quan tâm: trả tiền xong thì thẻ gói có đổi không.
 *
 * Cái làm thẻ gói đổi là đúng một dòng trong `usePaymentIntent`: thấy `succeeded` thì gọi
 * `invalidateQueries` cho `subscriptions/me`. Dòng đó trước nay không có test nào phủ —
 * xoá đi thì cả 630 test vẫn xanh, mà freelancer trả tiền xong vẫn ngồi nhìn gói cũ cho
 * tới khi tự F5.  #Huynh
 */

const mockGetPaymentIntent = vi.fn();
const mockGetMySubscription = vi.fn();

vi.mock("@/services/subscriptionsService", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/subscriptionsService")>(
      "@/services/subscriptionsService"
    );
  return {
    ...actual,
    getPaymentIntent: (...args: unknown[]) => mockGetPaymentIntent(...args),
    getMySubscription: (...args: unknown[]) => mockGetMySubscription(...args),
    listPlans: vi.fn(),
    createCheckout: vi.fn(),
  };
});

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

function subStub(planSlug: string): SubscriptionResponse {
  return {
    id: "sub-1",
    user_id: "u-1",
    plan_id: `plan-${planSlug}`,
    plan_name: planSlug,
    plan_slug: planSlug,
    status: "active",
    current_period_start: "2026-01-01T00:00:00Z",
    current_period_end: "2026-01-31T00:00:00Z",
    cancel_at_period_end: false,
  };
}

let qc: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("usePaymentIntent — trả tiền xong thì gói phải đổi", () => {
  it("MoMo báo succeeded thì `subscriptions/me` được hỏi lại, và gói mới hiện ra", async () => {
    // Đây chính là ca người dùng kêu: thanh toán thành công mà thẻ gói không đổi.
    mockGetPaymentIntent.mockResolvedValue(intentStub({ status: "succeeded" }));
    // Lần hỏi đầu còn là gói cũ; sau khi IPN về, backend trả gói mới.
    mockGetMySubscription
      .mockResolvedValueOnce(subStub("free"))
      .mockResolvedValue(subStub("pro"));

    const sub = renderHook(() => useMySubscription(), { wrapper });
    await waitFor(() => expect(sub.result.current.data?.plan_slug).toBe("free"));

    renderHook(() => usePaymentIntent("intent-1"), { wrapper });

    // KHÔNG chỉ kiểm "có gọi invalidateQueries": kiểm cái người dùng nhìn thấy — gói đã đổi.
    await waitFor(() => expect(sub.result.current.data?.plan_slug).toBe("pro"));
    expect(mockGetMySubscription).toHaveBeenCalledTimes(2);
  });

  it("còn pending thì KHÔNG hỏi lại gói — chưa có gì để đổi", async () => {
    mockGetPaymentIntent.mockResolvedValue(intentStub({ status: "pending" }));
    mockGetMySubscription.mockResolvedValue(subStub("free"));

    renderHook(() => useMySubscription(), { wrapper });
    await waitFor(() => expect(mockGetMySubscription).toHaveBeenCalledTimes(1));

    const intent = renderHook(() => usePaymentIntent("intent-1"), { wrapper });
    await waitFor(() => expect(intent.result.current.data?.status).toBe("pending"));

    expect(mockGetMySubscription).toHaveBeenCalledTimes(1);
  });

  it("thất bại cũng không hỏi lại gói — tiền không vào thì gói không đổi", async () => {
    mockGetPaymentIntent.mockResolvedValue(
      intentStub({ status: "failed", failure_reason: "Số dư không đủ." })
    );
    mockGetMySubscription.mockResolvedValue(subStub("free"));

    renderHook(() => useMySubscription(), { wrapper });
    await waitFor(() => expect(mockGetMySubscription).toHaveBeenCalledTimes(1));

    const intent = renderHook(() => usePaymentIntent("intent-1"), { wrapper });
    await waitFor(() => expect(intent.result.current.data?.status).toBe("failed"));

    expect(mockGetMySubscription).toHaveBeenCalledTimes(1);
  });

  it("không có intent nào thì không hỏi backend lần nào", async () => {
    const intent = renderHook(() => usePaymentIntent(null), { wrapper });

    await waitFor(() => expect(intent.result.current.isPending).toBe(true));
    expect(mockGetPaymentIntent).not.toHaveBeenCalled();
  });
});
