/**
 * Danh sách tab của workspace — thứ DUY NHẤT mà route `/` và màn hình workspace cùng cần.
 *
 * Để riêng ở file không có JSX để `validateSearch` của route dùng được mà không phải import
 * màn hình: import màn hình là kéo cả workspace vào gói khởi động, đúng thứ việc tách mã
 * đang cắt.  #Huynh
 */
export type NavKey =
  | "pipeline"
  | "clients"
  | "revenue"
  | "intake-form"
  | "settings"
  | "subscription";

export const NAV_KEYS: NavKey[] = [
  "pipeline",
  "clients",
  "revenue",
  "intake-form",
  "settings",
  "subscription",
];

export type IndexSearch = {
  tab?: NavKey;
  /**
   * Mã giao dịch đang chờ MoMo xác nhận.
   *
   * PHẢI khai ở đây dù không màn hình nào điều hướng bằng nó. TanStack Router ghi đè thanh
   * địa chỉ bằng đúng những gì `validateSearch` trả về, nên tham số không được khai sẽ bị
   * XOÁ khỏi URL trước khi component kịp đọc. `SubscriptionPage` đọc `?intent=` bằng
   * `window.location.search` và ghi chú rằng "mở thẳng bằng link" là một đường được hỗ trợ —
   * nhưng đường đó chưa bao giờ chạy được, vì router đã dọn tham số đi mất.
   *
   * Phát hiện ngày 20/08/2026 khi test tay: mở link có `?intent=` mà trang không dò lần nào.
   */
  intent?: string;
};
