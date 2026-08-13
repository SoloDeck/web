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
  return useMutation({
    mutationFn: ({
      dealId,
      gapAcknowledged = false,
      qualificationId,
    }: {
      dealId: string;
      /** Người dùng đã đọc cảnh báo "chưa đủ 100 điểm" và vẫn chọn chốt. */
      gapAcknowledged?: boolean;
      /** Chốt ĐÚNG bản này. Bỏ trống thì BE chốt bản mới nhất. */
      qualificationId?: string;
    }) => saveDealQualification(dealId, { gapAcknowledged, qualificationId }),
  });
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

export type ScoreDelta = {
  previousScore: number;
  /** Tiêu chí có điểm thay đổi, xếp theo mức thay đổi lớn nhất trước. */
  changes: { label: string; diff: number }[];
};

/**
 * So bản chấm mới nhất với bản liền trước — "27 → 72 (+45)".
 *
 * Đây là thứ chứng minh vòng bổ sung–chấm lại có tác dụng THẬT, thay vì một con số tĩnh
 * người dùng phải tin. Bổ sung ngân sách rồi chấm lại mà thấy đúng "Ngân sách +25" thì họ
 * hiểu ngay cơ chế, không cần ai giải thích.
 *
 * Trả `null` khi bản mới nhất trong lịch sử KHÔNG phải bản đang hiện trên màn hình (danh
 * sách chưa kịp làm mới). Thà không hiện gì còn hơn hiện một mức chênh lệch sai — cả tính
 * năng này sinh ra để người dùng tin con số.  #Huynh
 */
export function scoreDelta(
  rows: DealQualification[] | undefined,
  currentScore: number
): ScoreDelta | null {
  const sorted = [...(rows ?? [])].sort((a, b) =>
    (b.generated_at ?? "").localeCompare(a.generated_at ?? "")
  );
  if (sorted.length < 2) return null;

  const [latest, previous] = sorted;
  if (latest.score !== currentScore) return null;

  const before = new Map(
    (previous.breakdown ?? []).map((item) => [item.key ?? item.label, item])
  );
  const changes = (latest.breakdown ?? [])
    .map((item) => {
      const prev = before.get(item.key ?? item.label);
      if (!prev) return null;
      const diff = item.points - prev.points;
      return diff === 0 ? null : { label: item.label, diff };
    })
    .filter((change): change is { label: string; diff: number } => change !== null)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return { previousScore: previous.score, changes };
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
    // BE tính lại từ `breakdown` mỗi lần đọc, nên bản đánh giá CŨ mở lại vẫn đủ phần thiếu
    // điểm. `null` chỉ xảy ra với bản quá cũ, không có cả bảng phân rã để suy ra.
    gaps: row.score_gaps ?? null,
    redFlags: row.red_flags ?? [],
  };
}
