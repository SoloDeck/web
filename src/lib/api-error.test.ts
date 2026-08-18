import { describe, expect, it } from "vitest";

import {
  getApiErrorCode,
  getApiErrorDetail,
  getApiErrorMessage,
  getApiErrorStatus,
} from "./api-error";

/**
 * Bấm xoá một hoá đơn nháp, màn hình hiện đúng dòng "An unexpected error occurred" — tiếng
 * Anh, và không nói được hỏng ở đâu. Đó là câu backend trả cho MỌI lỗi 500 chưa phân loại,
 * nên nó lọt ra toast là chuyện sẽ còn xảy ra ở mọi luồng khác.
 *
 * Bộ test khoá lại: câu chung của backend không bao giờ được thắng câu tiếng Việt mà nơi gọi
 * đã chuẩn bị.  #Huynh
 */

function apiError(error: Record<string, unknown>, status = 500) {
  return { response: { status, data: { error } } };
}

describe("getApiErrorMessage", () => {
  it("câu chung vô nghĩa của backend bị thay bằng câu tiếng Việt của nơi gọi", () => {
    const err = apiError({ message: "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" });
    expect(getApiErrorMessage(err, "Không thể xóa bản nháp.")).toBe("Không thể xóa bản nháp.");
  });

  it("thừa khoảng trắng quanh câu chung vẫn bị nhận ra", () => {
    const err = apiError({ message: "  An unexpected error occurred  " });
    expect(getApiErrorMessage(err, "Câu dự phòng")).toBe("Câu dự phòng");
  });

  it("câu backend nói rõ nguyên nhân thì GIỮ, đừng ghi đè", () => {
    // Lỗi nghiệp vụ backend viết sẵn tiếng Việt — đúng thứ người dùng cần đọc.
    const err = apiError(
      { message: "Hoá đơn này đã có ghi nhận thanh toán nên không xoá được.", code: "BUSINESS_RULE_VIOLATION" },
      409
    );
    expect(getApiErrorMessage(err, "Không thể xóa bản nháp.")).toContain("ghi nhận thanh toán");
  });

  it("lỗi mạng (không có response) thì dùng câu dự phòng", () => {
    expect(getApiErrorMessage(new Error("Network Error"), "Mất kết nối")).toBe("Mất kết nối");
    expect(getApiErrorMessage(undefined, "Mất kết nối")).toBe("Mất kết nối");
  });

  it("message rỗng hoặc toàn khoảng trắng cũng dùng câu dự phòng", () => {
    expect(getApiErrorMessage(apiError({ message: "" }), "Dự phòng")).toBe("Dự phòng");
    expect(getApiErrorMessage(apiError({ message: "   " }), "Dự phòng")).toBe("Dự phòng");
  });
});

describe("getApiErrorStatus / getApiErrorCode", () => {
  it("đọc được mã HTTP và mã lỗi nghiệp vụ", () => {
    const err = apiError({ code: "SUBSCRIPTION_REQUIRED" }, 402);
    expect(getApiErrorStatus(err)).toBe(402);
    expect(getApiErrorCode(err)).toBe("SUBSCRIPTION_REQUIRED");
  });

  it("không có thì trả undefined chứ không đoán bừa", () => {
    expect(getApiErrorStatus(new Error("x"))).toBeUndefined();
    expect(getApiErrorCode(apiError({ message: "chỉ có message" }))).toBeUndefined();
  });
});

describe("getApiErrorDetail", () => {
  it("lấy đúng lời giải thích của một trường trong lỗi 422", () => {
    const err = apiError(
      {
        message: "Request validation failed",
        details: [{ field: "body.email", message: "Value error, Email không hợp lệ" }],
      },
      422
    );
    // Pydantic dán sẵn "Value error, " — phải cắt đi mới đưa lên màn hình được.
    expect(getApiErrorDetail(err, "email")).toBe("Email không hợp lệ");
  });

  it("trường không có trong details thì trả undefined", () => {
    const err = apiError({ details: [{ field: "body.email", message: "sai" }] }, 422);
    expect(getApiErrorDetail(err, "phone")).toBeUndefined();
  });
});
