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
    rememberIntent("intent-1", new Date(Date.now() + 30 * 60_000).toISOString());
    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("quên thì đọc lại ra null", () => {
    rememberIntent("intent-1", new Date(Date.now() + 30 * 60_000).toISOString());
    forgetIntent();
    expect(readRememberedIntent()).toBeNull();
  });

  it("quá mốc expires_at server trả về thì coi như hết hạn", () => {
    // Lỗi thật: bỏ ngang giữa chừng thì backend không nhận IPN, intent nằm mãi ở `pending`.
    // Lần sau mở lại trang — dù chẳng bấm gì — đọc thấy id cũ vẫn tưởng có giao dịch đang chờ.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberIntent("intent-1", "2026-01-01T00:20:00Z");

    vi.setSystemTime(new Date("2026-01-01T00:25:00Z")); // sau mốc expiresAt

    expect(readRememberedIntent()).toBeNull();
    // Đọc quá hạn thì dọn luôn, để không phải tính lại hạn ở lần đọc sau.
    expect(sessionStorage.getItem("intent")).toBeNull();
  });

  it("chưa tới mốc expires_at thì vẫn còn hiệu lực, kể cả đã qua 15 phút", () => {
    // Regression cho lỗi thật đã gặp: client từng tự đặt TTL 15 phút, ngắn hơn hạn checkout
    // 30 phút thật của backend — một giao dịch chậm (16-29 phút, MoMo cần OTP/mạng chậm)
    // nhưng vẫn hợp lệ từng bị "quên" oan trước khi trang kịp quay về.  #Huynh
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberIntent("intent-1", "2026-01-01T00:29:00Z");

    vi.setSystemTime(new Date("2026-01-01T00:25:00Z")); // qua mốc 15' cũ, nhưng chưa qua hạn thật

    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("id nhớ chưa tới mốc expires_at thì vẫn còn hiệu lực", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberIntent("intent-1", new Date(Date.now() + 30 * 60_000).toISOString());

    vi.setSystemTime(new Date("2026-01-01T00:10:00Z"));

    expect(readRememberedIntent()).toBe("intent-1");
  });

  it("dữ liệu định dạng cũ (chuỗi id trần, không mốc thời gian) thì coi như hết hạn, không throw", () => {
    sessionStorage.setItem("intent", "intent-1");
    expect(readRememberedIntent()).toBeNull();
    expect(sessionStorage.getItem("intent")).toBeNull();
  });

  it("dữ liệu định dạng cũ hơn ({id, ts} không có expiresAt) thì coi như hết hạn", () => {
    sessionStorage.setItem("intent", JSON.stringify({ id: "intent-1", ts: Date.now() }));
    expect(readRememberedIntent()).toBeNull();
    expect(sessionStorage.getItem("intent")).toBeNull();
  });
});
