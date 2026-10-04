import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";
import { ngayChoApi } from "@/lib/ngayApi";
import { formatTaxRatePercent } from "@/features/deals/taxRate";
import type { PaymentReminderInfo } from "@/services/invoicesService";

/**
 * Tên và nội dung của một hóa đơn ở màn chi tiết deal — phần THUẦN, không dính React.
 *
 * Tách khỏi `DealDetailPage.tsx` vì hai lẽ: file đó đã hơn 3.600 dòng nên không ai kiểm nổi
 * mấy quy tắc này, và một file component mà export hàm dùng chung thì hỏng nạp nóng lúc dev.
 *
 * Backend đã có mã hóa đơn riêng (`INV-2026...`) để đối soát. Chỗ này chỉ lo cái tên DỄ ĐỌC
 * mà freelancer nhìn thấy, lưu ké vào dòng đầu của `notes` theo dạng `"Hóa đơn: <tên>"`.
 * #Huynh
 */

export type InvoiceComposerClient = {
  name: string;
  email: string | null;
  phone: string | null;
};

export type InvoiceDraftState = {
  title: string;
  description: string;
  amount: string;
  taxRate: string;
  dueDate: string;
  notes: string;
};

export type InvoiceTone = "formal" | "friendly";

// Thân hàm chuyển sang `ngayChoApi` (giờ địa phương). `toISOString()` quy về UTC nên với
// người dùng UTC+7, từ 0h đến 7h sáng mọi hạn thanh toán đều lùi một ngày.  #Huynh
const toApiDateValue = ngayChoApi;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function extractInvoiceTitle(notes?: string | null): { title: string | null; body: string } {
  const value = notes?.trim() ?? "";
  const [firstLine = "", ...rest] = value.split(/\r?\n/);
  const match = firstLine.match(/^Hóa đơn:\s*(.+)$/i);
  if (!match) return { title: null, body: value };
  return {
    title: match[1].trim(),
    body: rest.join("\n").replace(/^\s+/, ""),
  };
}

export function composeInvoiceNotes(title: string, body: string): string {
  return `Hóa đơn: ${title.trim() || "Thanh toán dự án"}\n\n${body.trim()}`;
}

const TITLE_NUMBER_RE = /^Thanh toán đợt\s+(\d+)$/i;

/** Xếp hóa đơn theo THỜI GIAN tạo (cũ nhất trước). Thiếu `created_at` thì giữ nguyên thứ tự gốc. */
function oldestFirst(invoices: InvoiceResponse[]): InvoiceResponse[] {
  return invoices
    .map((invoice, position) => ({ invoice, position }))
    .sort((a, b) => {
      const ta = a.invoice.created_at ?? "";
      const tb = b.invoice.created_at ?? "";
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.position - b.position;
    })
    .map((item) => item.invoice);
}

/**
 * Tên của MỌI hóa đơn trong deal, tính một lượt từ cũ đến mới.
 *
 * - Hóa đơn đã có tên lưu trong ghi chú thì dùng đúng tên đó.
 * - Chưa có tên thì là "Thanh toán đợt N", với N = (số lớn nhất đang có HOẶC số hóa đơn đứng
 *   trước nó, lấy số nào lớn hơn) + 1. Nhờ vậy tên không bao giờ trùng tên đã có, kể cả khi
 *   freelancer đã tự đặt số nhảy cóc ("đợt 3" khi mới có hai hóa đơn).
 *
 * KHÔNG dựa vào vị trí trong mảng: API trả hóa đơn MỚI NHẤT TRƯỚC, nên vị trí 0 luôn là hóa
 * đơn vừa tạo — và nó cứ ra "đợt 1" trùng đợt 1 đã gửi, bắt freelancer sửa tay "2", "3"... mỗi
 * lần.  #Huynh
 */
function labelInvoices(invoices: InvoiceResponse[]): Map<string, string> {
  const labels = new Map<string, string>();
  let maxNumber = 0;
  oldestFirst(invoices).forEach((invoice, before) => {
    const title =
      extractInvoiceTitle(invoice.notes).title ?? `Thanh toán đợt ${Math.max(maxNumber, before) + 1}`;
    labels.set(invoice.id, title);
    const match = title.match(TITLE_NUMBER_RE);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  });
  return labels;
}

