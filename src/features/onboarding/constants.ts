import type { ServiceCategory } from "@/features/profile/types";

/**
 * Mỗi chuyên môn kèm sẵn chức danh + kỹ năng gợi ý, để onboarding điền hộ người
 * dùng thay vì bắt họ tự gõ.
 *
 * Lưu ý: KHÔNG hỏi mức giá ở onboarding. Đã kiểm chứng trên BE — không module AI
 * nào đọc `default_hourly_rate` (lead_qualifier chỉ nhận dữ liệu của deal, và tự
 * ước lượng giá thị trường VN từ mô tả dự án). Mức giá vẫn cấu hình được ở màn
 * Cài đặt hồ sơ, đúng như phiếu đề tài yêu cầu.
 */
export type SpecializationOption = {
  id: ServiceCategory;
  label: string;
  description: string;
  skills: string[];
};

export const SPECIALIZATIONS: SpecializationOption[] = [
  {
    id: "Brand & Content Designer",
    label: "Thiết kế thương hiệu & nội dung",
    description: "Logo, bộ nhận diện, ấn phẩm truyền thông",
    skills: ["Thiết kế logo", "Nhận diện thương hiệu", "Thiết kế ấn phẩm", "Figma", "Adobe Illustrator"],
  },
  {
    id: "Web Developer",
    label: "Lập trình Web",
    description: "Website, landing page, ứng dụng web",
    skills: ["ReactJS", "NodeJS", "Responsive design", "Tích hợp API", "WordPress"],
  },
  {
    id: "Marketing Consultant",
    label: "Tư vấn Marketing",
    description: "Chiến lược, quảng cáo, tăng trưởng",
    skills: ["Chiến lược marketing", "Facebook Ads", "Google Ads", "Content marketing", "Phân tích dữ liệu"],
  },
  {
    id: "Photographer / Videographer",
    label: "Nhiếp ảnh & Quay dựng",
    description: "Chụp sản phẩm, quay phim, hậu kỳ",
    skills: ["Chụp ảnh sản phẩm", "Quay dựng video", "Hậu kỳ", "Adobe Premiere", "Lightroom"],
  },
  {
    id: "Copywriter / SEO",
    label: "Viết nội dung & SEO",
    description: "Bài viết, chuẩn SEO, nội dung website",
    skills: ["Viết content", "SEO on-page", "Nghiên cứu từ khoá", "Content strategy", "Google Analytics"],
  },
];
