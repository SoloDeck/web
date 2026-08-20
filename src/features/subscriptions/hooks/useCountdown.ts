import { useEffect, useState } from "react";

/**
 * Đếm ngược tới một mốc ISO, nhịp một giây.
 *
 * Tự dừng khi về 0 thay vì để `setInterval` chạy suốt phiên: màn chuyển khoản có thể bị bỏ
 * quên trong một tab mở cả buổi, và một đồng hồ gọi `setState` mỗi giây cho tới lúc đóng
 * tab là thứ không ai nhìn thấy nhưng máy vẫn phải gánh.
 *
 * Mốc đã qua (hoặc chuỗi rác) thì trả `expired` ngay từ khung hình đầu, không đợi nhịp
 * đầu tiên — bằng không màn hình chớp "còn 00:00" một giây trước khi đổi trạng thái.
 */
export function useCountdown(deadlineIso: string | null | undefined): {
  msLeft: number;
  expired: boolean;
} {
  const deadline = deadlineIso ? Date.parse(deadlineIso) : Number.NaN;
  const compute = () => (Number.isNaN(deadline) ? 0 : Math.max(0, deadline - Date.now()));

  const [msLeft, setMsLeft] = useState(compute);

  // Đổi mốc thì tính lại NGAY TRONG RENDER, không đợi effect — bằng không đồng hồ hiện số
  // giây của đơn trước đúng một khung hình.
  //
  // `Object.is` chứ KHÔNG phải `!==`: `deadline` là `NaN` khi chuỗi ngày hỏng, mà
  // `NaN !== NaN` luôn đúng — dùng `!==` là vòng lặp render vô tận.
  const [seenDeadline, setSeenDeadline] = useState(deadline);
  if (!Object.is(seenDeadline, deadline)) {
    setSeenDeadline(deadline);
    setMsLeft(compute());
  }

  useEffect(() => {
    if (Number.isNaN(deadline)) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setMsLeft(remaining);
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return { msLeft, expired: msLeft <= 0 };
}

/** `1500000` -> `"25:00"`. Dùng cho đồng hồ đếm ngược trên màn chuyển khoản. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