/** Số cho hóa đơn MỚI (đứng sau tất cả): số lớn nhất đang có, hoặc số hóa đơn hiện có, + 1. */
export function nextInvoiceNumber(invoices: InvoiceResponse[]): number {
  let maxNumber = 0;
  labelInvoices(invoices).forEach((title) => {
    const match = title.match(TITLE_NUMBER_RE);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  });
  return Math.max(maxNumber, invoices.length) + 1;
}

/** Tên hiển thị của một hóa đơn — danh sách và hộp thoại soạn đều lấy từ đây nên luôn khớp. */
export function getInvoiceDisplayTitle(invoice: InvoiceResponse, invoices: InvoiceResponse[]): string {
  return labelInvoices(invoices).get(invoice.id) ?? extractInvoiceTitle(invoice.notes).title ?? `Thanh toán đợt ${nextInvoiceNumber(invoices)}`;
}

/**
 * Số dùng cho TÊN MẶC ĐỊNH của một hóa đơn (đang mở, hoặc mới tạo nếu không nằm trong danh sách).
 *
 * Trước đây có hai chỗ tự đánh số theo hai cách: danh sách lấy vị trí, còn hộp thoại lấy
 * "số của hóa đơn kế tiếp" (`tổng số + 1`) vì con số đó vốn dành cho việc TẠO MỚI. Hậu quả:
 * hàng ghi "Thanh toán đợt 1", bấm vào thì tiêu đề hiện "Thanh toán đợt 2" — cùng một chứng
 * từ mà hai cái tên, đúng thứ khiến người ta không dám tin con số nào nữa.  #Huynh
 */
export function invoiceOrdinal(invoices: InvoiceResponse[], invoice: InvoiceResponse): number {
  const title = labelInvoices(invoices).get(invoice.id);
  const match = title?.match(TITLE_NUMBER_RE);
  return match ? Number(match[1]) : nextInvoiceNumber(invoices);
}

/**
 * Điền số thật vào chỗ giữ chỗ `{{tong_tien}}` còn sót trong lời nhắn.
 *
 * Lời nhắn mẫu từng dùng chỗ giữ chỗ này (server điền lúc gửi), nhưng hiện ra trong ô soạn thì
 * trông như lỗi, nên nay lời nhắn ghi SỐ THẬT ngay từ đầu. Hàm này chỉ còn lo hai việc: mở bản nháp
 * cũ còn mang chỗ giữ chỗ, và hiển thị nội dung hóa đơn đã gửi.  #Huynh
 */
