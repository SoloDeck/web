import { describe, expect, it } from "vitest";

import { scoreDelta } from "./useDealQualifications";
import type { DealQualification, QualificationScoreItem } from "@/services/dealsService";

function row(
  over: Partial<DealQualification> & { breakdown?: QualificationScoreItem[] | null }
): DealQualification {
  return {
    id: "q1",
    score: 100,
    level: "hot",
    reasoning: "",
    generated_at: "2026-08-05T10:00:00Z",
    saved_at: null,
    next_step: null,
    breakdown: null,
    score_gaps: null,
    red_flags: null,
    detected_signals: null,
    prompt_version: null,
    ...over,
  } as DealQualification;
}

function breakdown(scope: number, budget: number, timeline: number): QualificationScoreItem[] {
  return [
    { key: "scope", label: "Phạm vi công việc", points: scope, max_points: 30 },
    { key: "budget", label: "Ngân sách", points: budget, max_points: 25 },
    { key: "timeline", label: "Thời gian", points: timeline, max_points: 20 },
  ];
}

/**
 * Dải "27 → 72 (+45)" là thứ chứng minh vòng bổ sung–chấm lại có tác dụng thật. Nhưng nó
 * chỉ có giá trị khi CHẮC CHẮN đúng — hiện một mức chênh lệch sai còn tệ hơn không hiện gì,
 * vì cả tính năng sinh ra để người dùng tin con số.  #Huynh
 */
describe("scoreDelta", () => {
  it("so bản mới nhất với bản liền trước và chỉ ra tiêu chí nào lên điểm", () => {
    const rows = [
      row({
        id: "moi",
        score: 72,
        generated_at: "2026-08-13T10:00:00Z",
        breakdown: breakdown(12, 25, 20),
      }),
      row({
        id: "cu",
        score: 27,
        generated_at: "2026-08-13T09:00:00Z",
        breakdown: breakdown(12, 0, 10),
      }),
    ];

    const delta = scoreDelta(rows, 72);

    expect(delta).not.toBeNull();
    expect(delta?.previousScore).toBe(27);
    expect(delta?.changes).toEqual([
      { label: "Ngân sách", diff: 25 },
      { label: "Thời gian", diff: 10 },
    ]);
  });

  it("bỏ qua tiêu chí không đổi điểm — chỉ kể cái đã thay đổi", () => {
    const rows = [
      row({ id: "moi", score: 37, generated_at: "2026-08-13T10:00:00Z", breakdown: breakdown(12, 15, 10) }),
      row({ id: "cu", score: 22, generated_at: "2026-08-13T09:00:00Z", breakdown: breakdown(12, 0, 10) }),
    ];

    expect(scoreDelta(rows, 37)?.changes).toEqual([{ label: "Ngân sách", diff: 15 }]);
  });

  it("điểm tụt cũng phải nói ra, không chỉ khoe lúc lên", () => {
    const rows = [
      row({ id: "moi", score: 12, generated_at: "2026-08-13T10:00:00Z", breakdown: breakdown(12, 0, 0) }),
      row({ id: "cu", score: 32, generated_at: "2026-08-13T09:00:00Z", breakdown: breakdown(12, 0, 20) }),
    ];

    expect(scoreDelta(rows, 12)?.changes).toEqual([{ label: "Thời gian", diff: -20 }]);
  });

  it("lần chấm đầu tiên thì không có gì để so", () => {
    expect(scoreDelta([row({ score: 27 })], 27)).toBeNull();
    expect(scoreDelta([], 27)).toBeNull();
    expect(scoreDelta(undefined, 27)).toBeNull();
  });

  it("lịch sử chưa kịp làm mới thì THÀ KHÔNG HIỆN còn hơn hiện chênh lệch sai", () => {
    // Bản mới nhất trong danh sách (27) không phải bản đang hiện trên màn hình (72) — nghĩa
    // là cache còn cũ. So lúc này ra "27 → 72" nhưng thực chất đang so với chính nó.
    const rows = [
      row({ id: "cu-1", score: 27, generated_at: "2026-08-13T09:00:00Z", breakdown: breakdown(12, 0, 10) }),
      row({ id: "cu-2", score: 12, generated_at: "2026-08-13T08:00:00Z", breakdown: breakdown(12, 0, 0) }),
    ];

    expect(scoreDelta(rows, 72)).toBeNull();
  });

  it("bản cũ không có bảng phân rã thì vẫn so được tổng điểm", () => {
    const rows = [
      row({ id: "moi", score: 72, generated_at: "2026-08-13T10:00:00Z", breakdown: breakdown(12, 25, 20) }),
      row({ id: "cu", score: 27, generated_at: "2026-08-13T09:00:00Z", breakdown: null }),
    ];

    const delta = scoreDelta(rows, 72);

    expect(delta?.previousScore).toBe(27);
    expect(delta?.changes).toEqual([]);
  });

  it("không tin thứ tự mảng trả về — tự sắp theo thời điểm chấm", () => {
    const rows = [
      row({ id: "cu", score: 27, generated_at: "2026-08-13T09:00:00Z", breakdown: breakdown(12, 0, 10) }),
      row({ id: "moi", score: 72, generated_at: "2026-08-13T10:00:00Z", breakdown: breakdown(12, 25, 20) }),
    ];

    expect(scoreDelta(rows, 72)?.previousScore).toBe(27);
  });
});
