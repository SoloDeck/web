import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { PaymentIntentStatus } from "@/services/subscriptionsService";

// ---------------------------------------------------------------------------
// Types - mirror backend admin schemas
// ---------------------------------------------------------------------------

export type AdminUserRole = "freelancer" | "admin";
export type AdminUserStatus = "active" | "suspended" | "deleted";

/**
 * Nhà cung cấp AI mà backend chấp nhận.
 *
 * Phải khớp `SUPPORTED_LLM_PROVIDERS` bên backend (`src/ai/shared/constants.py`) và
 * `Literal` trong `AdminUpdateLLMProviderRequest`. Bản cũ khai `"ollama"` — backend không
 * có nên chọn nó là ăn 422 — mà lại thiếu `"openai"` là thứ backend hỗ trợ thật.  #Huynh
 */
export type LLMProvider = "groq" | "gemini" | "openai";

/**
 * KHÔNG có `llm_model`.
 *
 * Backend cố ý ghi cứng model của từng nhà cung cấp trong code — xem comment ở bảng
 * `ai_provider_configuration`: *"Model cụ thể của từng nhà cung cấp được hard-code trong
 * codebase để giảm độ phức tạp khi kiểm thử và triển khai"*. Bảng đó chỉ có đúng một cột
 * `llm_provider`; schema request lẫn response đều không hề có `llm_model`.
 *
 * Bản cũ khai thêm trường này nên giao diện gửi lên một thứ pydantic lặng lẽ vứt đi, còn
 * lúc đọc về thì hiện `undefined`.  #Huynh
 */
export type AdminLLMProviderResponse = {
  llm_provider: LLMProvider;
};

export type AdminUpdateLLMProviderPayload = {
  llm_provider: LLMProvider;
};

/** Gói của một user — backend TRẢ KÈM trong GET /admin/users, trước đây FE không khai nên vứt đi. */
export type AdminUserSubscription = {
  id: string;
  plan_id: string;
  plan_name?: string | null;
  plan_slug?: string | null;
  status: string;
  current_period_end?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: AdminUserRole | string;
  status: AdminUserStatus | string;
  phone: string | null;
  created_at: string;
  subscription?: AdminUserSubscription | null;
};

export type AdminUpdateUserPayload = {
  full_name?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
};

export type AdminPlan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: string | number;
  currency: string;
  can_use_ai: boolean;
  can_export_pdf: boolean;
  max_clients: number | null;
  max_deals: number | null;
  max_ai_generations_per_month: number;
  is_active: boolean;
  created_at: string;
};

export type AdminPlanPayload = {
  name: string;
  slug: string;
  price_monthly: string;
  currency: string;
  can_use_ai: boolean;
  can_export_pdf: boolean;
  max_clients: number | null;
  max_deals: number | null;
  max_ai_generations_per_month: number;
  is_active: boolean;
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** Backend trả danh sách có PHÂN TRANG: { data, total, page, page_size }. */
type Paginated<T> = { data: T[]; total: number; page: number; page_size: number };

/**
 * GET /admin/users — danh sách user toàn hệ thống, chỉ admin được gọi.
 *
 * BUG CŨ: hàm này khai kiểu `ApiResponse<AdminUser[]>` rồi `return data.data` — nhưng
 * backend trả về OBJECT PHÂN TRANG, không phải mảng. Nên `users` là một object, và
 * `buildAdminStats()` gọi `users.filter(...)` → TypeError → **trang Admin trắng màn**.
 *
 * Kiểu TypeScript nói dối thì compiler không cứu được: nó tin lời khai, không tin API.
 *   #Huynh
 */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data } = await axiosClient.get<ApiResponse<Paginated<AdminUser> | AdminUser[]>>(
    "/admin/users",
    { params: { page_size: 100 } }
  );
  const payload = data.data;
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

/** GET /admin/users/{id} - đọc chi tiết một user. */
export async function getAdminUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.get<ApiResponse<AdminUser>>(
    `/admin/users/${userId}`,
  );
  return data.data;
}

/** PATCH /admin/users/{id} - đổi tên, role hoặc trạng thái user. */
export async function updateAdminUser(
  userId: string,
  payload: AdminUpdateUserPayload,
): Promise<AdminUser> {
  const { data } = await axiosClient.patch<ApiResponse<AdminUser>>(
    `/admin/users/${userId}`,
    payload,
  );
  return data.data;
}

