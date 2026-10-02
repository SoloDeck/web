import type { DealDetailTab } from "@/features/deals/dealSearch";
import { getContract } from "@/services/contractsService";
import { getDeal } from "@/services/dealsService";
import { getInvoice } from "@/services/invoicesService";
import type { AppNotification } from "@/services/notificationsService";
import { getReminder, listReminders, type ReminderRecord } from "@/services/remindersService";

/**
 * Nơi một thông báo dẫn tới — càng sát chỗ cần làm càng tốt.
 *
 * Deal: kèm tab cần mở và mục cần làm nổi bật (hoá đơn bật sẵn cửa sổ, lời nhắc tô sáng).
 * Khách: trang chi tiết khách.
 */
export type NotificationTarget =
  | {
      kind: "deal";
      dealId: string;
      tab?: DealDetailTab;
      invoiceId?: string;
      reminderId?: string;
    }
  | { kind: "client"; clientId: string };

type NotificationRef = Pick<AppNotification, "type" | "entity_type" | "entity_id">;

/** Hoá đơn → deal của nó. Hoá đơn chỉ gắn hợp đồng thì đi qua hợp đồng để lấy deal. */
async function dealIdOfInvoice(invoiceId: string): Promise<string | null> {
  const invoice = await getInvoice(invoiceId);
  if (invoice.deal_id) return invoice.deal_id;
  if (invoice.contract_id) return (await getContract(invoice.contract_id)).deal_id;
  return null;
}

/**
 * Một lời nhắc → trang chứa nó. Lời nhắc về deal, hoá đơn, hợp đồng đều hiện trong tab Nhắc
 * nhở của deal (xem `listDealReminders`), nên cả ba cùng mở tab đó và tô sáng đúng dòng.
 */
async function targetOfReminder(reminder: ReminderRecord): Promise<NotificationTarget | null> {
  const focus = { tab: "reminders" as const, reminderId: reminder.id };
  switch (reminder.target_type) {
    case "deal":
      return { kind: "deal", dealId: reminder.target_id, ...focus };
    case "client":
      return { kind: "client", clientId: reminder.target_id };
    case "invoice": {
      const dealId = await dealIdOfInvoice(reminder.target_id);
      return dealId ? { kind: "deal", dealId, ...focus } : null;
    }
    case "contract": {
      const contract = await getContract(reminder.target_id);
      return { kind: "deal", dealId: contract.deal_id, ...focus };
    }
    default:
      return null;
  }
}

/** Số lời nhắc tối đa thử khi dò đích cho thông báo "chờ duyệt" kiểu cũ. */
const MAX_FALLBACK_TRIES = 5;

/**
 * Lời nhắc chờ duyệt lâu nhất — cho thông báo "chờ duyệt" kiểu CŨ.
 *
 * Trước khi backend gộp thông báo theo từng deal, nó gộp cả người dùng làm một và không gắn id
 * nào. Những thông báo đó vẫn nằm trong chuông; bấm vào thì dẫn tới lời nhắc chờ lâu nhất thay
 * vì không đi đâu.
 */
async function oldestAwaitingApproval(): Promise<NotificationTarget | null> {
  const pending = await listReminders({ status: "pending" });
  const awaiting = pending
    .filter((reminder) => reminder.requires_approval)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  // Lời nhắc chờ lâu nhất hay chính là lời nhắc của deal đã XOÁ từ lâu (xoá deal trước khi có
  // bản sửa huỷ lời nhắc theo). Lấy nó là lần nào bấm cũng ra trang "Không tìm thấy dự án" —
  // nên thử lần lượt, bỏ qua cái nào mở không được. Chặn ở 5 để một cú bấm không bắn cả chục
  // request.
  for (const reminder of awaiting.slice(0, MAX_FALLBACK_TRIES)) {
    try {
      const target = await targetOfReminder(reminder);
      if (target?.kind === "deal") await getDeal(target.dealId);
      if (target) return target;
    } catch {
      // Đối tượng hoặc deal đã bị xoá — thử lời nhắc kế tiếp.
    }
  }
  return null;
}


/**
 * Từ một thông báo, tìm ra trang cần mở.
 *
 * Trước đây chuông chỉ biết `entity_type === "deal"`. Thông báo hoá đơn quá hạn (entity là
 * HOÁ ĐƠN), bốn loại `reminder_*` (entity là LỜI NHẮC) và "N lời nhắc chờ duyệt" (không có id)
 * bấm vào thì chuông đóng lại rồi thôi — người dùng phải tự mò.  #Huynh
 *
 * Không cần backend đổi API: hoá đơn đã có `deal_id`, lời nhắc đã có `target_type/target_id`.
 * Chỉ tốn thêm một hai lượt GET lúc bấm.
 *
 * Trả `null` khi không còn chỗ nào để đi. Ném lỗi (thường 404) khi thứ được nhắc tới đã bị xoá.
 */
export async function resolveNotificationTarget(
  notification: NotificationRef
): Promise<NotificationTarget | null> {
  const id = notification.entity_id;

  switch (notification.entity_type) {
    case "deal":
      if (!id) return null;
      // "N lời nhắc chờ duyệt" gộp theo deal → mở thẳng tab Nhắc nhở để duyệt.
      return notification.type === "reminder_drafted"
        ? { kind: "deal", dealId: id, tab: "reminders" }
        : { kind: "deal", dealId: id };
    case "client":
      return id ? { kind: "client", clientId: id } : null;
    case "invoice": {
      if (!id) return null;
      const dealId = await dealIdOfInvoice(id);
      // Hoá đơn quá hạn: bật sẵn chính hoá đơn đó để ghi nhận thu tiền hay xem lại ngay.
      return dealId ? { kind: "deal", dealId, tab: "documents", invoiceId: id } : null;
    }
    case "reminder":
      return id ? targetOfReminder(await getReminder(id)) : oldestAwaitingApproval();
    default:
      return null;
  }
}
