import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { HeroKanbanSim } from "./HeroKanbanSim";
import { SIM_TICK_MS } from "@/features/marketing/simulation";

/** Giả lập `matchMedia` vì jsdom không có. `reduced` quyết định bảng chạy hay đứng yên. */
function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HeroKanbanSim", () => {
  it("đẩy thẻ sang giai đoạn kế tiếp theo nhịp", () => {
    stubMatchMedia(false);
    vi.useFakeTimers();

    render(<HeroKanbanSim />);
    const before = screen.getByTestId("sim-card-s1").style.transform;

    act(() => {
      vi.advanceTimersByTime(SIM_TICK_MS);
    });

    expect(screen.getByTestId("sim-card-s1").style.transform).not.toBe(before);
  });

  it("không tạo timer khi người dùng bật giảm chuyển động", () => {
    stubMatchMedia(true);
    const spy = vi.spyOn(window, "setInterval");

    render(<HeroKanbanSim />);

    expect(spy).not.toHaveBeenCalled();
    // Vẫn phải là một bảng Kanban đủ thẻ, chỉ là không động — không phải ô trống.
    expect(screen.getByTestId("sim-card-s1")).toBeInTheDocument();
  });

  it("dọn timer khi unmount", () => {
    stubMatchMedia(false);
    vi.useFakeTimers();

    const { unmount } = render(<HeroKanbanSim />);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
