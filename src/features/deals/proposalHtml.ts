import type { Deal } from "@/features/deals/types";
import type { ProposalContentDTO } from "@/services/proposalsService";
import { formatVND } from "@/utils/format";

// ---------------------------------------------------------------------------
// Dựng HTML cho báo giá — DÙNG CHUNG.
//
// Trước đây mấy hàm này nằm riêng trong ProposalModal, nên màn "Xem lại" ở tab Tài
// liệu phải tự render kiểu khác (in ra từng mục thô). Cùng một báo giá mà hai màn
// hiện ra hai kiểu — người dùng tưởng dữ liệu bị sai.
//
// Giờ cả hai gọi cùng một hàm, nên không thể lệch nhau được nữa.
// ---------------------------------------------------------------------------

/**
 * Khối định giá do BACKEND tính (`src/ai/proposal_generator/pricing.py`).
 *
 * Điểm cốt lõi: **AI không xuất ra con số tiền nào.** Nó chỉ chấm hệ số (độ phức tạp, quy
 * mô) và tỉ trọng công sức. Backend neo vào GIÁ THẬT freelancer đã chốt ở các dự án cùng
 * loại, nhân hệ số, rồi ra một KHOẢNG. Con số cuối cùng do FREELANCER chốt.
 *
 * `decided_by` phải hiện lên giao diện: người dùng có quyền biết dòng nào máy tính, dòng
 * nào AI phán.  #Huynh
 */
export type PricingFactor = {
  key: string;
  label: string;
  level: string;
  factor: number;
  reason: string;
  decided_by: "ai" | "code";
};

export type PricingDetail = {
  anchor: {
    value: number;
    /** Mốc neo đáng tin tới đâu — quyết định khoảng giá rộng hay hẹp. */
    confidence: "high" | "medium" | "low";
    source: string;
    sample_size: number;
  };
  factors: PricingFactor[];
  suggested: number;
  range_min: number;
  range_max: number;
  line_items: { label: string; weight_percent: number; amount: number }[];
  warnings: string[];
  /** Giá freelancer đã chốt. Chưa chốt thì KHÔNG gửi được báo giá (BE trả 409). */
  final_price?: number;
  final_outside_range?: boolean;
};

/**
 * Một đợt thanh toán có cấu trúc (Phase B). Khớp `PaymentMilestone` bên backend
 * (src/ai/proposal_generator/schemas/proposal_document.py): mô tả + (% HOẶC số tiền) +
 * thời điểm/điều kiện. Đây là NGUỒN để backend tự sinh task "Thu tiền:" khi báo giá được
 * chốt — nên PHẢI giữ nguyên khi lưu, y như `deliverables`/`pricing_detail`.  #Huynh
 */
export type PaymentMilestone = {
  label: string;
  percent?: number | null;
  amount?: string;
  due?: string;
};

/**
 * Tổng tỷ lệ các đợt thanh toán có hợp lệ không. `null` = không có gì để nói.
 *
 * CHỈ CÒN DÙNG CHO BÁO GIÁ CŨ (báo giá chưa có hạng mục chi phí nào). Từ khi thu tiền theo
 * hạng mục, mục 8 được SUY RA từ mục 7 (`pdf_content.payment_schedule`) chứ không ai gõ tay
 * nữa, nên không còn cách nào cộng ra 130% — backend cũng đã bỏ cổng tương ứng. Giữ lại để
 * bản nháp cũ trong DB vẫn hiện cảnh báo đúng.
 *
 * CHỈ xét khi MỌI đợt đều khai bằng %. Lịch hỗn hợp (có đợt ghi số tiền cụ thể) thì cộng %
 * không có nghĩa gì, báo lỗi là báo oan.  #Huynh
 */
