import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrollSpy } from "@/features/marketing/hooks/useScrollSpy";

/**
 * Bản giả IntersectionObserver ĐIỀU KHIỂN ĐƯỢC.
 *
 * `test/setup.ts` cài sẵn một bản báo "đang giao nhau" ngay lúc `observe()` — tiện cho việc
 * kiểm nội dung có hiện ra không, nhưng ở đây cần tự quyết khối nào giao nhau lúc nào. Thay
 * bằng bản này theo đúng khuôn `HeroKanbanSim.test.tsx` đang dùng cho `matchMedia`.
 */
let fire: ((entries: { isIntersecting: boolean; target: Element }[]) => void) | null = null;
const disconnect = vi.fn();

function stubObserver() {
  class Controllable {
    constructor(cb: IntersectionObserverCallback) {
      fire = (entries) => cb(entries as unknown as IntersectionObserverEntry[], this as never);
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Controllable);
}

function mountSections(ids: string[]) {
  document.body.innerHTML = ids.map((id) => `<section id="${id}"></section>`).join("");
  return ids.map((id) => document.getElementById(id)!);
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  fire = null;
  disconnect.mockClear();
});

describe("useScrollSpy", () => {
  const IDS = ["mot", "hai", "ba"];

  it("mặc định là khối đầu tiên", () => {
    stubObserver();
    mountSections(IDS);
    const { result } = renderHook(() => useScrollSpy(IDS));
    expect(result.current).toBe("mot");
  });

  it("nhiều khối cùng trong tầm nhìn thì khối TRÊN CÙNG thắng", () => {
    stubObserver();
    const [, hai, ba] = mountSections(IDS);
    const { result } = renderHook(() => useScrollSpy(IDS));

    act(() => {
      fire!([
        { isIntersecting: true, target: ba },
        { isIntersecting: true, target: hai },
      ]);
    });

    // Thứ tự entry do trình duyệt quyết, không theo DOM — nên phải chọn theo index trong
    // `ids`, không phải theo thứ tự nhận được.
    expect(result.current).toBe("hai");
  });

  it("không khối nào giao nhau thì GIỮ mục đang sáng, không tắt", () => {
    stubObserver();
    const [, hai] = mountSections(IDS);
    const { result } = renderHook(() => useScrollSpy(IDS));

    act(() => fire!([{ isIntersecting: true, target: hai }]));
    expect(result.current).toBe("hai");

    // Dải số liệu / footer đi qua: không id nào giao nhau nữa.
    act(() => fire!([{ isIntersecting: false, target: hai }]));
    expect(result.current).toBe("hai");
  });

  it("ngắt observer khi unmount", () => {
    stubObserver();
    mountSections(IDS);
    const { unmount } = renderHook(() => useScrollSpy(IDS));

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it("không có khối nào trong DOM thì không dựng gì, không nổ", () => {
    stubObserver();
    const { result } = renderHook(() => useScrollSpy(IDS));

    expect(result.current).toBe("mot");
    expect(disconnect).not.toHaveBeenCalled();
  });
});
