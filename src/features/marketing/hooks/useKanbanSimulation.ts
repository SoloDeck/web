import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SIM_TICK_MS } from "@/features/marketing/simulation";

/**
 * Đồng hồ của bảng Kanban mô phỏng ở hero: mỗi nhịp, mọi thẻ tiến một giai đoạn.
 *
 * Hai trường hợp KHÔNG chạy timer:
 * - Người dùng bật "giảm chuyển động" → bảng đứng yên ở nhịp 0. Lúc đó nó vẫn là một
 *   bảng Kanban đủ sáu cột và đủ thẻ, chỉ là không động — chứ không phải ô trống.
 * - Tab bị ẩn → dừng hẳn. Trang giới thiệu mở nền cả ngày không có lý do gì phải
 *   chạy setInterval.
 *
 * `tickMs` có giá trị mặc định là hằng nên mảng phụ thuộc ổn định — quan trọng vì repo
 * đang bật React Compiler.  #Huynh
 */
export function useKanbanSimulation(stageCount: number, tickMs = SIM_TICK_MS): number {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced || stageCount < 1) return;

    let id: number | undefined;

    const start = () => {
      if (id !== undefined) return;
      id = window.setInterval(() => setTick((t) => (t + 1) % stageCount), tickMs);
    };
    const stop = () => {
      if (id === undefined) return;
      window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    // `id` là biến cục bộ của effect nên StrictMode gọi hai lần cũng không bỏ sót timer.
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced, stageCount, tickMs]);

  return tick;
}
