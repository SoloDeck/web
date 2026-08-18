import { describe, expect, it } from "vitest";

import {
  getAiJobErrorAdvice,
  getAiJobErrorMessage,
  isAiJobErrorRetryable,
  type AiJob,
} from "./aiJobsService";

/**
 * Chuyện có thật: Groq chặn vì vượt hạn mức token mỗi phút, màn hình lại hiện "Bạn cần nâng
 * cấp gói để dùng AI" — trong khi tài khoản đang là gói Agency. Nguyên nhân: câu khuyên chỉ
 * có hai nhánh theo cờ `retryable`, nên mọi lỗi không-thử-lại-được đều bị quy về chuyện gói.
 *
 * Bộ test khoá lại việc câu khuyên phải chọn theo MÃ LỖI, và khoá luôn hai câu từng bị đảo
 * giữa RATE_LIMITED với AI_QUOTA_EXCEEDED.  #Huynh
 */

function failedJob(error: Record<string, unknown> | null): AiJob {
  return {
    id: "j1",
    type: "lead_qualifier",
    entity_type: "deal",
    entity_id: "d1",
    status: "failed",
    result: null,
    error,
    created_at: "2026-08-18T10:00:00Z",
    updated_at: "2026-08-18T10:00:05Z",
  } as AiJob;
}

describe("getAiJobErrorMessage", () => {
  it("hết lượt tháng nói đúng là hết lượt, không nói 'hệ thống đang bận'", () => {
    // Backend: RateLimitError -> RATE_LIMITED. Hai câu này từng bị gán ngược nhau, nên
    // người dùng hết hạn mức lại ngồi bấm thử lại mãi.
    const msg = getAiJobErrorMessage(failedJob({ code: "RATE_LIMITED", retryable: false }));
    expect(msg).toContain("hết lượt AI");
  });

  it("mô hình sinh lỗi thì không đổ cho hạn mức", () => {
    // Backend: AIGenerationError -> AI_QUOTA_EXCEEDED (dù tên mã nghe như hết hạn mức).
    const msg = getAiJobErrorMessage(failedJob({ code: "AI_QUOTA_EXCEEDED", retryable: true }));
    expect(msg).not.toContain("hết lượt");
  });

  it("lỗi nhà cung cấp giữ nguyên câu backend gửi, không ghi đè bằng câu chung", () => {
    // Câu của backend mới là thứ chỉ đúng thủ phạm để đọc lúc demo.
    const detail =
      "Nội dung gửi sang AI vượt hạn mức token mỗi phút của gói nhà cung cấp. " +
      "(Nhà cung cấp báo: TPM Limit 8000, Requested 8462)";
    const msg = getAiJobErrorMessage(
      failedJob({ code: "AI_PROVIDER_ERROR", message: detail, retryable: true })
    );
    expect(msg).toBe(detail);
  });

  it("không có lỗi thì trả null", () => {
    expect(getAiJobErrorMessage(failedJob(null))).toBeNull();
    expect(getAiJobErrorMessage(undefined)).toBeNull();
  });
});

describe("getAiJobErrorAdvice", () => {
  it("gói không có AI thì mới khuyên nâng cấp", () => {
    const advice = getAiJobErrorAdvice(
      failedJob({ code: "SUBSCRIPTION_REQUIRED", retryable: false })
    );
    expect(advice).toMatch(/nâng cấp|Gói dịch vụ/i);
  });

  it("nhà cung cấp AI chặn thì NÓI RÕ không phải lỗi gói", () => {
    // Đây chính là ca đã báo sai: tài khoản Agency bị bảo đi nâng gói.
    const advice = getAiJobErrorAdvice(
      failedJob({ code: "AI_PROVIDER_ERROR", retryable: true })
    );
    expect(advice).toContain("không phải gói của bạn");
    expect(advice).toMatch(/Đánh giá lại/);
  });

  it("nhà cung cấp sai cấu hình thì bảo báo quản trị viên, đừng bảo thử lại", () => {
    const advice = getAiJobErrorAdvice(
      failedJob({ code: "AI_PROVIDER_ERROR", retryable: false })
    );
    expect(advice).toContain("không phải gói của bạn");
    expect(advice).toMatch(/quản trị viên/);
    expect(advice).not.toMatch(/chờ một lát/i);
  });

  it("hết lượt tháng thì không khuyên bấm lại — bấm mấy cũng thế", () => {
    const advice = getAiJobErrorAdvice(failedJob({ code: "RATE_LIMITED", retryable: false }));
    expect(advice).not.toMatch(/Đánh giá lại/);
    expect(advice).toMatch(/kỳ sau|nâng gói/i);
  });

  it("mã lạ mà thử lại được thì khuyên thử lại", () => {
    const advice = getAiJobErrorAdvice(failedJob({ code: "SOMETHING_NEW", retryable: true }));
    expect(advice).toMatch(/Đánh giá lại/);
  });

  it("mã lạ không thử lại được thì KHÔNG bịa ra chuyện nâng gói", () => {
    const advice = getAiJobErrorAdvice(
      failedJob({ code: "INTERNAL_SERVER_ERROR", retryable: false })
    );
    expect(advice).not.toMatch(/nâng cấp|nâng gói/i);
    expect(advice).toMatch(/quản trị viên/);
  });
});

describe("isAiJobErrorRetryable", () => {
  it("chỉ đúng khi backend nói rõ retryable là true", () => {
    expect(isAiJobErrorRetryable(failedJob({ retryable: true }))).toBe(true);
    expect(isAiJobErrorRetryable(failedJob({ retryable: false }))).toBe(false);
    // Thiếu cờ thì coi như không thử lại được, đừng đoán bừa.
    expect(isAiJobErrorRetryable(failedJob({}))).toBe(false);
    expect(isAiJobErrorRetryable(undefined)).toBe(false);
  });
});