export function paymentPercentIssue(
  milestones: PaymentMilestone[] | undefined | null
): { total: number; message: string } | null {
  const rows = milestones ?? [];
  if (rows.length === 0) return null;
  if (!rows.every((m) => m.percent != null)) return null;

  const total = rows.reduce((sum, m) => sum + (m.percent ?? 0), 0);
  if (total === 100) return null;

  const gap = Math.abs(total - 100);
  return {
    total,
    message:
      total > 100
        ? `Tổng tỷ lệ các đợt đang là ${total}% — dư ${gap}%. Phải bằng 100% mới gửi được.`
        : `Tổng tỷ lệ các đợt đang là ${total}% — thiếu ${gap}%. Phải bằng 100% mới gửi được.`,
  };
}

/** Thu TRƯỚC khi bắt tay làm — chỗ freelancer giữ được khoản đặt cọc. */
export const DUE_ON_SIGNING = "on_signing";
/** Thu KHI hạng mục hoàn thành. */
export const DUE_ON_COMPLETION = "on_completion";
/**
 * "Khác" — freelancer tự ghi thời điểm thu.
 *
 * MÁY COI NHƯ KHÔNG BIẾT: không gắn nhãn "Thu ngay"/"Thu khi xong" trên bảng việc, không hỏi
 * lại khi xuất hoá đơn sớm. Vì "Sau 30 ngày kể từ ngày ký" là thu TRƯỚC còn "Khi khách duyệt
 * demo" là thu SAU — cùng rơi vào ô này mà ý nghĩa ngược nhau, đoán một trong hai là có ngày
 * nhắc freelancer đi đòi tiền chưa tới hạn.  #Huynh
 */
export const DUE_CUSTOM = "custom";

export type DueType =
  | typeof DUE_ON_SIGNING
  | typeof DUE_ON_COMPLETION
  | typeof DUE_CUSTOM;

/** Nhãn chuẩn in lên tờ báo giá. Phải khớp `pdf_content.DUE_TYPE_LABELS` bên backend. */
export const DUE_TYPE_LABELS: Record<DueType, string> = {
  [DUE_ON_SIGNING]: "Khi ký hợp đồng",
  [DUE_ON_COMPLETION]: "Khi hoàn thành hạng mục",
  // Lưới an toàn — cổng gửi chặn "Khác" mà bỏ trống ghi chú, nên khách không bao giờ đọc câu này.
  [DUE_CUSTOM]: "Theo thoả thuận riêng",
};

/**
 * Một hạng mục chi phí ở mục 7 — và cũng là ĐƠN VỊ THU TIỀN: mỗi hạng mục sinh ra một công
 * việc trên bảng việc và một hóa đơn riêng.
 *
 * `due_type` là thứ MÁY đọc, `due_note` là thứ KHÁCH đọc (in đè lên nhãn chuẩn nếu có).
 * Trước đây chỉ có một ô chữ tự do, và giao diện phải ĐOÁN xem câu đó có nghĩa "thu trước"
 * không bằng cách dò từ khoá tiếng Việt — gõ "Ngay sau khi hai bên xác nhận" là đoán trượt.
 *
 * Tên trường theo đúng JSON gửi backend (`content.pricing_items`), không camelCase: chỗ này
 * đi thẳng vào `content` chứ không qua tầng map nào.  #Huynh
 */
export type CostItem = {
  label: string;
  amount: number;
  due_type?: DueType;
  due_note?: string;
};

/** Chữ hiện cho người đọc: ghi chú riêng nếu có, không thì nhãn chuẩn của loại. */
export function dueLabel(item: Pick<CostItem, "due_type" | "due_note">): string {
  return item.due_note || DUE_TYPE_LABELS[item.due_type ?? DUE_ON_COMPLETION];
}

/**
 * Chia đều `total` cho `n` hạng mục, làm tròn tới 1.000 ₫, dòng CUỐI gánh phần lẻ.
 *
 * PHẢI khớp TUYỆT ĐỐI với backend (`pdf_content._structured_pricing`, nhánh dạng cũ) — panel
 * và tờ báo giá cùng một con số thì mới không mâu thuẫn nhau.  #Huynh
 */