/** GET /admin/plans - danh sách gói subscription trong catalog. */
export async function listAdminPlans(): Promise<AdminPlan[]> {
  const { data } = await axiosClient.get<ApiResponse<AdminPlan[]>>("/admin/plans");
  return data.data ?? [];
}

/** POST /admin/plans - tạo gói subscription mới. */
export async function createAdminPlan(payload: AdminPlanPayload): Promise<AdminPlan> {
  const { data } = await axiosClient.post<ApiResponse<AdminPlan>>(
    "/admin/plans",
    payload,
  );
  return data.data;
}

/** PATCH /admin/plans/{id} - cập nhật toàn bộ thông tin gói. */
export async function updateAdminPlan(
  planId: string,
  payload: AdminPlanPayload,
): Promise<AdminPlan> {
  const { data } = await axiosClient.patch<ApiResponse<AdminPlan>>(
    `/admin/plans/${planId}`,
    payload,
  );
  return data.data;
}

/**
 * DELETE /admin/plans/{id} — xoá HẲN một gói chưa từng được dùng.
 *
 * Chỉ dùng cho ca "lỡ tay tạo nhầm". Gói đã có người đăng ký hoặc từng có giao dịch thì
 * backend trả 409 kèm lý do — xoá là hoá đơn cũ mất chỗ trỏ về. Đường đúng cho gói đó là
 * ngừng bán (`is_active: false`): biến khỏi bảng giá, không ai mua mới được, người đang
 * dùng giữ quyền lợi tới hết kỳ đã trả tiền.  #Huynh
 */
export async function deleteAdminPlan(planId: string): Promise<void> {
  await axiosClient.delete(`/admin/plans/${planId}`);
}

/**
 * PATCH /admin/subscriptions/{id}/override — Admin đổi gói cho một freelancer.
 *
 * Đây là cách DUY NHẤT để nâng gói: freelancer KHÔNG tự nâng cấp được, vì tự nâng cấp
 * đòi cổng thanh toán thật (VNPay/MoMo/webhook/đối soát) — nằm ngoài phạm vi đồ án.
 *
 * Luồng thật: freelancer bấm "Liên hệ nâng cấp" → admin thu tiền NGOÀI hệ thống →
 * admin vào đây bấm đổi gói. Hệ thống ghi lại ai kích hoạt, lúc nào. Đúng tinh thần
 * "sổ theo dõi, không phải cổng thanh toán".  #Huynh
 */
export async function overrideSubscription(
  subscriptionId: string,
  payload: { plan_id: string; override_expires_at?: string | null }
): Promise<unknown> {
  const { data } = await axiosClient.patch<ApiResponse<unknown>>(
    `/admin/subscriptions/${subscriptionId}/override`,
    payload
  );
  return data.data;
}

/** POST /admin/users/{id}/suspend — khoá tài khoản. */
export async function suspendAdminUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.post<ApiResponse<AdminUser>>(
    `/admin/users/${userId}/suspend`
  );
  return data.data;
}

/** POST /admin/users/{id}/reinstate — mở khoá tài khoản. */
export async function reinstateAdminUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.post<ApiResponse<AdminUser>>(
    `/admin/users/${userId}/reinstate`
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Chi phí AI + Nhật ký hệ thống
//
// Hai bảng này (ai_cost_records, audit_log_entries) và hai endpoint đọc chúng đã có
// sẵn từ lâu — nhưng KHÔNG AI GHI VÀO, nên bảng 0 dòng và màn hình luôn rỗng. Backend
// vừa được vá: mỗi lần gọi AI ghi token + chi phí ước tính; mỗi hành động admin (đổi
// gói, khoá tài khoản, tạo/sửa gói) ghi một dòng nhật ký.  #Huynh
// ---------------------------------------------------------------------------

export type AdminAiCost = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  ai_module: string;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: string | number;
  status: string;
  occurred_at: string;
};

export type AdminAiCostTotals = {
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: string | number;
};

export type AdminAiCostPage = {
  data: AdminAiCost[];
  total: number;
  page: number;
  page_size: number;
  totals: AdminAiCostTotals;
};

