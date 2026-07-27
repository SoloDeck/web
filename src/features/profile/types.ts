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
  serviceCategories: string[];
  portfolioUrl: string;
  isListed: boolean;
  hourlyRate: number;
};

export const DEFAULT_PROFILE: Profile = {
  fullName: "Minh Nguyễn",
  professionalTitle: "Brand & Content Designer",
  profession: "",
  bio: "",
  avatarUrl: "",
  email: "minh.nguyen@solodesk.space",
  phone: "0909123456",
  skills: [],
  serviceCategories: [],
  portfolioUrl: "",
  isListed: true,
  hourlyRate: 350000,
};
