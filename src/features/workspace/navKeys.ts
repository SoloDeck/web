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

export type IndexSearch = { tab?: NavKey };
