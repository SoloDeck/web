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
  /**
   * Số tệp khách SẮP tải lên ngay sau khi phiếu được tạo.
   *
   * Backend dùng con số này để quyết định lúc nào gửi thư báo deal mới cho freelancer: có
   * tệp thì hoãn một nhịp cho tệp lên xong rồi mới đếm, không thì gửi ngay. Số tệp in
   * trong thư luôn được backend đếm lại từ DB, không tin con số này.
   */
  attachment_count?: number;
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

/**
 * POST /intake/{shareToken}/{intakeId}/attachments — khách gửi kèm tệp cho yêu cầu vừa gửi.
 *
 * Gọi SAU `submitIntake`, mỗi tệp một lần: tệp phải gắn vào phiếu nên phải có id phiếu
 * trước. Trước đây form có khu kéo-thả tệp nhưng chẳng ai gửi tệp đi — khách kéo vào, bấm
 * gửi, tưởng xong, thực tế tệp bị vứt.  #Huynh
 */
export async function uploadIntakeAttachment(
  shareToken: string,
  intakeId: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await axiosClient.post(
    `/intake/${encodeURIComponent(shareToken)}/${encodeURIComponent(intakeId)}/attachments`,
    form,
  );
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