export function splitEqually(total: number, n: number): number[] {
  if (n <= 0 || total <= 0) return new Array(Math.max(n, 0)).fill(0);
  const out: number[] = [];
  let allocated = 0;
  for (let i = 0; i < n; i += 1) {
    if (i === n - 1) {
      out.push(total - allocated);
    } else {
      const amount = Math.round(total / n / 1000) * 1000;
      out.push(amount);
      allocated += amount;
    }
  }
  return out;
}

/**
 * Co giãn các hạng mục theo `total` mới, GIỮ NGUYÊN TỶ LỆ giữa chúng.
 *
 * Mirror nhánh dự phòng của backend: bộ định giá chia 200/150/75/75 cho một dự án — tỷ lệ đó
 * phản ánh công sức thật của từng phần, sát thực tế hơn nhiều so với chia đều. Đổi giá thì
 * giãn theo, đừng san phẳng.
 *
 * `base` là MẪU SỐ và phải truyền vào, không tự cộng các dòng: backend chia theo
 * `pricing_detail.suggested` (giá ĐỀ XUẤT), mà tổng các `line_items` không có gì bảo đảm
 * bằng đúng `suggested`. Tự cộng lấy mẫu số khác là hai bên lại ra hai bảng khác nhau — đúng
 * con bug đang đi sửa. Chỉ khi không có `base` hợp lệ mới cộng các dòng làm phương án chót.
 *
 * Dòng cuối gánh phần lẻ để tổng khớp tuyệt đối — bảng cộng không ra tổng là thứ khách soi
 * ra ngay.  #Huynh
 */
export function rescaleToTotal(items: CostItem[], total: number, base: number): CostItem[] {
  if (items.length === 0) return [];
  if (total <= 0) return items.map((item) => ({ ...item, amount: 0 }));

  const denominator =
    base > 0 ? base : items.reduce((sum, item) => sum + (item.amount || 0), 0);
  // Không có gốc để giãn (mọi dòng đều 0) thì chia đều là lựa chọn duy nhất còn lại.
  if (denominator <= 0) {
    const amounts = splitEqually(total, items.length);
    return items.map((item, i) => ({ ...item, amount: amounts[i] ?? 0 }));
  }

  const ratio = total / denominator;
  const out: CostItem[] = [];
  let allocated = 0;
  items.forEach((item, index) => {
    if (index === items.length - 1) {
      out.push({ ...item, amount: total - allocated });
    } else {
      const amount = Math.round(((item.amount || 0) * ratio) / 1000) * 1000;
      out.push({ ...item, amount });
      allocated += amount;
    }
  });
  return out;
}

/**
 * Tổng các hạng mục chi phí có khớp giá chào khách không. `null` = không có gì để nói.
 *
 * Cùng lý do với `paymentPercentIssue`: khách cầm tờ báo giá tự cộng cột "Thành tiền" ra một
 * số, rồi đọc dòng "Tổng báo giá" ra số khác. Mất uy tín ngay tại bàn, và không cãi được.
 *
 * Bỏ qua khi chưa chốt giá (`agreed <= 0`) hoặc chưa có hạng mục nào — lúc đó chưa có gì để
 * đối chiếu, cảnh báo là báo oan.
 *
 * MỘT nguồn cho cả dòng cảnh báo lẫn việc khoá nút gửi, và khớp với guard bên backend
 * (`ProposalsService.transition_status`, nhánh "sent").  #Huynh
 */
