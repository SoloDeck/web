import { useEffect, useState, type RefObject } from "react";

/**
 * Khung nhìn hiện tại vừa được mấy cột.
 *
 * Dùng sự kiện `resize` thay cho ResizeObserver: jsdom không có ResizeObserver, mà chỉ
 * để đo lại khi đổi bề rộng cửa sổ thì `resize` là đủ — không đáng phải thêm một
 * polyfill global cho toàn bộ test suite.
 *
 * Đọc font-size ĐÃ TÍNH của thẻ `html` chứ không giả định 16px, vì repo đặt
 * `html { font-size: 105% }` nên 1rem = 16,8px. Giả định 16 là số cột sẽ sai.
 */
export function useVisibleColumns(
  ref: RefObject<HTMLElement | null>,
  colWidthRem: number,
  max: number,
): number {
  const [visible, setVisible] = useState(max);

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const fit = Math.floor(el.clientWidth / (colWidthRem * rootPx));
      // Trong jsdom `clientWidth` là 0 → kẹp về 1, không ném lỗi.
      setVisible(Math.min(max, Math.max(1, fit)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref, colWidthRem, max]);

  return visible;
}
