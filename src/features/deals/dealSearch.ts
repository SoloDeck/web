/**
 * Tham số trên URL của trang chi tiết deal: `/deals/<id>?tab=reminders&reminder=<id>`.
 *
 * Để một thông báo trên chuông mở THẲNG chỗ cần làm, không chỉ mở trang deal rồi bắt người
 * dùng tự tìm: "hoá đơn quá hạn" bật sẵn hoá đơn đó, "lời nhắc chờ duyệt" mở tab Nhắc nhở và
 * tô sáng đúng lời nhắc.  #Huynh
 *
 * File nhỏ, không import gì nặng: route `deals.$dealId.tsx` dùng nó trong `validateSearch`, mà
 * route cố ý không kéo mã màn hình vào (tách gói theo route).
 */

export const DEAL_DETAIL_TABS = ["overview", "tasks", "documents", "reminders", "history"] as const;

export type DealDetailTab = (typeof DEAL_DETAIL_TABS)[number];

export type DealSearch = {
  tab?: DealDetailTab;
  /** Hoá đơn cần mở sẵn cửa sổ xem. Trang tự bỏ tham số này đi sau khi đã mở. */
  invoice?: string;
  /** Lời nhắc cần tô sáng trong tab Nhắc nhở. */
  reminder?: string;
};

/** Đọc query string thành `DealSearch`, bỏ qua mọi giá trị lạ (URL do người gõ tay cũng được). */
export function parseDealSearch(search: Record<string, unknown>): DealSearch {
  const tab = DEAL_DETAIL_TABS.find((value) => value === search.tab);
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);
  return { tab, invoice: text(search.invoice), reminder: text(search.reminder) };
}