export function costItemsIssue(
  items: CostItem[] | undefined | null,
  agreed: number
): { total: number; message: string } | null {
  const rows = items ?? [];
  if (rows.length === 0) return null;

  // Hạng mục 0 đồng làm DEAL KẸT VĨNH VIỄN nếu lọt qua: nó thành một công việc thu tiền bắt
  // buộc tick xong mới đóng được dự án, nhưng bấm xuất hóa đơn thì backend từ chối vì 0 đồng.
  // Kiểm TRƯỚC cả điều kiện `agreed > 0` — chưa chốt giá thì vẫn phải báo dòng thiếu tiền.
  const total0 = rows.reduce((sum, item) => sum + (item.amount || 0), 0);

  const zero = rows.find((item) => !(item.amount > 0));
  if (zero) {
    return {
      total: total0,
      message: `Hạng mục "${zero.label || "chưa đặt tên"}" đang là 0 đ. Mỗi hạng mục là một đợt thu tiền nên phải có số tiền cụ thể.`,
    };
  }

  // Chọn "Khác" mà bỏ trống: tờ giấy khách KÝ sẽ có ô "thời điểm thu" mơ hồ, đúng thứ đẻ ra
  // cãi nhau lúc đòi tiền. Cùng lý do với cổng 0 đ ngay trên.  #Huynh
  const vague = rows.find(
    (item) => item.due_type === DUE_CUSTOM && !(item.due_note ?? "").trim()
  );
  if (vague) {
    return {
      total: total0,
      message: `Hạng mục "${vague.label || "chưa đặt tên"}" chọn thời điểm thu "Khác" nhưng chưa ghi rõ là khi nào.`,
    };
  }

  if (agreed <= 0) return null;

  const total = rows.reduce((sum, item) => sum + (item.amount || 0), 0);
  if (total === agreed) return null;

  const gap = Math.abs(total - agreed);
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  return {
    total,
    message:
      total > agreed
        ? `Tổng hạng mục đang là ${fmt(total)} đ — dư ${fmt(gap)} đ so với giá chào. Phải khớp mới gửi được.`
        : `Tổng hạng mục đang là ${fmt(total)} đ — thiếu ${fmt(gap)} đ so với giá chào. Phải khớp mới gửi được.`,
  };
}

export type BackendProposalContent = {
  project_overview: string;
  scope_of_work: string[];
  deliverables: string[];
  timeline: string;
  pricing: string;
  payment_terms: string;
  /** Các đợt thanh toán có cấu trúc — nguồn sinh task "Thu tiền:". */
  payment_milestones?: PaymentMilestone[];
  /**
   * Hạng mục chi phí do freelancer tự sửa ở màn review (mục 7).
   *
   * Dạng cũ `string[]` = chỉ nhãn, BE chia đều tiền theo giá chốt. Dạng mới `CostItem[]` =
   * freelancer tự gõ tiền, BE dùng thẳng. Rỗng/không có = dùng bảng của bộ định giá.  #Huynh
   */
  pricing_items?: (string | CostItem)[];
  assumptions?: string;
  /** Phạm vi KHÔNG bao gồm — dòng phòng thủ chống scope creep, mục "10. Điều Khoản Bổ Sung". */
  out_of_scope?: string[];
  revision_policy?: string;
  /** ISO "2026-08-31". Freelancer tự đặt hạn hiệu lực; trống thì backend tính mặc định. */
  valid_until?: string;
  /** `null` khi không neo được vào đâu (chưa chấm điểm deal, chưa có lịch sử). */
  pricing_detail?: PricingDetail | null;
};

export function isBackendContent(c: unknown): c is BackendProposalContent {
  return typeof c === "object" && c !== null && "project_overview" in c;
}

type QuoteLineItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
};

type QuoteHtmlInput = {
  title: string;
  clientName: string;
  clientContact?: string;
  summary?: string;
  lineItems: QuoteLineItem[];
  total: number;
  timeline?: string;
  paymentTerms?: string;
  note?: string;
};

