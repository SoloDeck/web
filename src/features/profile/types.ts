/**
 * Năm nhóm nghề nêu trong phiếu đề tài (Phieu_SU26SE083_VI.md, §Bối cảnh):
 * nhà thiết kế đồ họa, lập trình viên, chuyên viên marketing, copywriter,
 * nhiếp ảnh gia. Thêm nhóm mới thì phải bổ sung kỹ năng gợi ý tương ứng trong
 * `features/onboarding/constants.ts`, không thì onboarding không điền hộ được.
 */
export type ServiceCategory =
  | "Brand & Content Designer"
  | "Web Developer"
  | "Marketing Consultant"
  | "Photographer / Videographer"
  | "Copywriter / SEO";

/**
 * Nghề chuẩn hoá của freelancer — MIRROR danh mục BE
 * (backend/src/modules/intake_form/professions.py). BE validate slug; sai slug -> 422.
 * BE thêm/sửa nghề thì cập nhật ở ĐÂY cho khớp (chưa có GET /professions nên tạm hardcode;
 * có endpoint rồi thì fetch thay). AI dùng nghề để ước giá đúng ngành + cảnh báo scam.
 */
export const PROFESSIONS: { value: string; label: string }[] = [
  { value: "software-development", label: "Lập trình / Phát triển phần mềm" },
  { value: "ui-ux-design", label: "Thiết kế UI/UX" },
  { value: "graphic-design", label: "Thiết kế đồ hoạ" },
  { value: "digital-marketing", label: "Tư vấn Digital Marketing" },
  { value: "content-writing", label: "Viết nội dung / Copywriter" },
  { value: "photography-videography", label: "Nhiếp ảnh & Quay dựng video" },
];

export type Profile = {
  fullName: string;
  professionalTitle: string;
  /** Slug nghề chuẩn hoá (một trong PROFESSIONS). "" = chưa chọn. */
  profession: string;
  bio: string;
  avatarUrl: string;
  email: string;
  phone: string;
  skills: string[];
  portfolioUrl: string;
  // --- Diện mạo trang công khai (tab "Trang công khai" trong Cài đặt hồ sơ) ---
  /** Ảnh bìa dạng data URL đã nén ở client. "" = chưa có, trang dùng gradient theo màu. */
  coverUrl: string;
  /** Mã hex màu chủ đạo. "" = dùng tím mặc định của SoloDesk. */
  brandColor: string;
  /** Tên đường dẫn riêng, ví dụ "thuthuy" → /thuthuy. "" = chỉ dùng link token. */
  profileSlug: string;
  hourlyRate: number;
  // --- Nhận tiền: in vào thư nhắc thanh toán để khách biết chuyển vào đâu ---
  /** Mã BIN VietQR. "" = chưa chọn ngân hàng. Hiện chưa có giao diện khai (đã bỏ tab "Nhận tiền"). */
  bankCode: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  momoPhone: string;
  bankNote: string;
  // --- Mặc định khi soạn lời nhắc ---
  reminderSignature: string;
  reminderChannel: string;
  /** Giờ trong ngày (0–23) muốn gửi lời nhắc. */
  reminderHour: number | null;
  /**
   * Tài khoản đã có mật khẩu chưa — quyết định tab Bảo mật hiện "Đổi mật khẩu" (3 ô) hay
   * "Thêm mật khẩu" (2 ô).
   *
   * `false` với tài khoản tạo bằng đăng nhập Google. Mặc định `true` để lỡ backend chưa trả
   * trường này thì vẫn hiện form ĐẦY ĐỦ — thà bắt nhập thừa một ô còn hơn lỡ bỏ mất lớp kiểm
   * mật khẩu cũ của người đã có mật khẩu.  #Huynh
   */
  hasPassword: boolean;
};

/**
 * Trạng thái RỖNG trước khi `GET /users/me` trả về — cố ý không có dữ liệu giả nào.
 *
 * Bản trước điền sẵn "Minh Nguyễn" / "minh.nguyen@solodesk.space" / "0909123456" làm
 * mẫu, và `useProfile` lấy chúng làm fallback khi server trả `null`. Hậu quả thật: mọi
 * tài khoản chưa nhập số điện thoại đều gửi lên số giả DÙNG CHUNG đó, backend trả 409
 * "Phone already in use", và vì `updateMe` chạy trước nên TOÀN BỘ phần lưu còn lại
 * (bio, nghề, thông tin ngân hàng, hiện công khai) im lặng không chạy.  #Huynh
 */
export const DEFAULT_PROFILE: Profile = {
  fullName: "",
  professionalTitle: "",
  profession: "",
  bio: "",
  avatarUrl: "",
  email: "",
  phone: "",
  skills: [],
  portfolioUrl: "",
  coverUrl: "",
  brandColor: "",
  profileSlug: "",
  hourlyRate: 0,
  // Mặc định an toàn: coi như ĐÃ có mật khẩu, để form hiện đủ ô "Mật khẩu hiện tại" trong lúc
  // chưa tải xong hồ sơ. Đoán ngược lại là mời người dùng đặt mật khẩu mà không cần mật khẩu cũ.
  hasPassword: true,
  bankCode: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  momoPhone: "",
  bankNote: "",
  reminderSignature: "",
  reminderChannel: "email",
  reminderHour: null,
};
