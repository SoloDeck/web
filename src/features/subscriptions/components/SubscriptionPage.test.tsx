import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import type React from "react";
import { SubscriptionPage } from "./SubscriptionPage";
import type { PaymentIntentResponse } from "@/services/subscriptionsService";
import { readRememberedIntent, rememberIntent } from "@/features/subscriptions/lib/intentStorage";

const mockCheckout = vi.fn();
const mockCancel = vi.fn();
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
    useCancelPaymentIntent: () => ({ mutate: mockCancel, isPending: false }),
    usePaymentIntent: () => mockIntent(),
  };
});

vi.mock("@/features/revenue/hooks/useAnalytics", () => ({
  useAiUsage: () => ({ data: undefined }),
}));

const mockToastError = vi.fn();
const mockRedirectTo = vi.fn();
vi.mock("@/features/subscriptions/lib/paymentLink", async () => {
  const actual = await vi.importActual<typeof import("@/features/subscriptions/lib/paymentLink")>(
    "@/features/subscriptions/lib/paymentLink"
  );
  return { ...actual, redirectTo: (...args: unknown[]) => mockRedirectTo(...args) };
});

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
    amount: "199000.00",
    currency: "VND",
    payment_link: { type: "checkout_url", url: null, qr_code_url: null, instructions: null },
    order_code: "SDTEST0001",
    provider_reference: null,
    paid_at: null,
    // Tương đối theo thời điểm chạy test, không phải mốc cố định: giá trị này đi qua
    // `handleBuy()` -> `rememberIntent(created.id, created.expires_at)` thật ở test dòng
    // 174, nên một chuỗi cố định trong quá khứ sẽ bị `intentStorage` coi là hết hạn ngay.
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    failure_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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

  /**
   * Bấm nút nâng cấp trên thẻ gói, chọn cổng, RỒI gật đầu.
   *
   * Ba bước, không phải một: nút trên thẻ chỉ mở hộp thoại, và hộp thoại giờ còn hỏi trả
   * bằng cách nào. Test nào chỉ bấm thẻ mà mong `mockCheckout` được gọi là đang mô tả một
   * luồng đã bỏ.
   */
  async function nangCap(thuTu = 0, cong: "momo" | "zalopay" | "sepay" = "momo") {
    await userEvent.click(screen.getAllByRole("button", { name: /^nâng cấp$/i })[thuTu]);
    if (cong !== "momo") {
      const viTri = cong === "zalopay" ? 1 : 2;
      await userEvent.click((await screen.findAllByRole("radio"))[viTri]);
    }
    await userEvent.click(await screen.findByRole("button", { name: /tiến hành thanh toán/i }));
  }

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
    await nangCap();

    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(1));
    const arg = mockCheckout.mock.calls[0][0];
    expect(arg.planId).toBe("plan-pro");
    // Backend chỉ nhận http(s) tuyệt đối — đường dẫn tương đối bị từ chối.
    expect(arg.returnUrl).toMatch(/^https?:\/\/.+\?tab=subscription$/);
    // Cổng phải đi kèm: trước đây nó bị hardcode "momo" trong service nên hai cổng còn
    // lại không ai chạm tới được.
    expect(arg.provider).toBe("momo");
    // Phải nhớ id TRƯỚC khi rời trang, vì return_url không mang được id.
    expect(readRememberedIntent()).toBe("intent-1");
    // Và phải điều hướng thật. Bản trước không kiểm được điều này vì `window.location.href`
    // gán thẳng trong component.
    expect(mockRedirectTo).toHaveBeenCalledWith("https://test-payment.momo.vn/pay/abc");
  });

  it("checkout lỗi thì hiện đúng câu backend trả, không phải câu chung chung", async () => {
    mockCheckout.mockRejectedValue({
      response: { status: 402, data: { error: { message: "Gói free không cần thanh toán." } } },
    });

    render(<SubscriptionPage />, { wrapper });
    await nangCap();

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Gói free không cần thanh toán.")
    );
  });

  it("cổng không trả link thì báo lỗi, KHÔNG điều hướng, nhưng VẪN nhớ đơn", async () => {
    // Khẳng định cuối đã bị LẬT so với bản trước. Bản trước bắt phải quên đơn đi — nhưng
    // đơn đó CÓ THẬT bên backend rồi: quên nó là giấu mất một lần tiêu tiền có thật, người
    // dùng không còn đường nào tra lại.
    mockCheckout.mockResolvedValue(intentStub());

    render(<SubscriptionPage />, { wrapper });
    await nangCap();

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockRedirectTo).not.toHaveBeenCalled();
    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("chọn SePay thì MỞ màn chuyển khoản, tuyệt đối không điều hướng trình duyệt", async () => {
    // `payment_link.url` của SePay là ẢNH PNG — điều hướng vào đó là quăng người dùng ra
    // một tấm ảnh trần, không có đường quay lại.
    const qr = "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS";
    const donSepay = intentStub({
      provider: "sepay",
      payment_link: {
        type: "bank_transfer_instruction",
        url: qr,
        qr_code_url: qr,
        instructions:
          "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB), nội dung ghi đúng: SDDYFM83AS",
      },
    });
    mockCheckout.mockResolvedValue(donSepay);
    // Trang đọc đơn từ `usePaymentIntent`, và ở bản chạy thật `useCreateCheckout` gieo sẵn
    // đơn vừa tạo vào cache nên đọc ra ngay. Ở đây `usePaymentIntent` bị mock thẳng nên phải
    // dựng lại điều đó bằng tay. Chính dòng gieo cache đó được canh riêng ở
    // `useSubscriptions.test.tsx` — bỏ nó đi thì test kia đỏ.
    //
    // Phải theo ĐÚNG THỨ TỰ THỜI GIAN chứ không trả sẵn từ đầu: đơn chỉ tồn tại sau khi
    // checkout xong. Trả sẵn thì trang tưởng đang có đơn treo dở và tự mở màn QR ngay lúc
    // mount, che mất nút "Nâng cấp" — đúng hành vi khôi phục sau F5, nhưng sai ca đang tả.
    mockIntent.mockImplementation(() => ({
      data: mockCheckout.mock.calls.length ? donSepay : undefined,
    }));

    render(<SubscriptionPage />, { wrapper });
    await nangCap(0, "sepay");

    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(1));
    expect(mockCheckout.mock.calls[0][0].provider).toBe("sepay");
    expect(mockRedirectTo).not.toHaveBeenCalled();
    expect(await screen.findByText("40104887")).toBeInTheDocument();
  });

  it("mở lại trang giữa lúc chờ chuyển khoản thì màn QR hiện lại, không mất trắng", async () => {
    // Người dùng đang ngồi đợi ngân hàng mà lỡ F5 (hoặc quay lại từ app ngân hàng) thì đơn
    // vẫn còn sống tới 30 phút — nhưng nếu màn QR không tự mở lại thì họ mất luôn số tài
    // khoản và nội dung chuyển khoản, coi như bế tắc.
    const qr = "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS";
    mockIntent.mockReturnValue({
      data: intentStub({
        provider: "sepay",
        status: "pending",
        payment_link: {
          type: "bank_transfer_instruction",
          url: qr,
          qr_code_url: qr,
          instructions: "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB)",
        },
      }),
    });
    rememberIntent("intent-1", new Date(Date.now() + 20 * 60_000).toISOString());

    render(<SubscriptionPage />, { wrapper });

    expect(await screen.findByText("40104887")).toBeInTheDocument();
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("đóng màn QR rồi vẫn mở lại được từ banner — đóng KHÔNG phải là huỷ đơn", async () => {
    const qr = "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS";
    mockIntent.mockReturnValue({
      data: intentStub({
        provider: "sepay",
        status: "pending",
        payment_link: {
          type: "bank_transfer_instruction",
          url: qr,
          qr_code_url: qr,
          instructions: "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB)",
        },
      }),
    });
    rememberIntent("intent-1", new Date(Date.now() + 20 * 60_000).toISOString());

    render(<SubscriptionPage />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /^đóng$/i }));

    // Đóng xong thì đơn vẫn còn — banner phải chìa ra đường quay lại.
    const moLai = await screen.findByRole("button", { name: /xem mã qr/i });
    await userEvent.click(moLai);

    expect(await screen.findByText("40104887")).toBeInTheDocument();
  });

  it("chọn ZaloPay thì đơn được tạo với đúng cổng zalopay", async () => {
    mockCheckout.mockResolvedValue(
      intentStub({
        provider: "zalopay",
        payment_link: {
          type: "checkout_url",
          url: "https://sbgateway.zalopay.vn/pay?token=abc",
          qr_code_url: null,
          instructions: null,
        },
      })
    );

    render(<SubscriptionPage />, { wrapper });
    await nangCap(0, "zalopay");

    await waitFor(() => expect(mockCheckout).toHaveBeenCalledTimes(1));
    expect(mockCheckout.mock.calls[0][0].provider).toBe("zalopay");
    expect(mockRedirectTo).toHaveBeenCalledWith("https://sbgateway.zalopay.vn/pay?token=abc");
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

    expect(screen.getAllByRole("button", { name: /^nâng cấp$/i })).toHaveLength(2);
    expect(screen.getByText(/đang sử dụng/i)).toBeInTheDocument();
  });

  it("MoMo đá về với resultCode=1006 (người dùng huỷ) thì báo ĐÃ HUỶ, không kẹt ở 'đang xác nhận'", () => {
    // Lỗi thật: huỷ trên MoMo thì KHÔNG có IPN nào được gửi → intent bên backend nằm mãi ở
    // `pending` → trang hỏi lại 3 giây một lần và kẹt vĩnh viễn ở "Đang xác nhận…".  #Huynh
    rememberIntent("intent-1", new Date(Date.now() + 5 * 60_000).toISOString());
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
    // Lỗi thật ghi nhận trên admin: chỉ dọn phía client thì bản ghi backend nằm mãi ở
    // `pending` — trang khách báo "đã huỷ" trong khi admin vẫn thấy "chờ thanh toán".
    // `orderId` trên URL MoMo chính là `payment.id`, phải gọi cancel API với đúng nó.
    expect(mockCancel).toHaveBeenCalledWith("o-1");
  });

  it("ZaloPay đá về với status khác 1 (huỷ/thất bại) thì báo KHÔNG THÀNH CÔNG, và gọi cancel bằng id đã nhớ", () => {
    // Cùng lỗi với MoMo, nặng hơn: ZaloPay không trả `payment.id` trên URL (chỉ có
    // `apptransid` đã mã hoá lại), nên chỗ duy nhất còn giữ đúng id là sessionStorage đã
    // nhớ TRƯỚC lúc rời trang sang ZaloPay — phải dùng đúng id đó để gọi cancel.  #Huynh
    rememberIntent("intent-zlp-1", new Date(Date.now() + 5 * 60_000).toISOString());
    window.history.replaceState(
      {},
      "",
      "/?tab=subscription&status=2&apptransid=260821_deadbeefcafebabedeadbeefcafebabe"
    );

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/không thành công/i);
    expect(screen.queryByText(/đang xác nhận/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem("intent")).toBeNull();
    expect(window.location.search).toBe("?tab=subscription");
    expect(mockCancel).toHaveBeenCalledWith("intent-zlp-1");
  });

  it("resultCode khác 0 và không phải huỷ thì hiện lý do MoMo trả", () => {
    window.history.replaceState({}, "", "/?tab=subscription&resultCode=1001&message=" + encodeURIComponent("Số dư không đủ"));

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Số dư không đủ");
  });

  it("resultCode=0 thì vẫn hỏi backend xác nhận, không tự nhận thành công từ URL", () => {
    // URL do người dùng sửa tay được — thành công phải do backend nói.
    rememberIntent("intent-1", new Date(Date.now() + 5 * 60_000).toISOString());
    window.history.replaceState({}, "", "/?tab=subscription&resultCode=0");
    mockIntent.mockReturnValue({ data: intentStub({ status: "pending" }) });

    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(/đang xác nhận/i);
  });


  it("bấm nút trên thẻ thì CHƯA gọi checkout — phải hỏi lại trước đã", async () => {
    // Ba thẻ gói xếp sát nhau, nút cùng cỡ cùng màu. Bấm là đi thẳng sang MoMo thì trượt
    // tay một ô đã thành một lần trả tiền cho gói không định mua.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    await userEvent.click(screen.getAllByRole("button", { name: /^nâng cấp$/i })[0]);

    expect(mockCheckout).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("hộp xác nhận nói rõ TÊN GÓI và SỐ TIỀN, không hỏi trống không", async () => {
    // Hỏi "Bạn có chắc không?" thì người dùng chỉ biết mình vừa bấm cái gì đó. Hai thứ
    // quyết định câu trả lời — mua gói nào, hết bao nhiêu — phải nằm ngay trong câu hỏi.
    render(<SubscriptionPage />, { wrapper });

    await userEvent.click(screen.getAllByRole("button", { name: /^nâng cấp$/i })[0]);

    const hop = await screen.findByRole("alertdialog");
    expect(hop).toHaveTextContent(/gói Pro/i);
    expect(hop).toHaveTextContent(/199\.000/);
  });

  it("bấm Để sau thì đóng hộp và không gọi checkout", async () => {
    render(<SubscriptionPage />, { wrapper });

    await userEvent.click(screen.getAllByRole("button", { name: /^nâng cấp$/i })[0]);
    await userEvent.click(await screen.findByRole("button", { name: /để sau/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("hộp xác nhận mở đúng gói được bấm, không phải gói đầu bảng", async () => {
    render(<SubscriptionPage />, { wrapper });

    // Thẻ trả phí thứ hai: Agency 499.000đ.
    await userEvent.click(screen.getAllByRole("button", { name: /^nâng cấp$/i })[1]);

    const hop = await screen.findByRole("alertdialog");
    expect(hop).toHaveTextContent(/gói Agency/i);
    expect(hop).toHaveTextContent(/499\.000/);
  });

  it("checkout hỏng thì đóng hộp xác nhận, để toast lỗi không nằm sau lớp phủ", async () => {
    mockCheckout.mockRejectedValue({
      response: { status: 500, data: { error: { message: "MoMo đang bận." } } },
    });

    render(<SubscriptionPage />, { wrapper });
    await nangCap();

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("MoMo đang bận."));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("xác nhận xong thì CHỈ thẻ vừa chọn quay spinner, không phải cả bảng giá", async () => {
    // Hai lần hỏng đã gặp ở đúng chỗ này: (1) `buying` lấy chung `checkout.isPending` nên
    // cả ba thẻ cùng quay; (2) khoá các thẻ còn lại bằng `disabled` khiến chúng đồng loạt
    // mờ đi — không quay spinner, nhưng nhìn thì vẫn là "cả bảng giá đang tải".  #Huynh
    mockCheckout.mockReturnValue(new Promise(() => {})); // treo mãi: giữ trạng thái đang bấm

    render(<SubscriptionPage />, { wrapper });
    await nangCap();

    // `hidden: true` vì hộp thoại đang mở đã gắn aria-hidden lên phần còn lại của trang.
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /đang mở trang thanh toán/i, hidden: true })
      ).toHaveLength(1)
    );
    // Thẻ trả phí còn lại vẫn nguyên nút bình thường, không mờ, không spinner.
    expect(
      screen.getAllByRole("button", { name: /^nâng cấp$/i, hidden: true })
    ).toHaveLength(1);
  });

  it("gói 0đ KHÔNG mua được, dù giá về dạng chuỗi Decimal", () => {
    // Lỗi thật đã gặp: backend serialize Decimal thành CHUỖI ("0.00"), mà FE khai
    // `price_monthly: number` rồi so `=== 0` → luôn sai → gói Free hiện nút "Nâng cấp qua
    // MoMo" dù chẳng có gì để trả tiền. Test cũ dùng số nên không bắt được.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    const nutFree = screen.getByRole("button", { name: /^miễn phí$/i });
    expect(nutFree).toBeDisabled();
  });

  it("gói giá dưới mức tối thiểu thì không bày nút mua, và nói rõ vì sao", () => {
    // Trước bản vá, gói 200đ vẫn hiện nút "Nâng cấp qua MoMo" bình thường. Bấm vào là
    // MoMo trả HTTP 400, và người dùng nhận về "Could not reach MoMo" — một câu vừa
    // không nói được nguyên nhân, vừa chỉ sai hướng.  #Huynh
    render(<SubscriptionPage />, { wrapper });

    expect(screen.getByRole("button", { name: /chưa mua được/i })).toBeDisabled();
    expect(screen.getByText(/ngoài khoảng thanh toán hỗ trợ/i)).toBeInTheDocument();
  });

  it("gói ngoài hạn mức không làm phát sinh thêm nút mua nào", () => {
    render(<SubscriptionPage />, { wrapper });

    // Vẫn đúng hai nút mua (Pro và Agency). Gắn nút mua vào gói 200đ là test này đổ.
    expect(screen.getAllByRole("button", { name: /^nâng cấp$/i })).toHaveLength(2);
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