export function fillInvoiceAmount(notes: string, amount: number): string {
  return notes.replace(/\{\{\s*tong_tien\s*\}\}/gi, formatVND(amount));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Đổi số trong CÂU MẪU "Tổng số tiền cần thanh toán là <số>." theo tổng mới — nhưng CHỈ khi con số
 * đó còn đúng bằng tổng cũ (`from`). Freelancer đã tự sửa con số thì để nguyên, và việc nó lệch với
 * tổng sẽ bị báo đỏ.
 *
 * Nhờ vậy sửa ô số tiền hay VAT thì câu mẫu đi theo, không bắt người dùng gõ lại số bằng tay.  #Huynh
 */
export function retargetAmountSentence(notes: string, from: number, to: number): string {
  if (from === to) return notes;
  const sentence = new RegExp(
    `((?:Tổng số tiền|Số tiền) cần thanh toán là )${escapeRegExp(formatVND(from))}\\.`,
    "g"
  );
  return notes.replace(sentence, (_match, lead: string) => `${lead}${formatVND(to)}.`);
}

// Hệ số quy về đồng. Đơn vị dài đứng trước đơn vị ngắn để khớp đúng ("triệu" trước "tr").
const MONEY_UNIT_FACTORS: Record<string, number> = {
  "₫": 1, "vnđ": 1, "vnd": 1, "đồng": 1, "dong": 1,
  "nghìn": 1e3, "nghin": 1e3, "ngàn": 1e3, "ngan": 1e3,
  "triệu": 1e6, "trieu": 1e6,
  "tỷ": 1e9, "tỉ": 1e9, "ty": 1e9,
  "đ": 1, "tr": 1e6, "k": 1e3,
};

// Không bắt đầu giữa một số khác; nhánh 1 = số có dấu phân cách nghìn, nhánh 2 = số trần/thập phân
// (chỉ tính là tiền khi có đơn vị đi kèm); đơn vị phải đứng riêng ("5km", "5 trang" không phải tiền).
const MONEY_RE =
  /(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+(?!\d)|\d+(?:[.,]\d+)?)\s*(₫|vnđ|vnd|đồng|dong|nghìn|nghin|ngàn|ngan|triệu|trieu|tỷ|tỉ|ty|đ|tr|k)?(?![\p{L}\d])/giu;

/**
 * Các SỐ TIỀN do người dùng gõ tay trong lời nhắn (đồng, làm tròn), theo thứ tự xuất hiện.
 *
 * Chỉ coi là tiền khi có DẤU PHÂN CÁCH NGHÌN (`511.900.000`) hoặc ĐƠN VỊ đi kèm (`500k`, `30tr`,
 * `1,5 triệu`, `50.000đ`). Số trần (điện thoại, ngày tháng, "đợt 2", "50%", mã INV) không phải tiền.
 *
 * Phải cho CÙNG kết quả với `find_money_amounts` ở backend (`typed_amounts.py`) — hai bên dùng chung
 * bộ ví dụ trong test; web báo ổn mà backend chặn là lỗi.  #Huynh
 */
export function findMoneyAmounts(text: string | null | undefined): number[] {
  if (!text) return [];
  const amounts: number[] = [];
  for (const match of text.normalize("NFC").matchAll(MONEY_RE)) {
    const number = match[1];
    const unit = (match[2] ?? "").toLowerCase();
    const hasThousandsSeparator = /^\d{1,3}(?:[.,]\d{3})+$/.test(number);
    if (!hasThousandsSeparator && !unit) continue; // số trần: không phải tiền
    const value = hasThousandsSeparator
      ? Number(number.replace(/[.,]/g, ""))
      : Number(number.replace(",", "."));
    amounts.push(Math.round(value * (MONEY_UNIT_FACTORS[unit] ?? 1)));
  }
  return amounts;
}

/**
 * Số tiền trong `text` KHÔNG khớp số nào của hóa đơn (`allowed`: tạm tính, thuế, tổng...), lệch quá
 * `tolerance` đồng. Rỗng = lời nhắn không mâu thuẫn với hóa đơn.
 *
 * Lời nhắn là văn bản tự do nên gõ được "Tổng cộng 511.900.000 ₫" trong khi hóa đơn là 521.900.000 ₫:
 * thư tới khách mang hai tổng khác nhau, khách chuyển theo chữ là hóa đơn thành "thanh toán một
 * phần". Số khớp một con số trên hóa đơn thì cho qua; chỉ số LẠ mới bị nêu ra.  #Huynh
 */
export function mismatchedAmounts(
  text: string | null | undefined,
  allowed: number[],
  tolerance = 1
): number[] {
  return findMoneyAmounts(text).filter(
    (amount) => !allowed.some((ok) => Math.abs(amount - ok) <= tolerance)
  );
}

export function buildDefaultInvoiceNotes(
  deal: Deal,
  client: InvoiceComposerClient,
  /** Tổng cần thanh toán (đã gồm thuế) — đúng con số ở khung "Tóm tắt" bên trái. */
  amount: number,
  tone: InvoiceTone
): string {
  if (tone === "friendly") {
    return [
      `Chào ${client.name},`,
      "",
      `Mình gửi bạn thông tin thanh toán cho dự án "${deal.projectType}".`,
      `Số tiền cần thanh toán là ${formatVND(amount)}.`,
      "",
      "Nội dung:",
      `- Hạng mục: ${deal.projectType}`,
      "- Bạn vui lòng thanh toán theo thông tin đã thống nhất trước đó.",
      "- Sau khi chuyển khoản xong, bạn gửi giúp mình biên nhận để mình đối soát và lưu hồ sơ nhé.",
      "",
      "Cảm ơn bạn nhiều.",
    ].join("\n");
  }

  return [
    `Kính gửi ${client.name},`,
    "",
    `Freelancer gửi quý khách thông tin thanh toán cho dự án "${deal.projectType}".`,
    `Tổng số tiền cần thanh toán là ${formatVND(amount)}.`,
    "",
    "Nội dung thanh toán:",
    `- Hạng mục: ${deal.projectType}`,
    "- Quý khách vui lòng thanh toán theo đúng thông tin đã thống nhất giữa hai bên.",
    "- Sau khi thanh toán, quý khách có thể gửi lại biên nhận để Freelancer đối soát và lưu vào hồ sơ giao dịch.",
    "",
    "Trân trọng cảm ơn quý khách đã hợp tác.",
  ].join("\n");
}

export function buildInvoiceDraft(
  deal: Deal,
  client: InvoiceComposerClient,
  tone: InvoiceTone,
  /** Số thứ tự dùng cho tên mặc định — của CHÍNH hóa đơn đang mở, không phải của cái kế tiếp. */
  ordinal: number,
  invoice?: InvoiceResponse | null
): InvoiceDraftState {
  const amount = invoice ? Number(invoice.subtotal ?? invoice.total ?? deal.value) : deal.value;
  // Tổng cần thanh toán (gồm thuế): con số ở khung "Tóm tắt", và là số lời nhắn mẫu phải ghi.
  const total = invoice ? Number(invoice.total ?? amount) : amount;
  const parsedNotes = extractInvoiceTitle(invoice?.notes);
  const title = parsedNotes.title ?? `Thanh toán đợt ${ordinal}`;
  return {
    title,
    description: deal.projectType,
    amount: String(amount),
    taxRate: formatTaxRatePercent(invoice?.tax_rate),
    dueDate: invoice?.due_date
      ? toDateInputValue(invoice.due_date)
      : toApiDateValue(addDays(new Date(), 7)),
    // ĐỪNG BỊA NỘI DUNG CHO HÓA ĐƠN ĐÃ GỬI.
    //
    // Bản trước: hóa đơn nào không có ghi chú thì dựng sẵn một đoạn thư mẫu rồi bày dưới nhãn
    // "Nội dung gửi khách". Với bản nháp thì đó là điểm khởi đầu tử tế — sửa rồi lưu là nó
    // thành thật. Nhưng hóa đơn sinh từ mốc thu tiền ("Tạo & gửi hóa đơn" ở bảng việc) KHÔNG
    // hề có ghi chú, mà lại gửi đi ngay; mở ra xem thì thấy nguyên một đoạn thư trông như
    // vừa gửi cho khách — trong khi khách chưa bao giờ nhận được chữ nào trong đó.
    //
    // Freelancer đối chiếu với hộp thư của khách rồi kết luận "hệ thống gửi thiếu nội dung".
    // Thực ra không thiếu gì cả: đoạn đó chưa từng tồn tại ngoài màn hình này.  #Huynh
    notes: invoice?.notes
      ? invoice.status === "draft"
        ? fillInvoiceAmount(parsedNotes.body, total)
        : parsedNotes.body
      : !invoice || invoice.status === "draft"
        ? buildDefaultInvoiceNotes(deal, client, total, tone)
        : "",
  };
}

/**
 * Thông báo sau khi GỬI hóa đơn. Nói đúng việc hệ thống đã làm với lời nhắc thanh toán: đã lên lịch
 * (kèm chỗ để kiểm tra, và có phải chờ duyệt không) hay vì sao chưa lên lịch được.  #Huynh
 */
export function invoiceSentMessage(invoiceNumber: string, reminder?: PaymentReminderInfo | null): string {
  const sent = `Đã gửi hóa đơn ${invoiceNumber} cho khách.`;
  if (!reminder) return sent;

  if (reminder.scheduled) {
    const days = reminder.days_before_due;
    const when =
      days === 0
        ? "vào đúng ngày đến hạn thanh toán"
        : days
          ? `trước ${days} ngày so với hạn thanh toán`
          : "trước hạn thanh toán";
    const base = `${sent} Sẽ tự động lên lịch nhắc ${when}, bạn có thể kiểm tra ở mục "Nhắc nhở".`;
    return reminder.requires_approval ? `${base} Lời nhắc chờ bạn duyệt trước khi gửi.` : base;
  }

  switch (reminder.reason) {
    case "disabled":
      return `${sent} Quy tắc nhắc trước hạn thanh toán đang tắt nên chưa lên lịch nhắc.`;
    case "too_soon":
      return `${sent} Hạn thanh toán còn quá gần nên chưa lên lịch nhắc tự động.`;
    case "no_client_email":
      return `${sent} Khách chưa có email nên chưa lên lịch nhắc.`;
    default:
      return `${sent} Chưa lên lịch được lời nhắc tự động.`;
  }
}
