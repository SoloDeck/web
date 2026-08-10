import { useEffect, useState } from "react";

/**
 * Id của khối đang nằm trong tầm nhìn — để thanh điều hướng làm sáng đúng mục.
 *
 * `rootMargin` cắt vùng quan sát còn một dải hẹp ở gần đỉnh màn hình: `-64px` phía trên là
 * đúng chiều cao navbar (`h-16`), `-60%` phía dưới thu vùng còn khoảng 1/3 trên. Không thu
 * lại thì hai khối cùng nằm trong tầm nhìn suốt và mục sáng nhảy loạn khi cuộn.
 *
 * Khi không khối nào giao nhau — lúc dải số liệu (không có id, không có trong menu) hay
 * footer đi qua — thì GIỮ NGUYÊN mục đang sáng. Trả `null` ở những lúc đó sẽ làm thanh menu
 * nhấp nháy tắt/bật, tệ hơn hẳn việc để mục cũ sáng thêm một quãng.  #Huynh
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(() => ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Tập id đang giao nhau, giữ trong closure của effect chứ KHÔNG dùng ref: đọc/ghi
    // `ref.current` ngoài effect là thứ `react-hooks/refs` chặn, mà ở đây cũng không cần —
    // tập này chỉ sống đúng bằng vòng đời của observer.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // CHỈ đọc `isIntersecting` và `target`. Bản giả trong `test/setup.ts` dựng entry
          // đúng hai trường đó; đụng tới `boundingClientRect` là ném lỗi ở mọi bài test.
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // Khối nằm trên cùng thắng. Thứ tự trong `ids` trùng thứ tự trong DOM nên so index
        // là đủ — không phải đo toạ độ.
        const top = ids.find((id) => visible.has(id));
        if (top) setActiveId(top);
      },
      { rootMargin: "-64px 0px -60% 0px", threshold: 0 },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