/** GET /admin/ai-costs — token + chi phí ước tính từng lần gọi AI, toàn hệ thống. */
export async function listAiCosts(): Promise<AdminAiCostPage> {
  const { data } = await axiosClient.get<ApiResponse<AdminAiCostPage>>("/admin/ai-costs", {
    params: { page_size: 50 },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Giao dịch thanh toán — sổ CHỈ ĐỌC của bảng `subscription_payments`
//
// Ai mua gói nào, lúc nào, bao nhiêu tiền, kết cục ra sao. Hợp đồng đã CHỐT
// (`_workspace/01_contract_admin_payments_shape.md` + `backend/contracts/openapi.yaml`):
// KHÔNG có hoàn tiền, KHÔNG có xuất file — đừng ghép hai việc đó bằng cách gọi endpoint
// khác từ phía web.  #Huynh
// ---------------------------------------------------------------------------

/**
 * Kênh thanh toán CÓ THỂ nằm trong một dòng giao dịch.
 *
 * Khớp `PaymentProvider` trong `subscription_payment.py` — enum này chỉ có ĐÚNG ba giá trị,
 * và cả ba đều đã chạy được.
 */
export type AdminPaymentProvider = "momo" | "zalopay" | "sepay";

/**
 * Kênh thanh toán LỌC ĐƯỢC — cố ý KHÁC danh sách trên.
 *
 * Router admin khai cứng `Literal["momo", "bank_transfer", "vnpay", "manual"]`
 * (`admin/api/router.py:286`), một danh sách đã lạc hậu so với chính enum của nó: hai giá
 * trị đang chạy thật là `zalopay`/`sepay` thì thiếu, còn ba giá trị có mặt thì không giá
 * trị nào sinh ra được. Gửi `zalopay` lên là ăn 422 chứ không phải "lọc ra rỗng".
 *
 * Nên tách làm hai kiểu chứ không gộp một: gộp lại thì hoặc bảng hiện sai nhãn, hoặc ô lọc
 * bắn ra request chắc chắn hỏng. Vá thật nằm ở backend — một dòng — và không thuộc đợt này.
 */
export type AdminPaymentProviderFilter = "momo" | "bank_transfer" | "vnpay" | "manual";

/**
 * Trạng thái giao dịch — dùng lại `PaymentIntentStatus` đã khai ở `subscriptionsService`
 * thay vì khai thêm một union thứ hai y hệt. Contract cố ý gộp làm MỘT vòng đời thanh
 * toán; hai bản sao thì chỉ cần một bên thêm giá trị là hai bên lặng lẽ lệch nhau.
 */
export type AdminPaymentStatus = PaymentIntentStatus;

export type AdminPayment = {
  id: string;
  user_id: string;
  /** LEFT OUTER JOIN `users` — null khi hàng user đã bị xoá. */
  user_email: string | null;
  user_full_name: string | null;
  plan_id: string;
  /** LEFT OUTER JOIN `subscription_plans` — null khi gói đã bị xoá. */
  plan_name: string | null;
  provider: AdminPaymentProvider;
  status: AdminPaymentStatus;
  /**
   * CHUỖI, không phải số. pydantic v2 tuần tự hoá `Decimal` thành `"199000.00"` — y hệt
   * `AdminAiCost.estimated_cost_usd`. Luôn `Number(...)` trước khi tính hay định dạng.
   */
  amount: string | number;
  /** ISO-4217, 3 ký tự. */
  currency: string;
  provider_reference: string | null;
  /** Null trừ khi `status === "succeeded"`. */
  paid_at: string | null;
  created_at: string;
};

export type AdminPaymentSortBy = "created_at" | "paid_at" | "amount";

export type AdminPaymentFilters = {
  status?: AdminPaymentStatus;
  provider?: AdminPaymentProviderFilter;
  /** Khớp gần đúng, không phân biệt hoa thường, trên email HOẶC họ tên người mua. */
  search?: string;
  /** ISO 8601. Chặn dưới của `created_at` (KHÔNG phải `paid_at`). */
  from_date?: string;
  /** ISO 8601. Chặn trên của `created_at`. */
  to_date?: string;
  sort_by?: AdminPaymentSortBy;
  sort_order?: "asc" | "desc";
  page?: number;
  /** Tối đa 100 — backend chặn `le=100`. */
  page_size?: number;
};

export type AdminPaymentPage = Paginated<AdminPayment>;

/**
 * GET /admin/payments — danh sách giao dịch mua gói, có phân trang PHÍA MÁY CHỦ.
 *
 * Vỏ trả về lồng `data` HAI LẦN (`ApiResponse<AdminPaymentPagedResponse>`), giống
 * `/admin/ai-costs`: `data.data` là trang, `data.data.data` mới là các dòng.
 */
export async function listAdminPayments(
  filters: AdminPaymentFilters = {},
): Promise<AdminPaymentPage> {
  const { data } = await axiosClient.get<ApiResponse<AdminPaymentPage>>("/admin/payments", {
    params: filters,
  });
  const page = data.data;
  return {
    data: page?.data ?? [],
    total: page?.total ?? 0,
    page: page?.page ?? filters.page ?? 1,
    page_size: page?.page_size ?? filters.page_size ?? 20,
  };
}

// ---------------------------------------------------------------------------
// Templates — thư viện mẫu điều khoản báo giá / hợp đồng theo nghề
// ---------------------------------------------------------------------------

export type AdminTemplateType = "proposal" | "contract";

export type AdminTemplate = {
  id: string;
  template_type: AdminTemplateType;
  name: string;
  /** Slug nghề (khớp PROFESSIONS) hoặc null = mẫu dùng chung. */
  profession: string | null;
  content: Record<string, unknown>;
  plan_tier_required: string | null;
  version_number: number;
  is_active: boolean;
  created_at: string;
};

export type AdminTemplateCreatePayload = {
  name: string;
  template_type: AdminTemplateType;
  profession?: string | null;
  content: Record<string, unknown>;
  plan_tier_required?: string | null;
  is_active?: boolean;
};

export type AdminTemplateUpdatePayload = {
  name?: string;
  profession?: string | null;
  content?: Record<string, unknown>;
  is_active?: boolean;
  plan_tier_required?: string | null;
};

export type AdminTemplateFilter = {
  template_type?: AdminTemplateType;
  profession?: string;
  is_active?: boolean;
};

/**
 * POST /admin/templates/preview — dựng TỜ GIẤY THẬT từ nội dung mẫu đang soạn.
 *
 * Gửi `content` đang gõ dở chứ không phải id: admin cần thấy kết quả TRƯỚC khi bấm Lưu. Cùng
 * một template Jinja với bản freelancer nhận và với PDF, nên cái admin thấy đúng là cái khách
 * sẽ đọc.  #Huynh
 */
export async function previewAdminTemplate(payload: {
  template_type: AdminTemplateType;
  content: Record<string, unknown>;
}): Promise<string> {
  const { data } = await axiosClient.post<ApiResponse<{ html: string }>>(
    "/admin/templates/preview",
    payload
  );
  return data.data?.html ?? "";
}

/** GET /admin/templates — thư viện mẫu, lọc theo loại/nghề/trạng thái. */
export async function listAdminTemplates(
  filter: AdminTemplateFilter = {}
): Promise<AdminTemplate[]> {
  const { data } = await axiosClient.get<ApiResponse<AdminTemplate[]>>("/admin/templates", {
    params: filter,
  });
  return data.data ?? [];
}

export async function createAdminTemplate(
  payload: AdminTemplateCreatePayload
): Promise<AdminTemplate> {
  const { data } = await axiosClient.post<ApiResponse<AdminTemplate>>(
    "/admin/templates",
    payload
  );
  return data.data;
}

export async function updateAdminTemplate(
  id: string,
  payload: AdminTemplateUpdatePayload
): Promise<AdminTemplate> {
  const { data } = await axiosClient.patch<ApiResponse<AdminTemplate>>(
    `/admin/templates/${id}`,
    payload
  );
  return data.data;
}

export type AdminAuditLog = {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_full_name: string | null;
  target_type: string | null;
  target_id: string | null;
  description: string;
  occurred_at: string;
};

/** GET /admin/audit-logs — ai làm gì, cho ai, lúc nào. */
export async function listAuditLogs(): Promise<AdminAuditLog[]> {
  const { data } = await axiosClient.get<
    ApiResponse<Paginated<AdminAuditLog> | AdminAuditLog[]>
  >("/admin/audit-logs", { params: { page_size: 50 } });
  const payload = data.data;
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

/**
 * GET /admin/ai-provider — current AI provider and model configuration.
 */
export async function getAdminLLMProvider(): Promise<AdminLLMProviderResponse> {
  const { data } = await axiosClient.get<
    ApiResponse<AdminLLMProviderResponse>
  >("/admin/ai-provider");

  return data.data;
}

/**
 * PATCH /admin/ai-provider — change the AI provider and model.
 */
export async function updateAdminLLMProvider(
  payload: AdminUpdateLLMProviderPayload,
): Promise<AdminLLMProviderResponse> {
  const { data } = await axiosClient.patch<
    ApiResponse<AdminLLMProviderResponse>
  >("/admin/ai-provider", payload);

  return data.data;
}