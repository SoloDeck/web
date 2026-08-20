import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

/**
 * Mã gói. KHÔNG khai cứng `"free" | "pro" | "agency"` được: quản trị viên tạo được gói
 * mới với mã bất kỳ (`abc`, `combo-2026`…), nên union đó sai ngay từ lúc tính năng tạo
 * gói ra đời. Ba mã trên chỉ là ba gói seed sẵn, không phải toàn bộ tập hợp.
 */
export type PlanSlug = string;

/**
 * Hạn mức cho MỘT giao dịch. **Cả ba cổng đang để y hệt nhau**: 1.000đ – 50.000.000đ
 * (`momo_min/max_amount`, `zalopay_min/max_amount`, `sepay_min/max_amount` trong
 * `backend/src/config/settings.py`).
 *
 * Trước đây tên là `MOMO_*` vì chỉ có một cổng. Giữ tên đó khi đã có ba cổng là nói dối:
 * người dùng chọn SePay mà đọc thấy "hạn mức MoMo" thì không hiểu vì sao mình bị chặn.
 *
 * Đây là BẢN SAO, không phải nguồn sự thật — backend mới là nơi chặn thật. Bản này chỉ
 * để KHÔNG BÀY RA một cái nút chắc chắn hỏng. Hai bên lệch nhau thì backend thắng, và
 * người dùng nhận đúng câu backend trả về qua toast.  #Huynh
 */
export const PAYMENT_MIN_AMOUNT_VND = 1_000;
export const PAYMENT_MAX_AMOUNT_VND = 50_000_000;

export type PlanResponse = {
  id: string;
  name: string;
  slug: PlanSlug;
  /**
   * CHUỖI, không phải số: backend là `Decimal` nên serialize ra `"199000.00"` / `"0.00"`.
   *
   * Khai nhầm là `number` khiến `price_monthly === 0` LUÔN sai — gói Free hiện nút "Nâng
   * cấp qua MoMo" dù chẳng có gì để trả tiền, và giá hiện "0 đ" thay vì "Miễn phí". Dùng
   * `planPrice()` để đọc ra số, đừng so sánh trực tiếp.
   */
  price_monthly: string;
  currency: string;
  can_use_ai: boolean;
  can_export_pdf: boolean;
  max_clients: number | null;
  max_deals: number | null;
  max_ai_generations_per_month: number;
};

export type SubscriptionStatus = "active" | "past_due" | "suspended" | "cancelled";

export type SubscriptionResponse = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_slug: PlanSlug;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

/** Trạng thái một lần thanh toán. Khớp `SubscriptionPaymentStatus` bên backend. */
export type PaymentIntentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

/** Đã chốt = không đổi nữa, ngừng hỏi lại. */
export const SETTLED_PAYMENT_STATUSES: readonly PaymentIntentStatus[] = [
  "succeeded",
  "failed",
  "cancelled",
  "expired",
];

/** Cổng thanh toán. Khớp `Literal` trong `CreateSubscriptionCheckoutRequest` bên backend. */
export type PaymentProvider = "momo" | "zalopay" | "sepay";

/**
 * Hình dạng của `payment_link`. Backend khai bốn giá trị `type` nhưng **chỉ phát ra hai**
 * (`_payment_link` trong `subscriptions/schemas/response.py` chỉ có hai nhánh return):
 *
 *   `checkout_url`              — momo, zalopay. `url` là link để ĐIỀU HƯỚNG trình duyệt.
 *   `bank_transfer_instruction` — sepay.        `url` là **ẢNH PNG VietQR**, đừng điều hướng.
 *
 * CÁI BẪY: với momo/zalopay thì `instructions` KHÔNG phải câu hướng dẫn mà là **deeplink**
 * mở app (`momo://…`, `zalopay://app?…`). Render nó thành chữ là bày ra một chuỗi vô nghĩa
 * cho người dùng. Chỉ sepay mới có `instructions` là câu tiếng Việt đọc được.  #Huynh
 */
export type PaymentLink = {
  type: "checkout_url" | "deep_link" | "qr_code" | "bank_transfer_instruction";
  url: string | null;
  qr_code_url: string | null;
  instructions: string | null;
};