function renderQuoteHtml(input: QuoteHtmlInput): string {
  const today = new Date().toLocaleDateString("vi-VN");
  const total = input.total > 0 ? input.total : input.lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const deposit = Math.round(total * 0.5);
  const remain = Math.max(total - deposit, 0);
  const rows = input.lineItems.length
    ? input.lineItems
    : [{ description: input.title, quantity: 1, unitPrice: total, amount: total }];

  const rowHtml = rows
    .map((item) => {
      const quantity = item.quantity ?? 1;
      const amount = item.amount ?? item.unitPrice ?? 0;
      return `<tr style="border-bottom:1px solid hsl(var(--border));">
        <td style="padding:10px 12px;color:hsl(var(--foreground));">${item.description}</td>
        <td style="padding:10px 12px;text-align:center;color:hsl(var(--muted-foreground));">${quantity}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;color:hsl(var(--foreground));">${formatVND(amount)}</td>
      </tr>`;
    })
    .join("");

  return `
    <div style="border-bottom:1px solid hsl(var(--border));padding-bottom:16px;margin-bottom:18px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:hsl(var(--primary));font-weight:700;">BÁO GIÁ DỊCH VỤ</div>
      <div style="font-size:24px;font-weight:800;margin-top:6px;color:hsl(var(--foreground));line-height:1.25;">${input.title}</div>
      <div style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:6px;">Ngày lập: ${today} · Hiệu lực 7 ngày</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:13px;">
      <div style="border:1px solid hsl(var(--border));border-radius:10px;padding:12px;">
        <div style="font-size:10px;font-weight:700;color:hsl(var(--muted-foreground));text-transform:uppercase;margin-bottom:4px;">Bên cung cấp</div>
        <div style="font-weight:700;color:hsl(var(--foreground));">Freelancer</div>
      </div>
      <div style="border:1px solid hsl(var(--border));border-radius:10px;padding:12px;">
        <div style="font-size:10px;font-weight:700;color:hsl(var(--muted-foreground));text-transform:uppercase;margin-bottom:4px;">Khách hàng</div>
        <div style="font-weight:700;color:hsl(var(--foreground));">${input.clientName}</div>
        ${input.clientContact ? `<div style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:2px;">${input.clientContact}</div>` : ""}
      </div>
    </div>

    ${input.summary ? `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:6px;">Tóm tắt yêu cầu</div>
        <p style="margin:0;color:hsl(var(--foreground)/0.85);line-height:1.6;white-space:pre-line;">${input.summary}</p>
      </div>
    ` : ""}

    <div style="margin-bottom:18px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:8px;">Hạng mục & chi phí</div>
      <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid hsl(var(--border));border-radius:10px;overflow:hidden;font-size:13px;">
        <tr style="background:hsl(var(--muted));">
          <td style="padding:10px 12px;font-weight:700;color:hsl(var(--foreground));">Hạng mục</td>
          <td style="padding:10px 12px;text-align:center;font-weight:700;color:hsl(var(--foreground));width:72px;">SL</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:hsl(var(--foreground));width:150px;">Thành tiền</td>
        </tr>
        ${rowHtml}
        <tr style="background:hsl(var(--primary)/0.06);">
          <td colspan="2" style="padding:12px;font-weight:800;color:hsl(var(--foreground));">Tổng báo giá</td>
          <td style="padding:12px;text-align:right;font-size:18px;font-weight:900;color:hsl(var(--primary));">${formatVND(total)}</td>
        </tr>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:13px;">
      <div style="border:1px solid hsl(var(--border));border-radius:10px;padding:12px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:6px;">Tiến độ dự kiến</div>
        <div style="color:hsl(var(--foreground)/0.85);line-height:1.6;">${input.timeline || "Thống nhất sau khi chốt phạm vi chi tiết."}</div>
      </div>
      <div style="border:1px solid hsl(var(--border));border-radius:10px;padding:12px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:6px;">Thanh toán</div>
        <div style="color:hsl(var(--foreground)/0.85);line-height:1.6;">
          ${input.paymentTerms || `Tạm ứng ${formatVND(deposit)} khi bắt đầu, thanh toán ${formatVND(remain)} khi nghiệm thu.`}
        </div>
      </div>
    </div>

    <div style="border-top:1px solid hsl(var(--border));padding-top:14px;font-size:12px;color:hsl(var(--muted-foreground));line-height:1.6;">
      ${input.note || "Báo giá này là ước tính ban đầu, có thể điều chỉnh nếu phạm vi công việc thay đổi."}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Render nội dung AI mới (flat strings / string[]) → HTML
// ---------------------------------------------------------------------------
export function backendContentToHtml(content: BackendProposalContent, deal: Deal): string {
  const detail = content.pricing_detail;

  // Đây từng là nguồn gốc của bản báo giá "0 ₫":
  //
  //     lineItems: [{ description: content.pricing, quantity: 1, amount: deal.value }]
  //     total: deal.value
  //
  // `deal.value` là ô "Giá trị dự kiến" freelancer tự nhập. Không nhập thì bằng 0, và cả
  // bản báo giá gửi khách ghi "Tổng báo giá: 0 ₫". Giờ tiền lấy từ bộ định giá của BE.
  //
  // Chưa chốt giá thì dùng giá ĐỀ XUẤT để xem trước — nhưng nút gửi bị khoá, nên bản
  // "xem trước" này không bao giờ tới tay khách.  #Huynh
  const total = detail?.final_price ?? detail?.suggested ?? deal.value;

  const lineItems =
    detail && detail.line_items.length > 0 && detail.suggested > 0
      ? scaleLineItems(detail, total)
      : [
          {
            description: content.pricing || deal.projectType,
            quantity: 1,
            amount: total,
          },
        ];

  return renderQuoteHtml({
    title: deal.projectType,
    clientName: deal.client,
    clientContact: deal.contact,
    summary: content.project_overview || deal.notes,
    lineItems,
    total,
    timeline: content.timeline,
    paymentTerms: content.payment_terms,
    note: content.assumptions,
  });
}

/**
 * Chia lại hạng mục theo giá freelancer đã chốt.
 *
 * BE chia theo giá ĐỀ XUẤT. Freelancer kéo thanh xuống 35 triệu thì bảng phải chia lại theo
 * 35 triệu — nếu không, bảng cộng ra một số, dòng "Tổng báo giá" ghi một số khác. Khách sẽ
 * soi ra ngay, và đó là thứ làm mất uy tín cả bản báo giá.
 *
 * Đồng lẻ do làm tròn dồn vào dòng cuối để tổng KHỚP TUYỆT ĐỐI.
 */
function scaleLineItems(detail: PricingDetail, total: number) {
  const ratio = total / detail.suggested;
  const items = detail.line_items.map((item) => ({
    description: item.label,
    quantity: 1,
    amount: Math.round((item.amount * ratio) / 1000) * 1000,
  }));

  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  items[items.length - 1].amount += total - sum;
  return items;
}

// ---------------------------------------------------------------------------
// Render nội dung thủ công / fallback (ProposalContentDTO) → HTML
// ---------------------------------------------------------------------------
export function proposalContentToHtml(content: ProposalContentDTO, deal: Deal): string {
  const quoteItems = content.pricing?.line_items?.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    amount: item.amount,
  })) ?? [];
  const timelineText =
    content.timeline?.start_date || content.timeline?.end_date
      ? `Từ ${content.timeline.start_date ?? "?"} đến ${content.timeline.end_date ?? "?"}.`
      : content.timeline?.milestones?.map((m) => m.title).filter(Boolean).join("; ");

  return renderQuoteHtml({
    title: content.title ?? deal.projectType,
    clientName: deal.client,
    clientContact: deal.contact,
    summary: content.executive_summary || deal.notes,
    lineItems: quoteItems,
    total: content.pricing?.total ?? deal.value,
    timeline: timelineText,
    paymentTerms: content.terms?.payment_terms,
    note: content.notes,
  });

}


/**
 * Dựng HTML cho báo giá bất kể `content` theo shape nào.
 *
 * `rendered_html` (nếu có) là bản người dùng đã chỉnh tay trong editor — ưu tiên nó,
 * vì đó mới đúng thứ họ thấy và muốn gửi đi.
 */
export function proposalToHtml(content: unknown, deal: Deal): string {
  const saved = (content as { rendered_html?: string; html?: string } | undefined) ?? {};
  if (saved.rendered_html) return saved.rendered_html;
  if (saved.html) return saved.html;

  if (isBackendContent(content)) return backendContentToHtml(content, deal);
  return proposalContentToHtml((content ?? {}) as ProposalContentDTO, deal);
}
