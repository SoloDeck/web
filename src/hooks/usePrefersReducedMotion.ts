import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Người dùng có bật "giảm chuyển động" ở hệ điều hành không.
 *
 * Dùng để TẮT HẲN animation chạy vô hạn, không chỉ làm nó chậm lại. Các dấu `?.` là
 * để chịu được jsdom và các bản stub trong test, không phải cho trình duyệt thật.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(QUERY).matches === true,
  );

  useEffect(() => {
    const mql = window.matchMedia?.(QUERY);
    if (!mql) return;
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
