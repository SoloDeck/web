import { describe, it, expect } from "vitest";

import { savedQualifications } from "./useDealQualifications";
import type { DealQualification } from "@/services/dealsService";

function row(over: Partial<DealQualification>): DealQualification {
  return {
    id: "q1",
    score: 100,
    level: "hot",
    reasoning: "",
    generated_at: "2026-08-05T10:00:00Z",
    saved_at: null,
    next_step: null,
    breakdown: null,
    red_flags: null,
    detected_signals: null,
    prompt_version: null,
    ...over,
  } as DealQualification;
}

describe("savedQualifications", () => {
  it("bỏ qua bản chỉ mới chấm mà chưa bấm Lưu", () => {
    // Đây là cả lý do có trường `saved_at`: chấm thử rồi bỏ vẫn là một dòng, và nó KHÔNG
    // phải tài liệu. Kể hết ở tab Tài liệu thì chấm nghịch mấy lần là đẻ mấy "tài liệu".
    const rows = [row({ id: "chua-chot" }), row({ id: "da-chot", saved_at: "2026-08-05T11:00:00Z" })];

    expect(savedQualifications(rows).map((r) => r.id)).toEqual(["da-chot"]);
  });

  it("sắp theo lúc CHỐT, mới chốt trước — không theo lúc chấm", () => {
    // Chấm lại bản cũ rồi mới chốt thì bản chốt sau phải đứng trên, dù nó chấm trước.
    const rows = [
      row({ id: "cham-sau", generated_at: "2026-08-05T12:00:00Z", saved_at: "2026-08-05T12:30:00Z" }),
      row({ id: "chot-sau", generated_at: "2026-08-05T09:00:00Z", saved_at: "2026-08-05T13:00:00Z" }),
    ];

    expect(savedQualifications(rows).map((r) => r.id)).toEqual(["chot-sau", "cham-sau"]);
  });

  it("chưa tải xong hoặc không có bản nào thì trả mảng rỗng, không nổ", () => {
    expect(savedQualifications(undefined)).toEqual([]);
    expect(savedQualifications([])).toEqual([]);
    expect(savedQualifications([row({})])).toEqual([]);
  });
});
