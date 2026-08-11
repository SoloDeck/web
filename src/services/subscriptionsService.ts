import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

/**
 * Mã gói. KHÔNG khai cứng `"free" | "pro" | "agency"` được: quản trị viên tạo được gói
 * mới với mã bất kỳ (`abc`, `combo-2026`…), nên union đó sai ngay từ lúc tính năng tạo
 * gói ra đời. Ba mã trên chỉ là ba gói seed sẵn, không phải toàn bộ tập hợp.
 */
export type PlanSlug = string;

/**
 * Hạn mức MoMo nhận cho một giao dịch:
 * https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/
 *
 * Đây là BẢN SAO, không phải nguồn sự thật — backend mới là nơi chặn thật. Bản này chỉ
 * để KHÔNG BÀY RA một cái nút chắc chắn hỏng. Hai bên lệch nhau thì backend thắng, và
 * người dùng nhận đúng câu backend trả về qua toast.
 *
 * Cách còn lại là thêm một endpoint trả hạn mức, tức một vòng request cho hai con số gần
 * như không bao giờ đổi.
 */
export const MOMO_MIN_AMOUNT_VND = 1_000;
export const MOMO_MAX_AMOUNT_VND = 50_000_000;

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

export type PaymentIntentResponse = {
  id: string;
  subscription_id: string;
  plan_id: string;
  provider: "momo";
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  payment_link: {
    type: "checkout_url" | "deep_link" | "qr_code" | "bank_transfer_instruction";
    url: string | null;
    qr_code_url: string | null;
    instructions: string | null;
  };
  provider_reference: string | null;
  paid_at: string | null;
  expires_at: string;
  failure_reason: string | null;
};

/** Giá gói ra số. Backend trả chuỗi Decimal (`"199000.00"`), đọc hỏng thì coi như 0. */
export function planPrice(plan: Pick<PlanResponse, "price_monthly">): number {
  const value = Number(plan.price_monthly);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Giá này có nằm trong khoảng MoMo nhận không.
 *
 * Chỉ hỏi cho gói CÓ PHÍ — gói 0đ không đi qua cổng thanh toán nên không chịu hạn mức
 * nào; phía gọi tự tách nhánh đó ra trước.
 */
export function isMomoPayableAmount(amount: number): boolean {
  return amount >= MOMO_MIN_AMOUNT_VND && amount <= MOMO_MAX_AMOUNT_VND;
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
  returnUrl: string;
}): Promise<PaymentIntentResponse> {
  const { data } = await axiosClient.post<ApiResponse<PaymentIntentResponse>>(
    "/subscriptions/checkout",
    { plan_id: params.planId, provider: "momo", return_url: params.returnUrl }
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
export async function getPaymentIntent(intentId: string): Promise<PaymentIntentResponse> {
  const { data } = await axiosClient.get<ApiResponse<PaymentIntentResponse>>(
    `/payments/intents/${intentId}`
  );
  return data.data;
}
