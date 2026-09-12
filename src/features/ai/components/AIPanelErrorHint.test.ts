import { describe, expect, it } from "vitest";
import { getErrorHint } from "./AIPanel";

/**
 * Câu báo lỗi của bảng AI.
 *
 * Backend gói lỗi thành `{ success, code, error: { message, code } }` — chữ giải thích nằm ở
 * `error.message`. Bản cũ đọc `data.message` rồi `data.detail`, cả hai đều không tồn tại nên
 * lúc nào cũng `undefined`, và người dùng nhận đúng một câu cụt: "Hệ thống báo lỗi 502."
 * Không biết là hết hạn mức, sai khoá API, hay nhà cung cấp quá tải; không biết nên chờ hay
 * nên đổi cách. Hàm đọc đúng đường đã có sẵn trong repo (`lib/api-error`), chỉ là panel AI
 * không dùng.  #Huynh
 */

function loi(status: number, message?: string) {
  return {
    response: {
      status,
      data: {
        success: false,
        code: status,
        error: message ? { message, code: "AI_QUOTA_EXCEEDED" } : undefined,
      },
    },
  };
}

describe("getErrorHint", () => {
  it("hiện CÂU backend gửi kèm, không phải mã HTTP trần", () => {
    expect(getErrorHint(loi(502, "Nhà cung cấp AI đang từ chối yêu cầu."))).toBe(
      "Nhà cung cấp AI đang từ chối yêu cầu."
    );
  });

  it("409 có lý do thì nói lý do", () => {
    expect(getErrorHint(loi(409, "Object storage chưa được cấu hình."))).toBe(
      "Object storage chưa được cấu hình."
    );
  });

  it("backend không nói được gì thì có câu tiếng Việt thay thế, không bày con số cho người dùng", () => {
    const hint = getErrorHint(loi(500));
    expect(hint).toBe("Không tạo được tác vụ AI. Bạn thử lại sau ít phút nhé.");
    expect(hint).not.toContain("500");
  });

  it("402 và 429 vẫn giữ câu riêng — hai lỗi này nói về GÓI, không phải về AI", () => {
    expect(getErrorHint(loi(402, "Payment required"))).toMatch(/nâng cấp/i);
    expect(getErrorHint(loi(429, "Too many requests"))).toMatch(/hết lượt AI/i);
  });

  it("mất mạng thì nói mất mạng", () => {
    expect(getErrorHint({ code: "ECONNABORTED" })).toMatch(/chờ quá lâu/i);
    expect(getErrorHint(new Error("Network Error"))).toMatch(/không kết nối được/i);
  });
});
