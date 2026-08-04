import { Code2, Megaphone, Palette, PenLine, TrendingUp } from "lucide-react";

/**
 * Năm nhóm dịch vụ ở màn tìm freelancer.
 *
 * Trước đây khai cục bộ trong `routes/find-freelancer.tsx`. Tách ra vì trang hồ sơ công
 * khai cũng cần đổi id sang nhãn tiếng Việt — để nguyên trong file route thì trang kia
 * phải import từ một route, hoặc tệ hơn là chép lại bảng nhãn thành hai bản rồi lệch nhau.
 *
 * `id` DÙNG ĐÚNG slug của backend (`GET /public/freelancers/categories`). Trước đây FE
 * tự đặt `dev` rồi phải có một bảng ánh xạ để dịch ngược lại thành `programming` —
 * một tầng thừa tự gây ra, đã bỏ.  #Huynh
 */
export const CATEGORIES = [
  {
    id: "design",
    label: "Thiết kế",
    desc: "UI/UX, Logo, Đồ họa, Video",
    Icon: Palette,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
    selectedBg: "bg-violet-500/10",
    selectedBorder: "border-violet-500",
  },
  {
    id: "programming",
    label: "Lập trình",
    desc: "Web, Mobile, Backend, AI",
    Icon: Code2,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    selectedBg: "bg-blue-500/10",
    selectedBorder: "border-blue-500",
  },
  {
    id: "marketing",
    label: "Marketing",
    desc: "SEO, Ads, Social Media",
    Icon: Megaphone,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    selectedBg: "bg-orange-500/10",
    selectedBorder: "border-orange-500",
  },
  {
    id: "content",
    label: "Nội dung",
    desc: "Copywriting, Blog, Kịch bản",
    Icon: PenLine,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    selectedBg: "bg-green-500/10",
    selectedBorder: "border-green-500",
  },
  {
    id: "consulting",
    label: "Tư vấn",
    desc: "Kinh doanh, Tài chính, Pháp lý",
    Icon: TrendingUp,
    iconColor: "text-teal-500",
    iconBg: "bg-teal-500/10",
    selectedBg: "bg-teal-500/10",
    selectedBorder: "border-teal-500",
  },
];

/** Đổi id nhóm dịch vụ sang nhãn tiếng Việt. */
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);
