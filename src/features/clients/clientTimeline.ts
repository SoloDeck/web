import type { DealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import type { Deal } from "@/features/deals/types";

/**
 * Gộp mọi thứ đã xảy ra với MỘT khách hàng thành một dòng thời gian.
 *
 * Trước đây "Lịch sử tương tác" chỉ hiện những dòng freelancer tự gõ tay, trong khi mọi việc
 * thật sự đã làm với khách — gửi báo giá, khách chấp nhận, ký hợp đồng, thu tiền — lại nằm rải
 * trong lịch sử của từng deal. Nhìn vào hồ sơ khách thì thấy gần như trống, dù đã chạy với họ
 * ba dự án.
 *
 * MỘT KHÁCH CÓ NHIỀU DEAL, nên mỗi dòng phải nói rõ nó thuộc dự án nào — bằng không hai dự án
 * chạy song song trộn vào nhau thành một mớ không đọc được. Đó cũng là lý do các mốc lấy từ
 * deal (mở dự án, đóng dự án) được ghi kèm tên dự án chứ không gộp chung.
 *
 * Hàm thuần, không đọc localStorage hay gọi API — dữ liệu do nơi gọi đưa vào, để kiểm được
 * trực tiếp.  #Huynh
 */

export type TimelineSource = "comm_log" | "deal";

export type TimelineItem = {
  id: string;
  /** ISO. Dùng để xếp và để hiện giờ. */
  at: string;
  text: string;
  source: TimelineSource;
  /** Kênh liên hệ (chỉ có ở dòng tự ghi). */
  channel?: string;
  /** Dự án sinh ra dòng này — `undefined` với dòng tự ghi cho khách nói chung. */
  dealId?: string;
  dealTitle?: string;
};

export type CommLogLike = {
  id: string;
  channel: string;
  summary: string;
  communicated_at: string;
};

/** Ngày hợp lệ mới vào dòng thời gian — một `at` rác đẩy cả danh sách lộn xộn. */
function hopLe(value: string | null | undefined): value is string {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function buildClientTimeline(input: {
  commLogs: CommLogLike[];
  deals: Pick<Deal, "id" | "projectType" | "createdAt">[];
  /** Lịch sử cục bộ của từng deal, tra theo `deal.id`. */
  dealHistories: Record<string, DealHistoryEntry[]>;
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const log of input.commLogs) {
    if (!hopLe(log.communicated_at)) continue;
    items.push({
      id: `log-${log.id}`,
      at: log.communicated_at,
      text: log.summary,
      source: "comm_log",
      channel: log.channel,
    });
  }

  for (const deal of input.deals) {
    const tenDuAn = deal.projectType;

    if (hopLe(deal.createdAt)) {
      items.push({
        id: `deal-open-${deal.id}`,
        at: deal.createdAt,
        text: "Mở dự án mới với khách hàng này.",
        source: "deal",
        dealId: deal.id,
        dealTitle: tenDuAn,
      });
    }

    for (const entry of input.dealHistories[deal.id] ?? []) {
      if (!hopLe(entry.date)) continue;
      items.push({
        id: `deal-${deal.id}-${entry.id}`,
        at: entry.date,
        text: entry.text,
        source: "deal",
        channel: entry.channel,
        dealId: deal.id,
        dealTitle: tenDuAn,
      });
    }
  }

  // Mới nhất lên đầu. So sánh theo MỐC THỜI GIAN thật chứ không so chuỗi: `communicated_at`
  // và `date` của deal không cùng một định dạng ISO (một cái có mili giây, một cái không), nên
  // `localeCompare` xếp sai ngay khi hai nguồn trộn vào nhau.
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
