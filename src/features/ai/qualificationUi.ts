import { Flame, Snowflake, Sun } from "lucide-react";

import type { LeadScore } from "@/features/deals/types";

/**
 * Bảng màu/nhãn cho mức đánh giá. Tách khỏi file component vì Fast Refresh chỉ hoạt
 * động khi một file chỉ export component.  #Huynh
 */
// Nhãn giữ nguyên HOT/WARM/COLD theo yêu cầu của Phiếu đề tài — KHÔNG dịch sang tiếng Việt.
// Đây là thuật ngữ nghiệp vụ bán hàng, cũng là giá trị backend dùng (`suggested_lead_score`),
// nên giữ nguyên chữ thì màn hình, API và tài liệu đề tài nói cùng một ngôn ngữ.  #Huynh
export const LEVEL_UI: Record<
  LeadScore,
  { label: string; icon: typeof Flame; badgeClass: string; scoreClass: string }
> = {
  hot: {
    label: "HOT",
    icon: Flame,
    badgeClass: "border-red-200 bg-red-50 text-red-600",
    scoreClass: "text-red-600",
  },
  warm: {
    label: "WARM",
    icon: Sun,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    scoreClass: "text-amber-700",
  },
  cold: {
    label: "COLD",
    icon: Snowflake,
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    scoreClass: "text-blue-700",
  },
};

export const WIN_UI: Record<string, { label: string; badgeClass: string; scoreClass: string }> = {
  high: {
    label: "Cao",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    scoreClass: "text-emerald-600",
  },
  medium: {
    label: "Trung bình",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    scoreClass: "text-amber-600",
  },
  low: {
    label: "Thấp",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    scoreClass: "text-rose-600",
  },
};
