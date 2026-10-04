import { useEffect, useState } from "react";

/**
 * Giá trị `value` sau khi đứng yên `delay` ms. Gõ tới đâu bắn request tới đó là mỗi chữ cái một lượt
 * mạng — dùng giá trị đã trì hoãn để làm khoá truy vấn: gõ xong một email là đúng MỘT request.
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
