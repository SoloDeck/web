import { describe, expect, it } from "vitest";

import {
  pollDeadline,
  pollIntervalMs,
  REDIRECT_POLL_MS,
  TRANSFER_POLL_CAP_MS,
} from "@/features/subscriptions/lib/pollPlan";

const T0 = Date.parse("2026-01-01T00:00:00Z");
const iso = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

describe("pollDeadline — dò tới bao giờ thì dừng", () => {
  it("cổng chuyển hướng chỉ dò 2 phút — người dùng đã trả xong mới quay về", () => {
    const deadline = pollDeadline(T0, { provider: "momo", expires_at: iso(30 * 60_000) });
    expect(deadline).toBe(T0 + REDIRECT_POLL_MS);
  });

  it("ZaloPay cũng vậy, không kéo dài vô cớ", () => {
    expect(pollDeadline(T0, { provider: "zalopay", expires_at: iso(30 * 60_000) })).toBe(
      T0 + REDIRECT_POLL_MS
    );
  });

  it("chuyển khoản thì dò tới lúc đơn hết hạn, KHÔNG cắt ở phút thứ 2", () => {
    // Đây là test bảo vệ cả tính năng: cắt ở 2 phút là mọi đơn SePay đều ra màn "hết giờ"
    // sai sự thật trong khi đơn còn sống gần nửa tiếng.
    const deadline = pollDeadline(T0, { provider: "sepay", expires_at: iso(25 * 60_000) });
    expect(deadline).toBe(T0 + 25 * 60_000);
  });

  it("expires_at xa quá thì bị kẹp trong trần 30 phút", () => {
    const deadline = pollDeadline(T0, { provider: "sepay", expires_at: iso(365 * 24 * 3600_000) });
    expect(deadline).toBe(T0 + TRANSFER_POLL_CAP_MS);
  });

  it("expires_at ở quá khứ vẫn còn sàn 2 phút, không dừng dò ngay lập tức", () => {
    // Đồng hồ máy khách chạy sai là chuyện có thật; dừng ngay thì người vừa chuyển khoản
    // xong không bao giờ thấy gói lên.
    const deadline = pollDeadline(T0, { provider: "sepay", expires_at: iso(-60 * 60_000) });
    expect(deadline).toBe(T0 + REDIRECT_POLL_MS);
  });

  it("expires_at rác thì lùi về trần, không ném lỗi", () => {
    expect(pollDeadline(T0, { provider: "sepay", expires_at: "khong-phai-ngay" })).toBe(
      T0 + TRANSFER_POLL_CAP_MS
    );
  });

  it("chưa biết cổng thì lấy mốc ngắn làm sàn", () => {
    expect(pollDeadline(T0, undefined)).toBe(T0 + REDIRECT_POLL_MS);
  });
});

describe("pollIntervalMs — thưa dần để không gõ cửa 600 lần", () => {
  it("phút đầu dò dày, vì người dùng đang nhìn màn hình", () => {
    expect(pollIntervalMs(0)).toBe(3_000);
    expect(pollIntervalMs(59_000)).toBe(3_000);
  });

  it("sau phút đầu thì thưa dần", () => {
    expect(pollIntervalMs(60_000)).toBe(5_000);
    expect(pollIntervalMs(4 * 60_000)).toBe(5_000);
    expect(pollIntervalMs(5 * 60_000)).toBe(10_000);
    expect(pollIntervalMs(29 * 60_000)).toBe(10_000);
  });
});
