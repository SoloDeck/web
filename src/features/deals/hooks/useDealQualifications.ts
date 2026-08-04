import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getDealQualifications,
  saveDealQualification,
  type DealQualification,
} from "@/services/dealsService";
import type { QualificationView } from "@/features/ai/components/QualificationResult";
import { LEVEL_UI } from "@/features/ai/qualificationUi";
import type { LeadScore } from "@/features/deals/types";

export const dealQualificationKeys = {
  all: ["deal-qualifications"] as const,
  forDeal: (dealId: string) => ["deal-qualifications", dealId] as const,
};

/**
 * Lịch sử chấm điểm của một deal — ĐỌC TỪ SERVER.
 *
 * Thay cho `useDealQualificationDocuments` (localStorage). Đổi máy/xoá cache không còn mất
 * căn cứ, và deal vừa tạo không "ăn" nhầm dữ liệu còn sót của deal khác.  #Huynh
 */
export function useDealQualifications(dealId?: string) {
  return useQuery({
    queryKey: dealQualificationKeys.forDeal(dealId ?? ""),
    queryFn: () => getDealQualifications(dealId as string),
    enabled: Boolean(dealId),
    staleTime: 30_000,
  });
}

/**
 * Chốt bản chấm mới nhất — đóng dấu `saved_at` để nó hiện ở tab Tài liệu.
 *
 * "Đã chấm" KHÁC "đã chốt": mọi lần chấm đều vào tab Lịch sử, chỉ bản bấm "Lưu & chuyển sang
 * Đã đánh giá" mới thành tài liệu. Không có bước này thì tab Tài liệu trống, dù giao diện đã
 * báo "đã lưu".  #Huynh
 */
export function useSaveDealQualification() {
  return useMutation({ mutationFn: (dealId: string) => saveDealQualification(dealId) });
}

/**
 * Những bản ĐÃ CHỐT, mới chốt trước — nguồn của tab Tài liệu.
 *
 * Lọc theo `saved_at` chứ đừng lấy "bản mới nhất": chấm thử rồi bỏ cũng là một dòng mới
 * nhất, và nó không phải tài liệu.  #Huynh
 */
export function savedQualifications(rows: DealQualification[] | undefined): DealQualification[] {
  return (rows ?? [])
    .filter((row) => Boolean(row.saved_at))
    .sort((a, b) => (b.saved_at ?? "").localeCompare(a.saved_at ?? ""));
}

/**
 * Chuyển bản ghi của server thành `QualificationView` — kiểu mà `QualificationResultView`
 * nhận. Nhờ vậy bản vừa chấm xong và bản đọc lại từ lịch sử hiện ra Y HỆT nhau.
 *
 * Bản ghi CŨ (trước khi BE lưu `breakdown`) sẽ không có bảng căn cứ — trả mảng rỗng, giao
 * diện tự ẩn phần đó thay vì nổ.  #Huynh
 */
export function toQualificationView(row: DealQualification): QualificationView {
  // LEVEL_UI khoá bằng CHỮ THƯỜNG ("hot"/"warm"/"cold") — đúng như kiểu `LeadScore`.
  // Bản trước tôi `.toUpperCase()` rồi ép `as LeadScore`: ép kiểu bịt miệng TypeScript, nên
  // nó không báo gì, và tới lúc chạy thì `LEVEL_UI["COLD"]` = undefined -> `.icon` nổ trắng
  // màn hình. Ép kiểu là tự nhận trách nhiệm — và tôi đã sai.  #Huynh
  const raw = (row.level ?? "warm").toLowerCase();
  const level: LeadScore = raw === "hot" || raw === "cold" ? raw : "warm";

  return {
    level,
    score: row.score,
    label: LEVEL_UI[level]?.label ?? "Trung bình",
    rationale: row.reasoning || "AI đã chấm điểm nhưng chưa đưa ra phần giải thích chi tiết.",
    recommendation: row.next_step || "",
    signals: (row.detected_signals ?? []).map((s) => s.text).filter(Boolean),
    breakdown: (row.breakdown ?? []).map((item) => ({
      key: item.key,
      label: item.label,
      points: item.points,
      max_points: item.max_points,
      reason: item.reason ?? null,
      impact: item.impact ?? null,
      evidence: item.evidence ?? null,
    })),
    win: null,
    redFlags: row.red_flags ?? [],
    price: null,
  };
}
