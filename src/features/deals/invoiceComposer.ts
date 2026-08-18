import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

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

function toApiDateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

export function getInvoiceDisplayTitle(invoice: InvoiceResponse, index: number): string {
  const parsed = extractInvoiceTitle(invoice.notes);
  return parsed.title ?? `Thanh toán đợt ${index + 1}`;
}

/**
 * Số thứ tự hiển thị của một hóa đơn — LẤY THEO VỊ TRÍ THẬT trong danh sách của deal.
 *
 * Trước đây có hai chỗ tự đánh số theo hai cách: danh sách lấy vị trí, còn hộp thoại lấy
 * "số của hóa đơn kế tiếp" (`tổng số + 1`) vì con số đó vốn dành cho việc TẠO MỚI. Hậu quả:
 * hàng ghi "Thanh toán đợt 1", bấm vào thì tiêu đề hiện "Thanh toán đợt 2" — cùng một chứng
 * từ mà hai cái tên, đúng thứ khiến người ta không dám tin con số nào nữa.  #Huynh
 */
export function invoiceOrdinal(invoices: InvoiceResponse[], invoice: InvoiceResponse): number {
  const index = invoices.findIndex((item) => item.id === invoice.id);
  return (index >= 0 ? index : invoices.length) + 1;
}

export function buildDefaultInvoiceNotes(
  deal: Deal,
  client: InvoiceComposerClient,
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
  const parsedNotes = extractInvoiceTitle(invoice?.notes);
  const title = parsedNotes.title ?? `Thanh toán đợt ${ordinal}`;
  return {
    title,
    description: deal.projectType,
    amount: String(amount),
    taxRate: String(Number(invoice?.tax_rate ?? 0) * 100),
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
      ? parsedNotes.body
      : !invoice || invoice.status === "draft"
        ? buildDefaultInvoiceNotes(deal, client, amount, tone)
        : "",
  };
}
