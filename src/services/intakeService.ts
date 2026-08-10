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
  /** Freelancer còn nhận yêu cầu mới không. Tắt thì trang vẫn hiện hồ sơ, chỉ thay chỗ form. */
  is_active: boolean;
};

/**
 * Hồ sơ freelancer hiện trên trang chia sẻ, ĐỨNG TRƯỚC biểu mẫu tiếp nhận.
 *
 * Cố ý không có `id`: trang này chỉ mở được bằng share token. Hồ sơ công khai cũ tra theo
 * user id nên ai cũng dò được, và có dò được thì mới dựng nổi danh bạ — thứ khiến sản phẩm
 * trông như một cái sàn thay vì CRM riêng của từng freelancer. Cũng không có rating/số dự
 * án: SoloDesk không xếp hạng freelancer.  #Huynh
 */
export type PublicProfileResponse = {
  full_name: string;
  professional_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Ảnh bìa: data URL base64 hoặc link https. Null = dùng gradient sinh từ brand_color. */
  cover_url: string | null;
  /** Mã hex. Trang ghi đè biến CSS --primary bằng giá trị này nên cả trang đổi màu theo. */
  brand_color: string | null;
  skills: string[];
  portfolio_url: string | null;
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

/**
 * GET /intake/{shareToken}/profile — hồ sơ freelancer cho trang công khai, không cần đăng nhập.
 *
 * `shareToken` nhận CẢ token 43 ký tự lẫn tên đường dẫn riêng (`/thuthuy`): backend tra một
 * truy vấn cho cả hai vì slug bị chặn 32 ký tự nên không bao giờ đụng token.
 */
export async function getPublicProfile(shareToken: string): Promise<PublicProfileResponse> {
  const { data } = await axiosClient.get<ApiResponse<PublicProfileResponse>>(
    `/intake/${encodeURIComponent(shareToken)}/profile`,
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