export type PaymentIntentResponse = {
  id: string;
  subscription_id: string;
  plan_id: string;
  provider: PaymentProvider;
  status: PaymentIntentStatus;
  /**
   * CHUỖI, không phải số — cùng lý do với `PlanResponse.price_monthly`: backend là
   * `Decimal` nên serialize ra `"199000.00"`. Dùng `intentAmount()` để đọc ra số.
   */
  amount: string;
  currency: string;
  /**
   * Mã đơn ngắn, dạng `SD` + 8 ký tự (`SD7K2M9PQR`). Người chuyển khoản phải ghi ĐÚNG mã
   * này vào nội dung, nên nó cần một ô riêng để sao chép — đừng bóc ra từ tham số `des`
   * của URL QR.
   *
   * Backend sinh cho MỌI cổng chứ không riêng sepay (`service.initiate_checkout` gọi
   * `generate_order_code()` vô điều kiện). `null` chỉ với bản ghi tạo trước khi có cột này.
   */
  order_code: string | null;
  payment_link: PaymentLink;
  provider_reference: string | null;
  paid_at: string | null;
  expires_at: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

/** Số tiền của một đơn ra số. Cùng lý do với `planPrice` — backend trả chuỗi Decimal. */
export function intentAmount(intent: Pick<PaymentIntentResponse, "amount">): number {
  const value = Number(intent.amount);
  return Number.isFinite(value) ? value : 0;
}

/** Giá gói ra số. Backend trả chuỗi Decimal (`"199000.00"`), đọc hỏng thì coi như 0. */
export function planPrice(plan: Pick<PlanResponse, "price_monthly">): number {
  const value = Number(plan.price_monthly);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Giá này có nằm trong khoảng các cổng nhận không.
 *
 * Chỉ hỏi cho gói CÓ PHÍ — gói 0đ không đi qua cổng thanh toán nên không chịu hạn mức
 * nào; phía gọi tự tách nhánh đó ra trước.
 */
export function isPayableAmount(amount: number): boolean {
  return amount >= PAYMENT_MIN_AMOUNT_VND && amount <= PAYMENT_MAX_AMOUNT_VND;
}

export async function listPlans(): Promise<PlanResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<PlanResponse[]>>("/subscriptions/plans");
  return data.data;
}

export async function getMySubscription(): Promise<SubscriptionResponse> {
  const { data } = await axiosClient.get<ApiResponse<SubscriptionResponse>>("/subscriptions/me");
  return data.data;
}

/**
 * POST /subscriptions/checkout — mở một lần thanh toán, trả về link để sang MoMo.
 *
 * `returnUrl` là nơi MoMo đá TRÌNH DUYỆT về sau khi trả tiền xong (khác `notify_url` —
 * đó là callback server-to-server, trình duyệt không tới được). Truyền URL của chính web
 * vào đây thay vì để backend dùng mặc định: mặc định trỏ tới trang landing chuyển hướng
 * sang deep link `solodesk://` của app di động, trên trình duyệt desktop là ngõ cụt.
 *
 * Backend chỉ nhận URL http(s) tuyệt đối (xem `_return_url_must_be_safe`), nên phải kèm
 * `window.location.origin`, không truyền đường dẫn tương đối.  #Huynh
 */
export async function createCheckout(params: {
  planId: string;
  provider: PaymentProvider;
  returnUrl: string;
}): Promise<PaymentIntentResponse> {
  const { data } = await axiosClient.post<ApiResponse<PaymentIntentResponse>>(
    "/subscriptions/checkout",
    // `params.provider`, KHÔNG phải chuỗi "momo" cứng. Dòng này từng ghi đè mọi lựa chọn
    // của người dùng thành momo ngay trước khi rời trình duyệt — chọn SePay vẫn ra MoMo.
    // Không test nào bắt được vì test nào cũng mock chính hàm này; chỗ canh thật nằm ở
    // `subscriptionsService.test.ts`, nơi bắt thân request đi ra bằng adapter axios.
    { plan_id: params.planId, provider: params.provider, return_url: params.returnUrl }
  );
  return data.data;
}

/**
 * GET /payments/intents/{id} — hỏi trạng thái một lần thanh toán.
 *
 * Đây mới là nguồn sự thật, KHÔNG phải tham số trên URL lúc MoMo đá về. Người dùng có thể
 * sửa tay query string, hoặc đóng tab trước khi bị chuyển hướng — trong khi tiền vẫn vào
 * qua IPN. Nên trang chỉ dùng URL để biết CẦN HỎI intent nào, còn kết quả thì hỏi backend.
 */
/**
 * POST /payments/intents/{id}/cancel — huỷ một đơn còn treo.
 *
 * Chỉ huỷ được khi đơn còn `pending`/`processing`; đã chốt rồi thì backend trả 409.
 *
 * CẢNH BÁO NGHIỆP VỤ: huỷ xong mà người dùng VẪN chuyển khoản thì tiền vào thật, nhưng
 * webhook thấy trạng thái đã khác `pending` nên coi là replay và **không kích hoạt gói**.
 * Giao diện phải nói rõ điều này trước khi cho bấm huỷ.  #Huynh
 */
export async function cancelPaymentIntent(intentId: string): Promise<PaymentIntentResponse> {
  const { data } = await axiosClient.post<ApiResponse<PaymentIntentResponse>>(
    `/payments/intents/${intentId}/cancel`
  );
  return data.data;
}

export async function getPaymentIntent(intentId: string): Promise<PaymentIntentResponse> {
  const { data } = await axiosClient.get<ApiResponse<PaymentIntentResponse>>(
    `/payments/intents/${intentId}`
  );
  return data.data;
}
