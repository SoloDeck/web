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
        // Gói hiện tại là một gói RIÊNG, không phải Free — đúng như màn hình thật khi
        // admin tạo thêm gói thử nghiệm. Nhờ vậy thẻ Free vẫn render NÚT (thay vì "Đang
        // sử dụng"), tức là tái hiện được ca gói Free hiện nút mua.
        {
          id: "plan-test",
          name: "Pro Test (Huynh)",
          slug: "pro-test",
          price_monthly: "0.00",
          currency: "VND",
          can_use_ai: true,
          can_export_pdf: true,
          max_clients: null,
          max_deals: null,
          max_ai_generations_per_month: 100000,
        },
        {
          id: "plan-free",
          name: "Free",
          slug: "free",
          price_monthly: "0.00",
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
          price_monthly: "199000.00",
          currency: "VND",
          can_use_ai: true,
          can_export_pdf: true,
          max_clients: null,
          max_deals: null,
          max_ai_generations_per_month: 50,
        },
        // Gói quản trị viên tự tạo, để giá 200đ — DƯỚI mức tối thiểu 1.000đ của MoMo.
        // Đây đúng là gói đã gây ra sự cố trên bản deploy: bấm mua thì MoMo trả HTTP 400
        // và người dùng nhận được câu "Could not reach MoMo".
        {
          id: "plan-abc",
          name: "abc",
          slug: "abc",
          price_monthly: "200.00",
          currency: "VND",
          can_use_ai: false,
          can_export_pdf: false,
          max_clients: null,
          max_deals: null,
          max_ai_generations_per_month: 0,
        },
        // Gói trả phí THỨ HAI: cần có để bắt lỗi "bấm một thẻ, cả ba thẻ cùng quay spinner".
        {
          id: "plan-agency",
          name: "Agency",
          slug: "agency",
          price_monthly: "499000.00",
          currency: "VND",
          can_use_ai: true,
          can_export_pdf: true,
          max_clients: null,
          max_deals: null,
          max_ai_generations_per_month: 500,
        },
      ],
      isLoading: false,
    }),
    useMySubscription: () => ({
      data: {
        id: "sub-1",
        user_id: "u-1",
        plan_id: "plan-test",
        plan_name: "Pro Test (Huynh)",
        plan_slug: "pro-test",
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
    await userEvent.click(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })[0]);

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
    await userEvent.click(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })[0]);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Gói free không cần thanh toán.")
    );
  });

  it("MoMo không trả link thì báo lỗi thay vì điều hướng đi đâu đó", async () => {
    mockCheckout.mockResolvedValue(intentStub());

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })[0]);

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
    // Gói hiện tại là "Pro Test" nên nó hiện "Đang sử dụng"; Free và Pro đều render nút.
    // Pro và Agency mua được (abc dưới mức tối thiểu MoMo) — khẳng định số lượng để ai đó
    // gắn nhầm nút mua vào gói 0đ là test đổ.
    render(<SubscriptionPage />, { wrapper });

    expect(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })).toHaveLength(2);
    expect(screen.getByText(/đang sử dụng/i)).toBeInTheDocument();
  });

  it("MoMo đá về với resultCode=1006 (người dùng huỷ) thì báo ĐÃ HUỶ, không kẹt ở 'đang xác nhận'", () => {
    // Lỗi thật: huỷ trên MoMo thì KHÔNG có IPN nào được gửi → intent bên backend nằm mãi ở
    // `pending` → trang hỏi lại 3 giây một lần và kẹt vĩnh viễn ở "Đang xác nhận…".  #Huynh
    sessionStorage.setItem("intent", "intent-1");
    window.history.replaceState(
      {},
      "",
      "/?tab=subscription&partnerCode=MOMO&orderId=o-1&resultCode=1006" +
        "&message=" + encodeURIComponent("Giao dịch bị từ chối bởi người dùng.")
    );

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/đã huỷ thanh toán/i);
    expect(screen.queryByText(/đang xác nhận/i)).not.toBeInTheDocument();
    // Không còn intent nào để hỏi lại → không có vòng lặp nào chạy tiếp.
    expect(sessionStorage.getItem("intent")).toBeNull();
    // Dọn param để F5 không báo lại giao dịch cũ, nhưng phải giữ đúng tab.
    expect(window.location.search).toBe("?tab=subscription");
  });

  it("resultCode khác 0 và không phải huỷ thì hiện lý do MoMo trả", () => {
    window.history.replaceState({}, "", "/?tab=subscription&resultCode=1001&message=" + encodeURIComponent("Số dư không đủ"));

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Số dư không đủ");
  });

  it("resultCode=0 thì vẫn hỏi backend xác nhận, không tự nhận thành công từ URL", () => {
    // URL do người dùng sửa tay được — thành công phải do backend nói.
    sessionStorage.setItem("intent", "intent-1");
    window.history.replaceState({}, "", "/?tab=subscription&resultCode=0");
    mockIntent.mockReturnValue({ data: intentStub({ status: "pending" }) });

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/đang xác nhận/i);
  });

  it("bấm nâng cấp ở một thẻ thì CHỈ thẻ đó quay spinner", async () => {
    // Trước đây `buying` lấy chung `checkout.isPending` nên cả ba thẻ cùng quay.  #Huynh
    mockCheckout.mockReturnValue(new Promise(() => {})); // treo mãi: giữ trạng thái đang bấm

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /đang mở trang thanh toán/i })).toBeInTheDocument()
    );
    expect(screen.queryAllByRole("button", { name: /đang mở trang thanh toán/i })).toHaveLength(1);
  });

  it("gói 0đ KHÔNG mua được, dù giá về dạng chuỗi Decimal", () => {
    // Lỗi thật đã gặp: backend serialize Decimal thành CHUỖI ("0.00"), mà FE khai
    // `price_monthly: number` rồi so `=== 0` → luôn sai → gói Free hiện nút "Nâng cấp qua
    // MoMo" dù chẳng có gì để trả tiền. Test cũ dùng số nên không bắt được.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    const nutFree = screen.getByRole("button", { name: /^miễn phí$/i });
    expect(nutFree).toBeDisabled();
  });

  it("gói giá dưới mức tối thiểu của MoMo thì không bày nút mua, và nói rõ vì sao", () => {
    // Trước bản vá, gói 200đ vẫn hiện nút "Nâng cấp qua MoMo" bình thường. Bấm vào là
    // MoMo trả HTTP 400, và người dùng nhận về "Could not reach MoMo" — một câu vừa
    // không nói được nguyên nhân, vừa chỉ sai hướng.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("button", { name: /chưa mua được/i })).toBeDisabled();
    expect(screen.getByText(/ngoài khoảng momo hỗ trợ/i)).toBeInTheDocument();
  });

  it("gói ngoài hạn mức không làm phát sinh thêm nút mua nào", () => {
    render(<SubscriptionPage />, { wrapper });

    // Vẫn đúng hai nút mua (Pro và Agency). Gắn nút mua vào gói 200đ là test này đổ.
    expect(screen.getAllByRole("button", { name: /nâng cấp qua momo/i })).toHaveLength(2);
  });

  it("gói tự tạo xếp xuống cuối bảng giá, không nhảy lên trước gói Free", () => {
    // `ORDER.indexOf` trả -1 cho mã lạ, mà -1 nhỏ hơn mọi hạng hợp lệ — nên gói tự tạo
    // từng bị đẩy lên ĐẦU bảng giá, đứng trước cả Free.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    const tenGoi = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(tenGoi.indexOf("Free")).toBeLessThan(tenGoi.indexOf("abc"));
    expect(tenGoi.indexOf("Pro")).toBeLessThan(tenGoi.indexOf("abc"));
    expect(tenGoi[0]).toBe("Free");
  });
});
