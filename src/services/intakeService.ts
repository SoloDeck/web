import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

export type IntakeFormFieldResponse = {
  id: string;
  field_key: string;
  label: string;
  placeholder: string | null;
  field_type: string;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
};

export type IntakeFormConfigResponse = {
  id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  share_url: string | null;
  fields: IntakeFormFieldResponse[];
};

export type IntakeFormFieldPayload = {
  field_key: string;
  label: string;
  placeholder?: string | null;
  field_type: string;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
};

export type IntakeFormConfigPayload = {
  title: string;
  description?: string | null;
  is_active: boolean;
  fields: IntakeFormFieldPayload[];
};

export type PublicIntakeFormFieldResponse = {
  field_key: string;
  label: string;
  placeholder: string | null;
  field_type: string;
  is_required: boolean;
};

export type PublicIntakeFormConfigResponse = {
  title: string;
  description: string | null;
  freelancer_name: string;
  fields: PublicIntakeFormFieldResponse[];
};

// Payload gửi lên endpoint public POST /api/v1/intake/{share_token}.
// `name` đang bắt buộc ở schema backend; các field còn lại validate theo config public.
export type IntakePayload = {
  name: string;
  email?: string;
  phone?: string;
  project_name?: string;
  inquiry_text?: string;
  estimated_budget?: string;
  desired_timeline?: string;
};

export type IntakeResult = {
  id: string;
  submitted_at: string;
  message: string;
};

/** POST /intake/{shareToken} — khách hàng gửi lead qua link public, không cần đăng nhập. */
export async function submitIntake(
  shareToken: string,
  payload: IntakePayload,
): Promise<IntakeResult> {
  const { data } = await axiosClient.post<ApiResponse<IntakeResult>>(
    `/intake/${encodeURIComponent(shareToken)}`,
    payload,
  );
  return data.data;
}

/** GET /intake/{shareToken}/config — lấy cấu hình public để khách hàng điền form. */
export async function getPublicIntakeFormConfig(
  shareToken: string,
): Promise<PublicIntakeFormConfigResponse> {
  const { data } = await axiosClient.get<ApiResponse<PublicIntakeFormConfigResponse>>(
    `/intake/${encodeURIComponent(shareToken)}/config`,
  );
  return data.data;
}

/** GET /intake-form — lấy cấu hình biểu mẫu của freelancer đang đăng nhập. */
export async function getIntakeFormConfig(): Promise<IntakeFormConfigResponse> {
  const { data } = await axiosClient.get<ApiResponse<IntakeFormConfigResponse>>(
    "/intake-form",
  );
  return data.data;
}

/** PUT /intake-form — lưu toàn bộ cấu hình biểu mẫu, backend sẽ replace danh sách fields. */
export async function updateIntakeFormConfig(
  payload: IntakeFormConfigPayload,
): Promise<IntakeFormConfigResponse> {
  const { data } = await axiosClient.put<ApiResponse<IntakeFormConfigResponse>>(
    "/intake-form",
    payload,
  );
  return data.data;
}
