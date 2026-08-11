import { useEffect, useState } from "react";

/**
 * Trang đã cuộn quá `threshold` chưa — để thanh đầu trang đổ bóng tách khỏi nội dung.
 *
 * Đọc `window.scrollY` trong HÀM KHỞI TẠO LƯỜI của `useState`, không phải trong thân effect:
 * gọi handler một lần trong effect là `setState` thẳng trong effect, và `set-state-in-effect`
 * của eslint-plugin-react-hooks đang để mức ERROR. Hàm khởi tạo lười cũng lo luôn trường hợp
 * trình duyệt khôi phục vị trí cuộn cũ khi tải lại trang.
 *
 * `setScrolled` ghi cùng một giá trị boolean ở phần lớn sự kiện; React bỏ qua khi giá trị
 * không đổi nên không có chuyện render dồn dập.  #Huynh
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > threshold,
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
