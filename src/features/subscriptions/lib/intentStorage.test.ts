import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetIntent, readRememberedIntent, rememberIntent } from "./intentStorage";

describe("intentStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nhớ id vừa lưu, đọc lại ra đúng id đó", () => {
    rememberIntent("intent-1");
    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("quên thì đọc lại ra null", () => {
    rememberIntent("intent-1");
    forgetIntent();
    expect(readRememberedIntent()).toBeNull();
  });

  it("id nhớ đã quá 15 phút (bỏ ngang, không huỷ cũng không trả tiền) thì coi như hết hạn", () => {
    // Lỗi thật: bỏ ngang giữa chừng thì backend không nhận IPN, intent nằm mãi ở `pending`.
    // Lần sau mở lại trang — dù chẳng bấm gì — đọc thấy id cũ vẫn tưởng có giao dịch đang chờ.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberIntent("intent-1");

    vi.setSystemTime(new Date("2026-01-01T00:20:00Z")); // +20 phút, vượt TTL 15 phút

    expect(readRememberedIntent()).toBeNull();
    // Đọc quá hạn thì dọn luôn, để không phải tính lại hạn ở lần đọc sau.
    expect(sessionStorage.getItem("intent")).toBeNull();
  });

  it("id nhớ chưa tới 15 phút thì vẫn còn hiệu lực", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberIntent("intent-1");

    vi.setSystemTime(new Date("2026-01-01T00:10:00Z")); // +10 phút, trong TTL

    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("dữ liệu định dạng cũ (chuỗi id trần, không mốc thời gian) thì coi như hết hạn, không throw", () => {
    sessionStorage.setItem("intent", "intent-1");
    expect(readRememberedIntent()).toBeNull();
    expect(sessionStorage.getItem("intent")).toBeNull();
  });
});
