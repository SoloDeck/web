import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Types - mirror backend admin schemas
// ---------------------------------------------------------------------------

export type AdminUserRole = "freelancer" | "admin";
export type AdminUserStatus = "active" | "suspended" | "deleted";

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
