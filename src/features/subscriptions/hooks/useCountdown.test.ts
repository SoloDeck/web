import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatCountdown, useCountdown } from "@/features/subscriptions/hooks/useCountdown";

describe("useCountdown — đồng hồ trên màn chuyển khoản", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("đếm lùi theo từng giây", () => {
    // Mốc phải tính MỘT LẦN ngoài hàm render. Đặt `Date.now()` bên trong thì mỗi lần vẽ
    // lại mốc tự đẩy về tương lai theo đồng hồ giả, và đếm ngược đứng yên mãi mãi.
    const han = new Date(Date.now() + 60_000).toISOString();
    const hook = renderHook(() => useCountdown(han));
    expect(hook.result.current.msLeft).toBe(60_000);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(hook.result.current.msLeft).toBe(50_000);
    expect(hook.result.current.expired).toBe(false);
  });

  it("về 0 rồi thì dừng hẳn, không để đồng hồ chạy suốt phiên", () => {
    const han = new Date(Date.now() + 3_000).toISOString();
    const hook = renderHook(() => useCountdown(han));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(hook.result.current.expired).toBe(true);
    // Không còn timer nào: sau khi về 0 mà vẫn còn interval thì con số này sẽ âm.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("mốc đã qua thì hết hạn NGAY, không chớp '00:00' một giây rồi mới đổi", () => {
    const han = new Date(Date.now() - 60_000).toISOString();
    const hook = renderHook(() => useCountdown(han));
    expect(hook.result.current.expired).toBe(true);
    expect(hook.result.current.msLeft).toBe(0);
  });

  it("không có mốc hoặc mốc rác thì coi như hết hạn, không ném lỗi", () => {
    expect(renderHook(() => useCountdown(null)).result.current.expired).toBe(true);
    expect(renderHook(() => useCountdown("khong-phai-ngay")).result.current.expired).toBe(true);
  });
});

describe("formatCountdown", () => {
  it("hiện dạng phút:giây có đệm số 0", () => {
    expect(formatCountdown(25 * 60_000)).toBe("25:00");
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(9_000)).toBe("00:09");
  });

  it("số âm vẫn ra 00:00 chứ không ra '-1:-5'", () => {
    expect(formatCountdown(-5_000)).toBe("00:00");
  });
});
