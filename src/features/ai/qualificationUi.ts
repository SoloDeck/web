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

/**
 * Ngưỡng HOT của bộ chấm điểm — cũng là tổng ba tiêu chí thiết yếu (30+25+20).
 *
 * Dưới mức này nghĩa là thiếu ít nhất một trong ba thứ "biết làm gì / có bao nhiêu tiền /
 * cần xong khi nào". Đó là lý do cảnh báo lúc chốt chia hai mức ở đúng con số này, chứ
 * không phải một ngưỡng nghĩ ra cho tròn.
 */
export const HOT_THRESHOLD = 75;

export type SaveWarningLevel = "none" | "soft" | "hard";

/**
 * Chốt bản đánh giá thiếu điểm thì cảnh báo tới mức nào.
 *
 * Tách khỏi component để test thẳng được, và để chỗ nào cần biết "lần lưu này có phải cảnh
 * báo không" thì hỏi đúng một hàm.  #Huynh
 */
export function saveWarningLevel(score: number, lostPoints: number): SaveWarningLevel {
  if (lostPoints <= 0) return "none";
  return score < HOT_THRESHOLD ? "hard" : "soft";
}

/**
 * Nhãn cho khối dữ kiện, nói đúng thứ người dùng đang tìm.
 *
 * Ở đây chứ không nằm trong file component: cả bảng chấm điểm lẫn màn Chi tiết deal đều
 * hiện dữ kiện AI bóc tách được, hai nơi phải gọi cùng một tên cho cùng một thứ.  #Huynh
 */
export const EVIDENCE_LABEL: Record<string, string> = {
  scope: "Khách cần làm gì",
  budget: "Ngân sách khách đưa ra",
  timeline: "Mốc thời gian khách nêu",
  detail: "Yêu cầu cụ thể ghi nhận được",
  context: "Bối cảnh khách hàng",
  source: "Deal đến từ đâu",
};

/**
 * Câu hiển thị khi KHÔNG tìm thấy dữ kiện cho tiêu chí đó.
 *
 * Phải nói rõ THIẾU CÁI GÌ, không phải một câu chung chung "không có dữ liệu". Người dùng
 * đọc xong phải biết ngay việc tiếp theo cần làm: hỏi khách về hạn bàn giao.  #Huynh
 */
export const EMPTY_EVIDENCE: Record<string, string> = {
  scope: "Không tìm thấy mô tả phạm vi công việc — chưa rõ khách cần làm những hạng mục gì.",
  budget: "Không tìm thấy con số ngân sách nào khách đưa ra.",
  timeline: "Không tìm thấy mốc thời gian nào — chưa rõ khách cần bàn giao khi nào.",
  detail: "Khách chưa mô tả chi tiết yêu cầu.",
  context: "Không có thông tin về ngành nghề, quy mô hay hiện trạng của khách.",
  source: "Chưa rõ deal này đến từ đâu.",
};

/** Thứ tự hiển thị 5 tiêu chí. `source` chỉ có ở thang khả năng chốt nên xếp cuối. */
export const CRITERION_ORDER = [
  "scope",
  "budget",
  "timeline",
  "detail",
  "context",
  "source",
] as const;
