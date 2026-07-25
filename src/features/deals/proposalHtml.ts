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

export type BackendProposalContent = {
  project_overview: string;
  scope_of_work: string[];
  deliverables: string[];
  timeline: string;
  pricing: string;
  payment_terms: string;
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
