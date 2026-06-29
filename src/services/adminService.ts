import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Types - mirror backend admin schemas
// ---------------------------------------------------------------------------

export type AdminUserRole = "freelancer" | "admin";
export type AdminUserStatus = "active" | "suspended" | "deleted";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: AdminUserRole | string;
  status: AdminUserStatus | string;
  phone: string | null;
  created_at: string;
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

/** GET /admin/users - danh sách user toàn hệ thống, chỉ admin được gọi. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data } = await axiosClient.get<ApiResponse<AdminUser[]>>("/admin/users");
  return data.data ?? [];
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
