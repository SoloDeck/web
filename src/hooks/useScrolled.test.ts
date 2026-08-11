import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrolled } from "@/hooks/useScrolled";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, configurable: true, writable: true });
}

afterEach(() => {
  setScrollY(0);
  vi.restoreAllMocks();
});

describe("useScrolled", () => {
  it("mặc định là chưa cuộn", () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);
  });

  it("đọc vị trí cuộn SẴN CÓ ngay lúc khởi tạo", () => {
    // Trình duyệt khôi phục vị trí cuộn cũ khi F5 — lúc đó header phải có bóng ngay từ
    // khung hình đầu, không đợi người dùng cuộn thêm một nhịp nữa.
    setScrollY(200);
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(true);
  });

  it("cuộn qua ngưỡng thì bật, cuộn về đầu thì tắt", () => {
    const { result } = renderHook(() => useScrolled());

    setScrollY(200);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(result.current).toBe(true);

    setScrollY(0);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(result.current).toBe(false);
  });

  it("gỡ listener khi unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrolled());

    unmount();

    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
