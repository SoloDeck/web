import type { ApiResponse } from "@/features/auth/types";
import axiosClient from "@/configs/axios";

/** Khớp ProfessionalProfileDTO của BE (lồng trong UserResponse). */
export type ProfessionalProfile = {
  skills: string[] | null;
  specialization: string | null;
  /** BE trả Decimal — tùy serializer có thể ra number hoặc string, nên nhận cả hai. */
  default_hourly_rate: string | number | null;
  currency: string;
  portfolio_url: string | null;
  business_name: string | null;
};

/** Khớp PreferencesDTO của BE (lồng trong UserResponse). */
export type Preferences = {
  locale: string;
  timezone: string;
  notification_channel: "email" | "in_app" | "both" | "zalo";
  theme: "light" | "dark";
};

export type UserResponse = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  profession: string | null;
  /** Headline hiện trên trang công khai — xem `UserResponse` phía backend. */
  professional_title: string | null;
  /** Diện mạo trang công khai. Thiếu 3 trường này thì F5 xong màn cấu hình mất hết. */
  cover_url: string | null;
  brand_color: string | null;
  profile_slug: string | null;
  intake_share_token: string | null;
  /**
   * Tài khoản này đã có mật khẩu chưa. Tài khoản tạo bằng đăng nhập Google thì CHƯA có.
   *
   * Là điều kiện của TÀI KHOẢN, không phải của phiên đăng nhập: người đã có mật khẩu rồi mới
   * gắn thêm Google vẫn là `true`, và vẫn phải nhập mật khẩu cũ khi đổi.
   */
  has_password: boolean;
  professional_profile: ProfessionalProfile;
  preferences: Preferences;
  payment_info: PaymentInfo;
  reminder_defaults: ReminderDefaults;
  created_at: string;
};

/** Thông tin nhận tiền — in vào thư nhắc thanh toán (QR VietQR + chuyển khoản + MoMo). */
export type PaymentInfo = {
  /** Mã BIN VietQR (ví dụ "970436" = Vietcombank). Chọn từ danh sách, không gõ tay. */
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  momo_phone_number: string | null;
  /** Ghi chú thêm (chi nhánh, lời dặn) — hiện dưới khối chính. */
  bank_account_info: string | null;
};

export type ReminderDefaults = {
  reminder_signature: string | null;
  reminder_default_channel: string | null;
  reminder_default_hour: number | null;
};

export type UpdateUserPayload = {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
};

/** PATCH /users/me/professional-profile — cấu hình AI dùng để gợi giá & chấm điểm lead. */
export type ProfessionalProfilePayload = {
  skills?: string[];
  specialization?: string;
  default_hourly_rate?: number;
  currency?: string;
  portfolio_url?: string;
  business_name?: string;
};

/** PATCH /users/me/preferences — BE chỉ nhận đúng các giá trị enum này. */
export type PreferencesPayload = {
  locale?: string;
  timezone?: string;
  notification_channel?: Preferences["notification_channel"];
  theme?: Preferences["theme"];
};

export type FreelancerProfilePayload = {
  professional_title?: string;
  /** Slug nghề chuẩn hoá (khớp PROFESSIONS). BE validate; sai slug -> 422. */
  profession?: string;
  bio?: string;
  skills?: string[];
  avatar_url?: string;
  portfolio_url?: string;
  // --- Diện mạo trang công khai ---
  cover_url?: string;
  /** Mã hex. Gửi chuỗi rỗng để bỏ màu — BE hiểu "" là None chứ không trả 422. */
  brand_color?: string;
  /** Tên đường dẫn riêng. Trùng thì BE trả 409, sai định dạng thì 422. */
  profile_slug?: string;
  // --- Nhận tiền + mặc định nhắc nhở (cùng endpoint, BE nhận thẳng vào cột) ---
  bank_code?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  momo_phone_number?: string;
  bank_account_info?: string;
  reminder_signature?: string;
  reminder_default_channel?: string;
  reminder_default_hour?: number;
};

export type ChangePasswordPayload = {
  /**
   * Bỏ trống khi tài khoản CHƯA có mật khẩu (đăng nhập bằng Google) — họ không có gì để nhập.
   * Tài khoản đã có mật khẩu thì backend vẫn bắt buộc trường này, gửi thiếu là 401.
   */
  current_password?: string;
  new_password: string;
};

/**
 * Khoá cache React Query cho `GET /users/me`.
 *
 * Đặt cạnh `getMe` để chỉ có MỘT khoá cho một tài nguyên. Trước đây mỗi nơi tự đặt một
 * khoá — `["me"]` ở thẻ link công khai, `["users","me"]` ở onboarding — nên lưu hồ sơ xong
 * invalidate một khoá thì nơi đọc khoá kia vẫn ôm dữ liệu cũ suốt 5 phút (`staleTime` mặc
 * định), và người dùng đặt tên đường dẫn xong không thấy link mới đâu.  #Huynh
 */
export const usersKeys = {
  me: ["users", "me"] as const,
};

export async function getMe(): Promise<UserResponse> {
  const { data } = await axiosClient.get<ApiResponse<UserResponse>>("/users/me");
  return data.data;
}

export async function updateMe(payload: UpdateUserPayload): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>("/users/me", payload);
  return data.data;
}

export async function updateFreelancerProfile(payload: FreelancerProfilePayload): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>("/users/me/freelancer-profile", payload);
  return data.data;
}

/**
 * PATCH /users/me/professional-profile — mức giá, chuyên môn, tên doanh nghiệp.
 * Khác `freelancer-profile` (hồ sơ hiển thị công khai): đây là dữ liệu AI dùng
 * để gợi khoảng giá, nên cần lưu server thay vì chỉ localStorage.
 */
export async function updateProfessionalProfile(
  payload: ProfessionalProfilePayload
): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>(
    "/users/me/professional-profile",
    payload
  );
  return data.data;
}

/** PATCH /users/me/preferences — ngôn ngữ, múi giờ, kênh thông báo, giao diện sáng/tối. */
export async function updatePreferences(payload: PreferencesPayload): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>(
    "/users/me/preferences",
    payload
  );
  return data.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await axiosClient.post("/users/me/change-password", payload);
}
