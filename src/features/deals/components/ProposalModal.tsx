import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, X, Send, Download,
  Minus, RefreshCw, Save, Sparkles,
  TrendingUp, Check, Pencil, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { WindowControlButton } from "@/components/solodesk/WindowControlButton";
import { PricingPanel } from "@/features/deals/components/PricingPanel";
import { DocTemplateChooser } from "@/features/deals/components/DocTemplateChooser";
import { useTermTemplates } from "@/features/deals/hooks/useTermTemplates";
import { attachInlineEdit } from "@/features/deals/inlineEditPreview";
import { LineItemsEditor, MilestonesEditor } from "@/features/deals/components/ProposalMoneyEditors";
import {
  costItemsIssue,
  paymentPercentIssue,
  rescaleToTotal,
  splitEqually,
  type CostItem,
  type PaymentMilestone,
} from "@/features/deals/proposalHtml";
import { getProposalPreview, setProposalPrice } from "@/services/proposalsService";
import type { PricingDetail } from "@/features/deals/proposalHtml";
import { useCreateProposal, useAiGenerateProposal, useSendProposal, useUpdateProposal, useDownloadProposalPdf, useProposal, useProposalList } from "@/features/deals/hooks/useProposals";
import { updateDealStage } from "@/services/dealsService";
import type { ProposalContentDTO } from "@/services/proposalsService";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import {
  isBackendContent,
  type BackendProposalContent,
} from "@/features/deals/proposalHtml";

// ---------------------------------------------------------------------------
// Schema thật mà Gemini (qua /proposals/ai-generate) trả về
// ---------------------------------------------------------------------------

/**
 * Cờ chặn nút "Tải PDF". `null` = cho phép tải.
 *
 * Lịch sử: `GET /proposals/{id}/pdf` từng 500 với MỌI báo giá do FE tạo — BE index
 * cứng shape nội bộ của AI (`project_overview`, `deliverables`...) bằng `[...]` chứ
 * không `.get()`, trong khi FE lưu shape `ProposalContentDTO` mà chính
 * `contracts/openapi.yaml` khai. Thiếu một khoá là KeyError → 500.
 *
 * Đã sửa ở BE (2026-07-12, nhánh `fix/lead-qualifier-json-parse`): `generate_pdf`
 * giờ đọc được cả hai shape. Kiểm chứng bằng cách gọi thật: shape hợp đồng, shape
 * AI, và content rỗng — cả ba đều trả 200 + `%PDF`.
 *
 * Giữ lại cờ này thay vì xoá hẳn: nếu BE lại hỏng, chỉ cần gán một câu là nút mờ đi
 * kèm lý do, không phải sửa JSX.
 */
const PDF_BLOCKED_REASON: string | null = null;

/** Bỏ dấu tiếng Việt và ký tự lạ để tên file tải về không bị vỡ trên Windows/macOS. */
function slugifyFilename(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "khach-hang";
}



function normalizeProposalContentForApi(
  content: ProposalContentDTO | BackendProposalContent | null,
  deal: Deal,
  editedText?: string,
  renderedHtml?: string
): ProposalContentDTO {
  if (content && isBackendContent(content)) {
    return {
      // Bản HTML người dùng đã chỉnh tay. DTO vốn có sẵn trường này ("FE lưu bản
      // rich text đã chỉnh...") nhưng chưa ai điền — nên màn Xem lại ở tab Tài liệu
      // phải tự dựng lại theo kiểu khác, và hiện ra khác hẳn modal soạn thảo.
      rendered_html: renderedHtml,
      title: `Báo giá ${deal.projectType}`,
      executive_summary: content.project_overview || deal.notes,
      scope_of_work: content.scope_of_work?.join("\n") || deal.projectType,
      // Hai trường này TỪNG bị vứt âm thầm: DTO không có chỗ chứa nên `deliverables` và
      // `out_of_scope` rụng ngay lần lưu đầu. AI soạn xong thì mục "6. Sản Phẩm Bàn Giao"
      // hiện đủ; sửa MỘT chữ rồi lưu là mục đó RỖNG trong bản gửi khách — không có gì báo,
      // vì BE đọc thiếu khoá thì trả danh sách rỗng chứ không nổ.  #Huynh
      deliverables: content.deliverables ?? [],
      out_of_scope: content.out_of_scope ?? [],
      // Giữ nguyên các đợt thanh toán có cấu trúc: backend đọc trường này để tự sinh task
      // "Thu tiền:" khi báo giá được chốt. Không giữ là sửa MỘT chữ rồi lưu -> mất mốc thu
      // tiền -> chốt báo giá xong chẳng có task nào. Cùng lỗi với deliverables ở trên.  #Huynh
      payment_milestones: content.payment_milestones ?? [],
      valid_until: content.valid_until,
      // Tiền lấy từ bộ định giá của BE, KHÔNG lấy `deal.value` (ô "Giá trị dự kiến" —
      // freelancer không nhập thì bằng 0, và bản lưu lại ghi "Tổng báo giá: 0 ₫").  #Huynh
      pricing: buildPricingDto(content, deal),

      // GIỮ NGUYÊN khối định giá khi lưu. Vứt nó đi là mất bảng định giá lúc mở lại, và
      // BE mất luôn căn cứ để chặn "gửi khi chưa chốt giá".
      pricing_detail: content.pricing_detail ?? null,
      timeline: {
        milestones: content.timeline ? [{ title: content.timeline }] : undefined,
      },
      terms: {
        payment_terms: content.payment_terms,
      },
      notes: editedText?.trim() || content.assumptions,
    };
  }

  const source = content ?? buildManualProposalContent(deal);
  return {
    rendered_html: renderedHtml,
    title: source.title,
    executive_summary: source.executive_summary,
    scope_of_work: source.scope_of_work,
    timeline: source.timeline,
    pricing: source.pricing,
    terms: source.terms,
    notes: editedText?.trim() || source.notes,
  };
}

/**
 * Dựng khối `pricing` của DTO từ bộ định giá.
 *
 * Đồng lẻ do làm tròn được DỒN VÀO DÒNG CUỐI để tổng các dòng KHỚP TUYỆT ĐỐI với tổng báo
 * giá. Thiếu bước này là ra đúng cái bảng khách soi thấy ngay: 22 + 16,5 + 16,5 = 55 triệu
 * nhưng dòng "Tổng báo giá" ghi 49 triệu.  #Huynh
 */
function buildPricingDto(content: BackendProposalContent, deal: Deal): ProposalContentDTO["pricing"] {
  const detail = content.pricing_detail;
  const total = detail?.final_price ?? detail?.suggested ?? deal.value;

  if (!detail || detail.line_items.length === 0 || detail.suggested <= 0) {
    return {
      currency: "VND",
      total,
      line_items: [
        { description: content.pricing || deal.projectType, quantity: 1, unit_price: total, amount: total },
      ],
    };
  }

  const items = detail.line_items.map((item) => {
    const amount = Math.round((item.amount * total) / detail.suggested / 1000) * 1000;
    return { description: item.label, quantity: 1, unit_price: amount, amount };
  });

  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  const last = items[items.length - 1];
  last.amount += total - sum;
  last.unit_price = last.amount;

  return { currency: "VND", total, line_items: items };
}

type EditFields = {
  overview: string;
  scope: string;
  deliverables: string;
  timeline: string;
  paymentTerms: string;
  assumptions: string;
  outOfScope: string;
  revisionPolicy: string;
  /** ISO "2026-08-31" — kiểu của máy. Tờ giấy hiện kiểu Việt, chỗ này lưu kiểu tính được. */
  validUntil: string;
};

/**
 * Nhãn `data-field` trong template của backend -> ô soạn thảo tương ứng.
 *
 * Đây là toàn bộ "giao kèo" giữa tờ báo giá và màn này: template gắn nhãn, chỗ này dịch
 * nhãn về đúng trường. Nhãn lạ thì bỏ qua chứ không nổ.  #Huynh
 */
const INLINE_FIELD_MAP: Record<string, keyof EditFields> = {
  project_overview: "overview",
  scope_of_work: "scope",
  deliverables: "deliverables",
  timeline: "timeline",
  payment_terms: "paymentTerms",
  assumptions: "assumptions",
  out_of_scope: "outOfScope",
  revision_policy: "revisionPolicy",
  valid_until: "validUntil",
};

/** Bóc content (bất kể shape AI hay DTO) ra các trường soạn thảo được — trừ GIÁ. */
/**
 * Hạng mục chi phí mục 7 — LUÔN trả về nhãn kèm số tiền, gộp ba trạng thái về một.
 *
 * 1. Freelancer đã gõ tiền (`{label, amount}[]`) → dùng nguyên.
 * 2. Bản nháp CŨ chỉ có nhãn (`string[]`) → chia đều theo giá chốt, đúng như backend làm.
 * 3. Chưa sửa gì → lấy nhãn + tiền từ bộ định giá, CO GIÃN theo giá chốt — mirror nhánh dự
 *    phòng của backend (`pdf_content._structured_pricing`).
 *
 * Trạng thái 3 mới là chỗ từng sai. Panel cũ LUÔN hiện chia đều bất kể trạng thái, trong khi
 * tờ báo giá giữ tỷ lệ của bộ định giá. Chốt giá 500tr thì trái hiện "125tr × 4" còn phải in
 * "200/150/75/75" — hai bên nói hai kiểu, và người dùng tin bên nào cũng sai.  #Huynh
 */
function deriveCostItems(
  saved: unknown,
  detailItems: { label: string; amount: number }[] | undefined,
  agreedTotal: number,
  /** Giá ĐỀ XUẤT — mẫu số backend dùng để co giãn. Phải truyền để hai bên ra cùng bảng. */
  suggested: number
): CostItem[] {
  if (Array.isArray(saved) && saved.length > 0) {
    if (saved.every((x) => typeof x === "object" && x !== null)) {
      return (saved as CostItem[]).map((x) => ({
        label: String(x.label ?? ""),
        amount: Number(x.amount) || 0,
      }));
    }
    const labels = (saved as unknown[]).map(String).filter(Boolean);
    const amounts = splitEqually(agreedTotal, labels.length);
    return labels.map((label, i) => ({ label, amount: amounts[i] ?? 0 }));
  }

  const items = detailItems ?? [];
  if (items.length === 0) return [];
  return rescaleToTotal(
    items.map((item) => ({ label: item.label, amount: Number(item.amount) || 0 })),
    agreedTotal,
    suggested
  );
}

function deriveEditFields(content: unknown): EditFields {
  const c = (content ?? {}) as Record<string, unknown>;
  const asLines = (v: unknown): string =>
    Array.isArray(v) ? v.join("\n") : typeof v === "string" ? v : "";
  const timeline =
    typeof c.timeline === "string"
      ? c.timeline
      : ((c.timeline as { milestones?: { title?: string }[] })?.milestones ?? [])
        .map((m) => m.title ?? "")
        .filter(Boolean)
        .join("\n");
  return {
    overview:
      (c.project_overview as string) || (c.executive_summary as string) || (c.title as string) || "",
    scope: asLines(c.scope_of_work),
    deliverables: asLines(c.deliverables),
    timeline,
    paymentTerms:
      (c.payment_terms as string) ||
      ((c.terms as { payment_terms?: string })?.payment_terms as string) ||
      "",
    assumptions: (c.assumptions as string) || (c.notes as string) || "",
    validUntil: typeof c.valid_until === "string" ? c.valid_until : "",
    outOfScope: asLines(c.out_of_scope),
    revisionPolicy:
      (c.revision_policy as string) ||
      ((c.terms as { revision_policy?: string })?.revision_policy as string) ||
      "",
  };
}

/**
 * Gộp các trường soạn thảo trở lại thành content shape AI (`BackendProposalContent`), GIỮ
 * NGUYÊN `pricing_detail` — giá không nằm trong phần soạn thảo, nó thuộc về thanh kéo.
 */
function editFieldsToContent(fields: EditFields, prev: unknown): BackendProposalContent {
  const p = (prev ?? {}) as Record<string, unknown>;
  const lines = (v: string) =>
    v.split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    project_overview: fields.overview,
    scope_of_work: lines(fields.scope),
    deliverables: lines(fields.deliverables),
    timeline: fields.timeline,
    pricing: "",
    payment_terms: fields.paymentTerms,
    assumptions: fields.assumptions,
    out_of_scope: lines(fields.outOfScope),
    revision_policy: fields.revisionPolicy,
    // Chỉ ghi khi freelancer THỰC SỰ đặt hạn. Ghi chuỗi rỗng là đè mất mặc định của
    // backend (ngày gửi + 4), và tờ báo giá mất luôn dòng "Hiệu lực đến".  #Huynh
    ...(fields.validUntil ? { valid_until: fields.validUntil } : {}),
    pricing_detail: (p.pricing_detail as BackendProposalContent["pricing_detail"]) ?? null,
    // Mang theo các đợt thanh toán có cấu trúc từ bản trước (AI sinh ra) — ô soạn thảo chỉ
    // sửa `payment_terms` dạng văn xuôi, không đụng tới mốc. Không mang theo là mốc rụng khi
    // lưu -> chốt báo giá xong không sinh được task "Thu tiền:". Cùng cơ chế với pricing_detail.
    payment_milestones:
      (p.payment_milestones as BackendProposalContent["payment_milestones"]) ?? [],
    // Nhãn hạng mục chi phí freelancer sửa ở mục 7 — giữ nguyên khi lưu, y như trên.  #Huynh
    ...(Array.isArray(p.pricing_items)
      ? { pricing_items: p.pricing_items as BackendProposalContent["pricing_items"] }
      : {}),
  };
}

/**
 * Ô nhập giá bằng tay — dùng khi báo giá KHÔNG có gợi ý định giá của AI (deal chưa chấm
 * điểm, chưa có lịch sử để neo). Bộ định giá cố ý không bịa giá trong trường hợp này, nhưng
 * freelancer VẪN phải đặt được một con số để gửi cho khách.  #Huynh
 */
function ManualPriceCard({
  committedPrice,
  onCommit,
  isCommitting,
}: {
  committedPrice: number | null;
  onCommit: (price: number) => void;
  isCommitting: boolean;
}) {
  const [price, setPrice] = useState<number>(committedPrice ?? 0);
  const dirty = price > 0 && price !== committedPrice;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-primary" />
        Giá báo cho khách
      </div>
      <p className="text-xs text-muted-foreground">
        Deal này chưa được AI chấm điểm nên chưa có gợi ý giá. Bạn tự nhập mức muốn chào —
        hoặc bấm "Đánh giá deal" trước để AI đề xuất một khoảng.
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          type="number"
          step={500_000}
          value={price || ""}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
          placeholder="Nhập giá (VND)"
          className="w-48 rounded-md border border-border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus:border-primary"
        />
        {price > 0 && (
          <span className="text-sm font-semibold text-primary">{formatVND(price)}</span>
        )}
        <button
          type="button"
          onClick={() => onCommit(price)}
          disabled={isCommitting || price <= 0 || !dirty}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {dirty ? "Chốt giá này" : "Đã chốt"}
        </button>
      </div>
      {committedPrice != null && committedPrice > 0 && !dirty && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          Đã chốt {formatVND(committedPrice)} — giờ có thể gửi cho khách.
        </p>
      )}
    </div>
  );
}

function buildManualProposalContent(deal: Deal): ProposalContentDTO {
  const total = deal.value > 0 ? deal.value : 0;
  return {
    title: `Báo giá ${deal.projectType}`,
    executive_summary:
      deal.notes?.trim() ||
      `Bản nháp báo giá cho yêu cầu ${deal.projectType}. Freelancer có thể chỉnh lại nội dung trước khi gửi khách.`,
    scope_of_work:
      "Trao đổi chi tiết yêu cầu, thống nhất phạm vi công việc, triển khai theo các hạng mục đã chốt và bàn giao kết quả sau khi nghiệm thu.",
    timeline: {
      milestones: [
        { title: "Xác nhận phạm vi và nội dung cần triển khai" },
        { title: "Triển khai phiên bản đầu tiên" },
        { title: "Chỉnh sửa theo phản hồi và bàn giao" },
      ],
    },
    pricing: {
      currency: "VND",
      total,
      line_items: [{ description: deal.projectType, quantity: 1, unit_price: total, amount: total }],
    },
    terms: {
      payment_terms: "Đề xuất thanh toán 50% khi bắt đầu và 50% sau khi nghiệm thu.",
      revision_policy: "Bao gồm 2 vòng chỉnh sửa trong phạm vi đã thống nhất.",
      ip_ownership: "Quyền sử dụng sản phẩm được bàn giao cho khách hàng sau khi hoàn tất thanh toán.",
    },
    notes: "Bản này được tạo thủ công vì tài khoản hiện chưa dùng được AI. Bạn có thể chỉnh nội dung trước khi gửi.",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RETRY_DELAY_MS = 2500;

/**
 * Số lần gọi AI tối đa cho MỘT lần bấm (tính cả lần đầu).
 *
 * Trước đây không có con số này: `onError` cứ 5xx là hẹn giờ gọi lại, không gì dừng nó. Gặp
 * lỗi dai là quay vòng vô tận — mỗi vòng ~4 giây (1,4s gọi AI + 2,5s chờ), mỗi vòng đốt một
 * lượt hạn mức AI của người dùng và một khoản tiền thật, còn trên màn hình chỉ có một vòng
 * xoay không bao giờ dứt.  #Huynh
 */
const MAX_GENERATE_ATTEMPTS = 3;

export function ProposalModal({
  deal,
  onClose,
  /**
   * Có = mở để XEM LẠI một báo giá đã sinh. Nạp lại bản đó, KHÔNG gọi AI sinh bản mới —
   * bấm "Xem" mà nó đẻ thêm một bản nháp nữa thì vừa tốn quota vừa đè mất nội dung
   * người dùng đang muốn xem.  #Huynh
   */
  existingProposalId = null,
  /** Đổi mỗi lần người dùng bấm mở/Xem — dùng để bung lại panel đã thu nhỏ. */
  openNonce = 0,
}: {
  deal: Deal | null;
  onClose: () => void;
  existingProposalId?: string | null;
  openNonce?: number;
}) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalContent, setProposalContent] = useState<ProposalContentDTO | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  // Cờ thu nhỏ gắn với LẦN MỞ, không phải boolean trần: thu nhỏ không xoá panel khỏi
  // store, nên nếu cờ dính dai thì bấm "Xem" lại panel vẫn nằm im. Nonce đổi = lần mở
  // mới = bung ra.  #Huynh
  const [minimizedOverride, setMinimizedOverride] = useState<{
    nonce: number;
    value: boolean;
  } | null>(null);
  const minimized = minimizedOverride?.nonce === openNonce ? minimizedOverride.value : false;
  const setMinimized = useCallback(
    (value: boolean) => setMinimizedOverride({ nonce: openNonce, value }),
    [openNonce]
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  /** Có sửa gì trong trình soạn thảo mà chưa lưu không. */
  const [dirtyContent, setDirtyContent] = useState(false);
  const cancelRef = useRef(false);
  /** (deal, lần mở) đã sinh bản nháp — chặn StrictMode chạy effect 2 lần. */
  const generatedKeyRef = useRef<string | null>(null);
  /** Mẫu điều khoản freelancer chọn ở màn đầu — ref để lần "Tạo lại"/retry dùng lại. */
  const templateIdRef = useRef<string | null>(null);
  /** Đang hiện màn chọn (báo giá MỚI: chọn bản nháp có sẵn hoặc mẫu điều khoản), chưa sinh. */
  const [choosing, setChoosing] = useState(false);
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  const termTemplates = useTermTemplates("proposal", !existingProposalId);

  // Bản nháp đang có của deal — để màn chọn cho freelancer mở lại một bản thay vì đẻ bản mới.
  // DÙNG ĐÚNG query key của trang chi tiết (`{ deal_id, page_size: 10 }`) nên mở từ đó không
  // phát sinh request thừa, và xoá/sửa bản nháp bên kia là bên này thấy ngay.  #Huynh
  const proposalList = useProposalList({ deal_id: deal?.id, page_size: 10 });
  const draftProposals = useMemo(
    () => (proposalList.data?.data ?? []).filter((item) => item.status === "draft"),
    [proposalList.data]
  );
  /** Mở lại một bản nháp = mở lại chính panel này với `existingProposalId` — đường đã có sẵn. */
  const openPanel = useAIActivityStore((state) => state.openPanel);

  const existing = useProposal(existingProposalId ?? undefined);

  const qc = useQueryClient();
  const freelancerName = useAuthStore((s) => s.user?.fullName ?? "Freelancer");
  const aiGenerate = useAiGenerateProposal();
  const createDraft = useCreateProposal();
  const updateDraft = useUpdateProposal();
  const send = useSendProposal();
  const downloadPdf = useDownloadProposalPdf();
  const [pendingAction, setPendingAction] = useState<"send" | "pdf" | "save" | null>(null);

  // Khối định giá do BE tính. `null` khi deal chưa được chấm điểm và freelancer cũng chưa
  // có lịch sử — lúc đó BE không neo được vào đâu và CỐ Ý không bịa ra con số.  #Huynh
  //
  // SUY RA từ `proposalContent`, KHÔNG giữ state riêng. Trước đây đây là `useState` phải tự
  // tay đồng bộ ở 4 nơi (chốt giá, nháp thủ công, mở lại bản cũ, AI sinh) — và nơi thứ tư,
  // `triggerGenerate.onSuccess`, ĐÃ QUÊN. Hậu quả: AI sinh xong báo giá cho deal "Gym" của
  // Anh Ba Phi với `suggested = 450.000.000` (đo tận nơi: DB có, API trả về đủ), mà màn hình
  // vẫn phán "Deal này chưa được AI chấm điểm nên chưa có gợi ý giá" — nói dối về TIỀN. Mở
  // lại chính báo giá đó thì giá hiện ra, vì đường mở-lại có ghi.
  //
  // Mọi chỗ từng gọi `setPricingDetail` đều `setProposalContent` từ CÙNG một object ngay
  // cạnh, nên suy ra là tương đương tuyệt đối — chỉ khác: không ai quên được nữa.  #Huynh
  const pricingDetail = useMemo<PricingDetail | null>(
    () => proposalContent?.pricing_detail ?? null,
    [proposalContent]
  );

  const commitPrice = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => setProposalPrice(id, price),
    onSuccess: (res) => {
      setProposalContent(res.content);
      setEditFields(deriveEditFields(res.content));

      // BE ghi giá đã chốt vào `deals.estimated_value`. Không làm mới kho deal ở đây thì
      // thẻ deal ngoài Kanban vẫn hiện "0 ₫" cho tới lần tải trang sau — người dùng vừa
      // chốt 40 triệu xong quay ra thấy 0, và không hiểu chuyện gì đang xảy ra.  #Huynh
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["proposal-preview", proposalId] });
      // KHÔNG toast: giá tự lưu khi kéo, mỗi lần kéo mà nhảy một thông báo là tra tấn.
      // Trạng thái "Đang lưu…/Đã lưu" đã hiện ngay cạnh ô giá rồi.
    },
    onError: () => toast.error("Không lưu được giá. Vui lòng thử lại."),
  });

  // Card hiển thị bản XEM TRƯỚC lấy thẳng từ backend — CHÍNH XÁC bản PDF khách sẽ nhận.
  // Trước đây frontend tự dựng HTML bằng `backendContentToHtml`, khác hẳn template PDF của
  // backend về bố cục lẫn câu chữ → nhìn như lừa đảo. Giờ một nguồn duy nhất.  #Huynh
  // Một màn, không tab, không cột: thanh giá mỏng ở trên (thứ duy nhất phải quyết), tờ
  // báo giá chiếm hết phần còn lại (thứ phải thấy). Câu chữ sửa THẲNG trên tờ báo giá —
  // không còn khối "Chỉnh sửa nội dung" riêng, vì gõ vào ô này rồi ngó sang chỗ khác xem
  // kết quả là bắt người ta tự ghép hai thứ đáng ra phải là một.  #Huynh
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewScrollRef = useRef(0);
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sửa mục 7 (chi phí) + mục 8 (mốc thanh toán): hoãn rồi lưu, giống thanh giá.  #Huynh
  const moneyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kéo giá thì hoãn 0.7s rồi mới lưu — không lưu mỗi lần nhích một pixel, nhưng vẫn kịp để
  // bản Xem trước bên dưới hiện ĐÚNG giá đang kéo.
  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Giá đang hiện trên thanh kéo. `null` = người dùng chưa đụng vào → dùng giá AI đề xuất. */
  const [draftPrice, setDraftPrice] = useState<number | null>(null);
  const handlePriceChange = (price: number) => {
    if (!proposalId || price <= 0) return;
    setDraftPrice(price);
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      commitPrice.mutate({ id: proposalId, price });
    }, 700);
  };
  const previewQuery = useQuery({
    queryKey: ["proposal-preview", proposalId],
    queryFn: () => getProposalPreview(proposalId as string),
    enabled: Boolean(proposalId),
    staleTime: 0,
  });

  // Các trường soạn thảo có cấu trúc. KHÔNG cho sửa giá ở đây — giá chỉ đặt qua thanh kéo
  // (PricingPanel), nếu không lại đá nhau như cũ (sửa giá trong chữ, gửi ra giá khác).
  const [editFields, setEditFields] = useState<EditFields>({
    overview: "",
    scope: "",
    deliverables: "",
    timeline: "",
    paymentTerms: "",
    assumptions: "",
    outOfScope: "",
    revisionPolicy: "",
    validUntil: "",
  });

  // Bộ hẹn giờ lưu chạy SAU khi hàm đã trả về, nên closure của nó ôm state CŨ. Hai ref này
  // luôn trỏ vào bản mới nhất để lúc hẹn giờ nổ thì lưu đúng thứ vừa gõ.
  //
  // PHẢI khai ở đây, cạnh chính state chúng bám theo, và TRÊN mọi câu `return` sớm. Tôi đã
  // đặt chúng xuống dưới `if (!deal || minimized) return null` — bấm "Thu nhỏ" là React
  // chạy ít hook hơn lần render trước và nổ trắng màn hình ("Rendered fewer hooks than
  // expected"). Hook không được nằm sau bất kỳ nhánh thoát nào.  #Huynh
  const editFieldsRef = useRef(editFields);
  editFieldsRef.current = editFields;
  const proposalContentRef = useRef(proposalContent);
  proposalContentRef.current = proposalContent;
  const upsertJob = useAIActivityStore((state) => state.upsertJob);
  const updateJob = useAIActivityStore((state) => state.updateJob);
  const removeJob = useAIActivityStore((state) => state.removeJob);
  const cancelJob = useAIActivityStore((state) => state.cancelJob);
  const jobId = deal ? `ai-proposal-${deal.id}` : "";

  function createManualDraft(d: NonNullable<typeof deal>, status?: number) {
    const currentJobId = `ai-proposal-${d.id}`;
    const content = buildManualProposalContent(d);
    createDraft.mutate(
      { deal_id: d.id, content },
      {
        onSuccess: (res) => {
          if (cancelRef.current) return;
          setRetryCount(0);
          setIsGenerating(false);
          setProposalId(res.id);
          setProposalContent(res.content);
          setEditFields(deriveEditFields(res.content));
          // Nhớ id bản nháp vào thẻ job: bấm "Xem" sau này sẽ nạp lại ĐÚNG bản này thay
          // vì gọi AI sinh bản mới.  #Huynh
          updateJob(currentJobId, { resultId: res.id });
          addDealHistoryEntry(d.id, {
            date: new Date().toISOString(),
            text: `Đã tạo bản nháp báo giá thủ công cho "${d.client}" (AI không dùng được).`,
            channel: "message",
          });
          updateJob(currentJobId, {
            status: "success",
            description: "Đã tạo bản nháp thường để bạn chỉnh sửa và gửi khách.",
          });
          toast.info(
            status === 402
              ? "Gói hiện tại chưa dùng được AI, SoloDesk đã tạo bản nháp thường để bạn chỉnh và gửi khách."
              : "Không tạo được bằng AI, SoloDesk đã tạo bản nháp thường để bạn chỉnh tiếp."
          );
        },
        onError: () => {
          if (cancelRef.current) return;
          setIsGenerating(false);
          updateJob(currentJobId, {
            status: "error",
            description: "Không thể tạo bản nháp báo giá.",
            error: "Backend không tạo được bản nháp báo giá. Hãy kiểm tra request proposals.",
          });
          toast.error("Không thể tạo bản nháp báo giá. Vui lòng thử lại.");
        },
      }
    );
  }

  function triggerGenerate(d: NonNullable<typeof deal>, attempt: number) {
    const currentJobId = `ai-proposal-${d.id}`;
    updateJob(currentJobId, {
      status: "running",
      description:
        attempt > 0
          ? `AI đang thử lại lần ${attempt}. Bạn có thể làm việc khác trong lúc chờ.`
          : "AI đang soạn bản nháp báo giá.",
    });
    // StrictMode-safe: dùng mutateAsync + Promise, KHÔNG dùng callback của mutate().
    // Callback truyền vào mutate() bị React Query BỎ QUA nếu observer đã bị StrictMode dọn
    // (dev chạy effect → cleanup → effect) trong lúc request đang bay (~2s) → onSuccess
    // không chạy → vòng xoay quay mãi dù data đã về. Promise của mutateAsync luôn resolve
    // nên onSuccess/onError chắc chắn chạy.  #Huynh
    aiGenerate
      .mutateAsync({
        deal_id: d.id,
        client_name: d.client,
        project_type: d.projectType,
        project_description: d.notes?.trim() || d.projectType,
        budget: d.budgetLabel ?? (d.value > 0 ? formatVND(d.value) : undefined),
        service_category: d.serviceCategory ?? d.projectType,
        pricing_tier: d.pricingTier ?? "standard",
        freelancer_name: freelancerName,
        // Mẫu điều khoản đã chọn ở màn đầu (null = AI tự viết). Ref để retry/tạo-lại dùng lại.
        template_id: templateIdRef.current ?? undefined,
      })
      .then(
        (res) => {
          if (cancelRef.current) return;
          setRetryCount(0);
          setIsGenerating(false);
          setProposalId(res.id);
          setProposalContent(res.content);
          setEditFields(deriveEditFields(res.content));
          // Nhớ id bản nháp vào thẻ job: bấm "Xem" sau này sẽ nạp lại ĐÚNG bản này thay
          // vì gọi AI sinh bản mới.  #Huynh
          updateJob(currentJobId, { resultId: res.id });
          addDealHistoryEntry(d.id, {
            date: new Date().toISOString(),
            text: `AI đã soạn bản nháp báo giá cho "${d.client}".`,
            channel: "message",
          });
          updateJob(currentJobId, {
            status: "success",
            description: "Đã tạo xong bản nháp báo giá. Bấm Xem để chỉnh sửa và gửi khách.",
          });
        },
        (err: unknown) => {
          if (cancelRef.current) return;
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status && status < 500) {
            createManualDraft(d, status);
            return;
          }

          // KHÔNG có status = hết giờ chờ hoặc đứt mạng. TUYỆT ĐỐI không gọi lại.
          //
          // Không có status nghĩa là ta không biết server đã làm tới đâu — và với lệnh gọi
          // AI thì khả năng cao là nó ĐÃ LÀM XONG: ghi tiền, trừ hạn mức, tạo hẳn một bản
          // báo giá; chỉ là câu trả lời không về kịp. Gọi lại là làm lại tất cả từ đầu,
          // tính tiền lần nữa, và đẻ thêm một bản báo giá thứ hai — đúng lỗi "Tài liệu cầm
          // 2 bản" đã bị báo. Đây cũng chính là lý do tài khoản test cạn hạn mức AI rồi ăn
          // 429: vòng thử lại tự đốt.
          //
          // Việc đúng phải làm là HỎI LẠI xem bản nháp có tồn tại không, chứ không đoán.
          if (!status) {
            setIsGenerating(false);
            setRetryCount(0);
            toast.error(
              "Chờ AI quá lâu. Bản nháp có thể đã được tạo — đóng rồi mở lại để kiểm tra trước khi tạo mới."
            );
            updateJob(currentJobId, {
              status: "error",
              description: "Chờ quá lâu. Mở lại để xem bản nháp đã có chưa.",
            });
            return;
          }

          // 5xx = server nói thẳng là nó hỏng, tức là KHÔNG có gì được tạo → gọi lại an toàn.
          // Nhưng phải CÓ ĐIỂM DỪNG: trước đây không giới hạn số lần, hỏng dai là quay vòng
          // vô tận — mỗi vòng ~4 giây, đốt một lượt hạn mức AI, và người dùng chỉ thấy vòng
          // xoay không bao giờ dứt.  #Huynh
          if (attempt + 1 >= MAX_GENERATE_ATTEMPTS) {
            setIsGenerating(false);
            setRetryCount(0);
            createManualDraft(d, status);
            return;
          }
          setRetryCount(attempt + 1);
          setTimeout(() => {
            if (cancelRef.current) return;
            triggerGenerate(d, attempt + 1);
          }, RETRY_DELAY_MS);
        },
      );
  }

  useEffect(() => {
    if (!deal) return;
    cancelRef.current = false;

    // Mở để XEM LẠI: nạp bản nháp đã có, mở sẵn ra, không gọi AI.
    //
    // PHẢI tắt `choosing`: chọn một bản nháp ở màn chọn = mở lại chính panel này kèm
    // `existingProposalId`, mà React tái dùng đúng component instance (cùng vị trí, cùng
    // loại) nên state cũ còn nguyên — không tắt là màn chọn nằm đè lên bản nháp vừa mở, bấm
    // xong tưởng như không có gì xảy ra.  #Huynh
    if (existingProposalId) {
      setChoosing(false);
      setProposalId(existingProposalId);
      setIsGenerating(false);
      return;
    }

    // MỘT LẦN MỞ = MỘT BẢN NHÁP.
    //
    // Effect này gọi mutation, mà React StrictMode (dev) chạy effect HAI LẦN khi mount
    // (effect → cleanup → effect). Mỗi lần gọi `/proposals/generate-from-deal` là backend
    // tạo HẲN một bản báo giá mới (`version_number = count + 1`) — nên một cú bấm đẻ ra
    // "Báo giá lần 1" và "Báo giá lần 2", đồng thời ĐỐT 2 LƯỢT AI.
    //
    // `cancelRef` vốn được đặt để chặn, nhưng lần chạy thứ hai lại reset nó về `false` nên
    // vô hiệu. Ref dưới đây bám theo (deal, lần mở) — nó SỐNG QUA cả hai lần chạy vì cùng
    // một component instance, nên lần thứ hai bị chặn. Nút "Tạo lại" gọi thẳng
    // `triggerGenerate`, không qua effect này, nên vẫn tạo bản mới bình thường.  #Huynh
    // Đợi biết CÓ GÌ ĐỂ CHỌN hay không rồi mới quyết — cả mẫu điều khoản lẫn bản nháp đang
    // có. Chưa tra xong thì khoan làm gì, sinh vội là đốt một lượt AI cho bản mà freelancer
    // có thể chỉ muốn mở lại bản cũ.
    if (!termTemplates.isFetched || !proposalList.isFetched) return;

    const runKey = `${deal.id}:${openNonce}`;
    if (generatedKeyRef.current === runKey) return;
    generatedKeyRef.current = runKey;

    // Có mẫu của admin HOẶC có bản nháp đang dở → hiện màn chọn, chưa sinh gì.
    //
    // Trước đây có bản nháp thì trang chi tiết tự nhét thẳng id vào và nhảy luôn vào bản đó —
    // freelancer không có đường nào để ngó qua các bản nháp rồi chọn, cũng không có đường tạo
    // bản mới khi đang có nháp.  #Huynh
    if ((termTemplates.data ?? []).length > 0 || draftProposals.length > 0) {
      setChosenTemplateId(null);
      setChoosing(true);
      return () => { cancelRef.current = true; };
    }

    // Không có gì để chọn → sinh thẳng như cũ, không chen một cú bấm vô nghĩa.
    templateIdRef.current = null;
    startGenerate(deal);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deal?.id,
    existingProposalId,
    openNonce,
    termTemplates.isFetched,
    proposalList.isFetched,
    draftProposals.length,
  ]);

  // Bắt đầu sinh: mở job nền + báo đang chạy + gọi AI. Tách ra để dùng chung cho đường tự
  // sinh (không mẫu) lẫn đường sau khi chọn mẫu.
  function startGenerate(d: NonNullable<typeof deal>) {
    upsertJob({
      id: `ai-proposal-${d.id}`,
      kind: "proposal_generation",
      title: `Tạo báo giá cho ${d.client}`,
      description: "AI đang soạn bản nháp báo giá. Bạn có thể tiếp tục làm việc khác.",
      entityLabel: d.projectType,
      entityId: d.id,
      status: "running",
    });
    setIsGenerating(true);
    setRetryCount(0);
    setProposalContent(null);
    triggerGenerate(d, 0);
  }

  // Nạp nội dung của bản nháp đã có (khi mở để xem lại).
  //
  // Nội dung có thể ở MỘT TRONG HAI shape: bản AI vừa sinh (`project_overview`,
  // `pricing` là chuỗi) hoặc bản đã lưu (`ProposalContentDTO`, `pricing` là object). Cả
  // hai đều mang theo `pricing_detail` — khối đó phải được khôi phục, nếu không mở lại báo
  // giá là mất bảng định giá và không chỉnh được giá nữa.  #Huynh
  useEffect(() => {
    if (!existingProposalId || !existing.data || !deal) return;
    const content = existing.data.content as
      | (ProposalContentDTO & { pricing_detail?: PricingDetail | null })
      | BackendProposalContent
      | null;
    if (!content) return;

    setProposalContent(content as ProposalContentDTO);
    setEditFields(deriveEditFields(content));
  }, [existing.data, existingProposalId, deal]);

  if (!deal || minimized) return null;


  // Chỉ chặn khi CÓ khối định giá mà CHƯA chốt. Báo giá tự soạn tay không có khối đó —
  // người dùng đã tự viết giá vào nội dung rồi, chặn họ lại là vô lý.
  // Phải có giá đã chốt mới gửi được — dù giá đến từ gợi ý AI (thanh kéo) hay gõ tay.
  // Trước đây chỉ chặn khi CÓ pricing_detail mà chưa chốt; báo giá KHÔNG có pricing_detail
  // thì lọt lưới, gửi cho khách mà chẳng có giá nào.  #Huynh
  const committedPrice = pricingDetail?.final_price ?? null;
  // Có gợi ý định giá của AI (thanh kéo) hay không. Không thì cho gõ tay.
  const hasAiPricing = Boolean(pricingDetail && (pricingDetail.suggested ?? 0) > 0);

  /** Giá sắp gửi cho khách — ưu tiên giá đã chốt, rồi tới tổng có sẵn trong nội dung. */
  // Giá sắp gửi, theo thứ tự: đang kéo → đã lưu → AI đề xuất → tổng có sẵn → giá trị deal.
  //
  // `pricingDetail.suggested` PHẢI có trong chuỗi này. Bỏ nó ra là ai chấp nhận luôn giá AI
  // đề xuất (không kéo thanh) sẽ không có giá nào để gửi — nút "Gửi" xám vĩnh viễn dù màn
  // hình đang hiện tổng 450 triệu. Đúng lỗi tôi vừa gây ra khi bỏ nút "Chốt giá".  #Huynh
  const priceToSend =
    draftPrice ??
    committedPrice ??
    pricingDetail?.suggested ??
    ((typeof proposalContent?.pricing === "object" ? proposalContent.pricing?.total : 0) ||
      deal.value ||
      0);

  // Có gợi ý AI (một KHOẢNG) thì phải CHỌN một điểm trong khoảng (final_price). Không có
  // gợi ý thì chỉ cần một con số > 0 (giá gõ tay, hoặc tổng đã có sẵn). Trước đây gating quá
  // chặt, chặn cả báo giá đã có sẵn tổng giá.  #Huynh
  // Chỉ chặn khi THỰC SỰ chưa có giá nào. Không bắt "phải chốt" nữa — việc con người quyết
  // nằm ở hộp thoại xác nhận lúc gửi.
  const priceNotCommitted = priceToSend <= 0;

  /**
   * Lưu bản nháp.
   *
   * Trước đây KHÔNG có nút này: nội dung chỉ được lưu lúc bấm "Gửi" hoặc "Tải PDF". Người
   * dùng sửa nội dung, đóng cửa sổ để đi làm việc khác, quay lại thì mất sạch — và không
   * có gì trên màn hình báo trước điều đó.  #Huynh
   */
  /**
   * Nội dung để LƯU/GỬI: gộp các trường soạn thảo có cấu trúc, GIỮ NGUYÊN `pricing_detail`.
   * Không còn đọc từ `editorRef` (contentEditable) — giá không nằm trong chữ nữa, nên
   * không thể lệch giữa "chữ hiện ra" và "giá gửi đi".  #Huynh
   */
  const buildContentToSave = () =>
    normalizeProposalContentForApi(
      editFieldsToContent(editFieldsRef.current, proposalContentRef.current),
      deal
    );

  /**
   * Người dùng gõ xong một mục rồi rời chuột -> lưu, không kèm thông báo.
   *
   * CỐ Ý không làm mới bản xem trước ở đây: chữ trên màn CHÍNH LÀ thứ họ vừa gõ, nạp lại
   * iframe chỉ để vẽ ra đúng chừng đó, đổi lại là mất chỗ đang xem. Chỉ khi GIÁ đổi mới
   * cần vẽ lại, vì bảng chi phí phải chia lại theo tổng mới.  #Huynh
   */
  const saveContentSilently = () => {
    if (!proposalId) return;
    updateDraft.mutate(
      { proposalId, payload: { deal_id: deal.id, content: buildContentToSave() } },
      {
        onSuccess: () => setDirtyContent(false),
        onError: () => toast.error("Không lưu được nội dung vừa sửa. Vui lòng thử lại."),
      }
    );
  };

  /**
   * Lưu thay đổi mục 7/8 RỒI làm mới bản xem trước — khác `saveContentSilently` ở chỗ nó
   * refetch preview: bảng chi phí/thanh toán do SERVER dựng, không phải thứ người dùng gõ
   * trực tiếp lên tờ giấy, nên phải vẽ lại mới thấy.  #Huynh
   */
  const saveMoneyAndRefresh = () => {
    if (!proposalId) return;
    updateDraft.mutate(
      { proposalId, payload: { deal_id: deal.id, content: buildContentToSave() } },
      {
        onSuccess: () => {
          setDirtyContent(false);
          qc.invalidateQueries({ queryKey: ["proposal-preview", proposalId] });
        },
        onError: () => toast.error("Không lưu được thay đổi. Vui lòng thử lại."),
      }
    );
  };

  /** Ghi một mảnh nội dung TIỀN (pricing_items / payment_milestones) vào draft rồi hoãn lưu. */
  const patchMoneyContent = (patch: Record<string, unknown>) => {
    if (!proposalId) return;
    const next = { ...(proposalContentRef.current ?? {}), ...patch } as ProposalContentDTO;
    proposalContentRef.current = next;
    setProposalContent(next);
    setDirtyContent(true);
    if (moneyTimerRef.current) clearTimeout(moneyTimerRef.current);
    moneyTimerRef.current = setTimeout(saveMoneyAndRefresh, 700);
  };

  /**
   * Nguồn cho editor mục 7 — LUÔN trả về hạng mục kèm số tiền.
   *
   * Ba trạng thái phải gộp về một:
   * 1. Freelancer đã gõ tiền → dùng nguyên (dạng `{label, amount}`).
   * 2. Bản nháp CŨ chỉ có nhãn (`string[]`) → chia đều theo giá chốt, đúng như backend làm.
   * 3. Chưa sửa gì → lấy nhãn + tiền từ bộ định giá, CO GIÃN theo giá chốt — mirror nhánh
   *    dự phòng của backend (`pdf_content._structured_pricing`).
   *
   * Trạng thái 3 mới là chỗ từng sai: panel cũ luôn hiện chia đều, trong khi tờ báo giá giữ
   * tỷ lệ bộ định giá. Kéo giá lên 500tr thì trái hiện "125tr × 4" còn phải in
   * "200/150/75/75" — hai bên nói hai kiểu, và người dùng tin bên nào cũng sai.  #Huynh
   */
  // KHÔNG dùng `useMemo`: chỗ này nằm SAU `if (!deal || minimized) return null` nên hook sẽ
  // chạy không đều giữa các lần render. Mà việc tính cũng chỉ là vài phép map trên dăm dòng —
  // rẻ hơn nhiều so với cái bẫy vừa nêu.  #Huynh
  const costItems = deriveCostItems(
    proposalContent?.pricing_items,
    pricingDetail?.line_items,
    priceToSend,
    pricingDetail?.suggested ?? 0
  );

  const costIssue = costItemsIssue(costItems, priceToSend);
  const milestoneRows: PaymentMilestone[] = proposalContent?.payment_milestones ?? [];
  // Tổng các đợt không bằng 100% thì KHÔNG gửi được — backend cũng chặn (xem
  // `ProposalsService.transition_status`), đây là lớp lịch sự để người dùng biết trước lý do
  // thay vì bấm gửi rồi ăn một thông báo lỗi.  #Huynh
  const milestoneIssue = paymentPercentIssue(milestoneRows);

  /** Một mục trong tờ báo giá vừa được sửa xong (người dùng rời khỏi ô). */
  const handleInlineFieldChange = (field: string, value: string) => {
    const key = INLINE_FIELD_MAP[field];
    if (!key || !proposalId) return;
    // Bấm vào rồi bấm ra mà không sửa gì cũng nổ sự kiện blur — không lọc thì mỗi lần
    // liếc qua một mục là một lượt ghi xuống server.
    if (editFieldsRef.current[key] === value) return;

    const next = { ...editFieldsRef.current, [key]: value };
    editFieldsRef.current = next;
    setEditFields(next);
    setDirtyContent(true);

    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    contentTimerRef.current = setTimeout(saveContentSilently, 800);
  };

  /**
   * iframe nạp xong -> bật chế độ sửa tại chỗ.
   *
   * Tài liệu cũ bị vứt nguyên mỗi lần `srcDoc` đổi nên không cần gỡ listener, nhưng CHỖ
   * ĐANG XEM thì phải tự giữ: kéo giá là tờ báo giá vẽ lại, không giữ thì nó nhảy về đầu
   * trang trong khi người dùng đang nhìn mục 7.
   */
  const handlePreviewLoad = () => {
    const doc = previewRef.current?.contentDocument;
    if (!doc) return;

    attachInlineEdit(doc, handleInlineFieldChange, (label) =>
      toast.error(`${label}: ngày không hợp lệ. Nhập kiểu 24/07/2026.`)
    );

    if (previewScrollRef.current > 0 && doc.scrollingElement) {
      doc.scrollingElement.scrollTop = previewScrollRef.current;
    }
    doc.addEventListener("scroll", () => {
      previewScrollRef.current = doc.scrollingElement?.scrollTop ?? 0;
    });
  };

  const handleSaveDraft = () => {
    if (!proposalId) return;
    const contentToSave = buildContentToSave();

    setPendingAction("save");
    updateDraft.mutate(
      { proposalId, payload: { deal_id: deal.id, content: contentToSave } },
      {
        onSuccess: () => {
          setPendingAction(null);
          setDirtyContent(false);
          qc.invalidateQueries({ queryKey: ["proposal-preview", proposalId] });
          toast.success("Đã lưu bản nháp.");
        },
        onError: () => {
          setPendingAction(null);
          toast.error("Không lưu được bản nháp. Vui lòng thử lại.");
        },
      }
    );
  };

  const handleSend = async () => {
    if (!proposalId) return;
    const contentToSave = buildContentToSave();

    setPendingAction("send");

    // Chốt giá NGAY TRƯỚC KHI GỬI nếu chưa khớp — bao gồm cả trường hợp người dùng chấp
    // nhận luôn giá AI đề xuất mà không kéo thanh (lúc đó `final_price` vẫn trống, nhưng
    // họ vừa bấm xác nhận đúng con số đó trong hộp thoại).  #Huynh
    if (priceToSend > 0 && committedPrice !== priceToSend) {
      try {
        await setProposalPrice(proposalId, priceToSend);
      } catch {
        setPendingAction(null);
        toast.error("Không lưu được giá trước khi gửi. Vui lòng thử lại.");
        return;
      }
    }
    // Backend Swagger hiện chỉ nhận ProposalContentDTO chuẩn, nên FE chuẩn hóa payload trước khi khóa và gửi.
    updateDraft.mutate({ proposalId, payload: { deal_id: deal.id, content: contentToSave } }, {
      onSuccess: () => {
        send.mutate(proposalId, {
          onSuccess: () => {
            setPendingAction(null);
            toast.success("Đã gửi báo giá cho khách hàng.");
            addDealHistoryEntry(deal.id, {
              date: new Date().toISOString(),
              text: `Đã gửi báo giá AI cho khách "${deal.client}".`,
              channel: "email",
            });
            // Làm mới kho deal DÙ chuyển cột có lỗi hay không. Trước đây `.catch(() => {})`
            // nuốt lỗi im lặng VÀ bỏ luôn cả invalidate — deal chuyển cột hỏng thì thẻ ngoài
            // Kanban vẫn hiện giá 0 và đứng nguyên cột cũ, không một dòng báo nào.  #Huynh
            updateDealStage(deal.id, "proposal_sent")
              .catch(() => {
                toast.warning(
                  "Đã gửi báo giá, nhưng không chuyển được deal sang cột \"Đã gửi báo giá\". Hãy kéo thẻ sang thủ công."
                );
              })
              .finally(() => qc.invalidateQueries({ queryKey: ["deals"] }));
            if (jobId) removeJob(jobId);
            onClose();
          },
          onError: () => {
            setPendingAction(null);
            toast.error("Gửi báo giá thất bại. Vui lòng thử lại.");
          },
        });
      },
      onError: () => {
        setPendingAction(null);
        toast.error("Không thể lưu nội dung báo giá trước khi gửi. Vui lòng thử lại.");
      },
    });
  };

  // BE render PDF từ nội dung đã lưu trên server, nên phải lưu bản nháp trước —
  // nếu không, người dùng tải về bản PDF thiếu đúng những gì họ vừa sửa trong editor.
  const handleDownloadPdf = () => {
    if (!proposalId) return;
    const contentToSave = buildContentToSave();

    setPendingAction("pdf");
    updateDraft.mutate({ proposalId, payload: { deal_id: deal.id, content: contentToSave } }, {
      onSuccess: () => {
        downloadPdf.mutate(
          { proposalId, filename: `bao-gia-${slugifyFilename(deal.client)}.pdf` },
          {
            onSuccess: () => {
              setPendingAction(null);
              addDealHistoryEntry(deal.id, {
                date: new Date().toISOString(),
                text: `Đã tải báo giá dạng PDF cho "${deal.client}".`,
                channel: "message",
              });
              toast.success("Đã tải báo giá PDF.");
            },
            onError: () => {
              setPendingAction(null);
              toast.error("Không tải được PDF. Vui lòng thử lại.");
            },
          }
        );
      },
      onError: () => {
        setPendingAction(null);
        toast.error("Không thể lưu nội dung báo giá trước khi xuất PDF. Vui lòng thử lại.");
      },
    });
  };

  const handleRegenerate = () => {
    if (!deal) return;
    cancelRef.current = false;
    setProposalId(null);
    setProposalContent(null);
    setIsGenerating(true);
    setRetryCount(0);
    triggerGenerate(deal, 0);
  };

  // Gửi và xuất PDF đều đi qua updateDraft trước, nên không thể phân biệt bằng
  // mutation flag — theo dõi hành động đang chạy một cách tường minh.
  const isLoading = isGenerating;
  const isDownloading = pendingAction === "pdf";
  const isSending = pendingAction === "send";

  function handleClose() {
    // Sửa dở mà đóng thì TỰ LƯU, không hỏi.
    //
    // Trước đây tôi bật một hộp thoại "Bỏ những thay đổi chưa lưu?" — nhưng đó là bắt người
    // dùng gánh một quyết định mà máy tự lo được. Đây là BẢN NHÁP: lưu lại chẳng mất gì,
    // còn hỏi thì vừa phiền vừa dễ bấm nhầm "Bỏ" rồi mất công gõ lại.  #Huynh
    if (dirtyContent && proposalId && deal) {
      updateDraft.mutate({ proposalId, payload: { deal_id: deal.id, content: buildContentToSave() } });
    }
    if (jobId) removeJob(jobId);
    onClose();
  }

  function confirmCancelGeneration() {
    cancelRef.current = true;
    setIsGenerating(false);
    setCancelDialogOpen(false);
    if (jobId) {
      cancelJob(jobId);
      removeJob(jobId);
    }
    toast.info("Đã hủy tác vụ tạo báo giá. Nếu backend trả kết quả muộn, FE sẽ bỏ qua.");
    onClose();
  }

  return (
    <>
    // Bấm ra ngoài = thu nhỏ (giữ nội dung), không đóng hẳn.  #Huynh
      <div
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in"
        onClick={() => setMinimized(true)}
      >
        {/* CHẶN nổi bọt: mọi click bên trong khung (kể cả gõ vào trình soạn thảo) đều nổi
          lên tới nền, nên thiếu dòng này là bấm vào đâu cũng bị hiểu là "bấm ra ngoài"
          rồi panel tự thu nhỏ — không sửa nội dung được chữ nào.  #Huynh */}
        <div
          // Xong rồi thì `h-[92vh]` — chiều cao THẬT, chứ `max-h` thì khung co theo nội dung,
          // mà nội dung lại là một <iframe>: thẻ này không tự cao theo thứ bên trong nên rơi
          // về mặc định 150px, kéo tờ báo giá teo thành một khe hẹp. Khung xem trước hồi
          // trước là `h-[560px]` số cứng nên không lộ; đổi sang `flex-1` là lòi ra ngay.
          //
          // Còn lúc đang chờ AI thì để khung tự co: dựng sẵn một hộp cao ngoẵng rỗng không
          // suốt mấy chục giây chỉ để chứa cái vòng xoay là tệ hơn.  #Huynh
          // Rộng 1360px = cột trái 400 + tờ báo giá ~820. Tờ báo giá do BE dựng có
          // `max-width: 780px` nên ~820 là ĐỦ để nó hiện trọn vẹn — hồi một cột, iframe rộng
          // ~1100px chỉ để phí ~300px viền trắng hai bên. Chỗ cho cột trái lấy từ đó ra, không
          // cắt của tờ giấy chữ nào.  #Huynh
          className={`w-full max-w-[1360px] flex flex-col bg-card rounded-2xl shadow-2xl border border-border overflow-hidden ${isLoading ? "max-h-[92vh]" : "h-[92vh]"
            }`}
          onClick={(event) => event.stopPropagation()}
        >

          {/* Header */}
          <div className="bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">Báo Giá AI · {deal.client}</div>
                <div className="text-xs text-muted-foreground">Bản nháp tự động bằng tiếng Việt — có thể chỉnh sửa trước khi gửi</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isGenerating && (
                <button
                  type="button"
                  onClick={() => setCancelDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  Hủy tác vụ
                </button>
              )}
              {/* Nút cửa sổ: CHỈ biểu tượng (nhãn ở tooltip + aria-label), thống nhất với mọi
                modal khác. "Hủy tác vụ" ở trên cố ý giữ chữ — xem AIPanel.  #Huynh */}
              <WindowControlButton
                icon={Minus}
                label="Thu nhỏ"
                onClick={() => setMinimized(true)}
              />
              <WindowControlButton
                icon={X}
                label="Đóng"
                onClick={isGenerating ? () => setMinimized(true) : handleClose}
              />
            </div>
          </div>

          {/* Màn chọn trước khi sinh: mở lại bản nháp đang dở, HOẶC tạo bản mới theo mẫu. */}
          {choosing ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
              {/* ① BẢN NHÁP ĐANG CÓ — để TRÊN phần chọn mẫu, vì "làm tiếp cái đang dở" là
                việc thường gặp hơn "đẻ thêm bản mới", và mỗi bản mới là một lượt AI.  #Huynh */}
              {draftProposals.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm text-muted-foreground">
                    Bạn đang có bản nháp chưa gửi. Mở lại để chỉnh tiếp (sửa giá, mốc thanh
                    toán, nội dung) thay vì tạo bản mới.
                  </p>
                  <div className="mt-2 space-y-2">
                    {draftProposals.map((draft) => {
                      const price =
                        draft.content?.pricing_detail?.final_price ??
                        (typeof draft.content?.pricing === "object"
                          ? draft.content.pricing?.total
                          : undefined);
                      return (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() =>
                            deal &&
                            openPanel({
                              kind: "proposal_generation",
                              dealId: deal.id,
                              proposalId: draft.id,
                            })
                          }
                          className="flex w-full items-center gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary/40"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                            <Pencil className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              Báo giá lần {draft.version_number} · bản nháp
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              Tạo {new Date(draft.created_at).toLocaleDateString("vi-VN")}
                              {price ? ` · ${formatVND(price)}` : " · chưa chốt giá"}
                            </span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      hoặc tạo bản mới
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

              {/* ② TẠO BẢN MỚI — chọn mẫu điều khoản (hoặc để AI tự viết). */}
              <DocTemplateChooser
                templates={termTemplates.data ?? []}
                value={chosenTemplateId}
                onChange={setChosenTemplateId}
                docLabel="báo giá"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    templateIdRef.current = chosenTemplateId;
                    setChoosing(false);
                    if (deal) startGenerate(deal);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4" /> Tạo báo giá
                </button>
              </div>
            </div>
          ) : /* Loading state */ isLoading ? (
            <div className="p-16 text-center flex-1 flex flex-col justify-center items-center" role="status" aria-label="Đang tạo báo giá">
              {/* Vòng xoay ÔM QUANH logo, không nấp sau nó.
                  Trước đây nó là badge 20px ghim ở góc phải-dưới (`-bottom-1 -right-1`) và tô
                  `text-primary` — TRÙNG y hệt `bg-primary` của chính ô logo nó đè lên. Phần nằm
                  trên logo là xanh-trên-xanh nên tàng hình, chỉ còn mẩu cung thò ra ngoài: nhìn
                  như vòng xoay bị logo nuốt mất.

                  Cỡ 112px là ĐO mà chọn, không phải áng: cung của `Loader2` có bán kính 9 trên
                  viewBox 24, nên ở 112px nó vẽ vòng bán kính 42px; ô logo bo `rounded-2xl` chiếm
                  bán kính ~33px → hở ~9px. Bản 96px chỉ hở ~3px, chụp ra thấy vòng gần chạm góc
                  logo, nhìn chật.  #Huynh */}
              <div className="relative grid h-28 w-28 place-items-center">
                <Loader2 className="absolute h-28 w-28 animate-spin text-primary/40" strokeWidth={1.5} />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <Sparkles className="h-7 w-7" />
                </div>
              </div>
              <div className="text-sm font-medium mt-4">
                {retryCount > 0 ? `AI đang bận, đang thử lại lần ${retryCount}...` : "AI đang soạn báo giá..."}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Quá trình này có thể mất vài chục giây</div>
            </div>
          ) : (
            <>
              {/* HAI CỘT: trái = những thứ phải QUYẾT (giá, hạng mục chi phí, mốc thanh toán),
                phải = tờ báo giá để REVIEW. Trước đây tất cả xếp chung một cột dọc, nên mở "Vì
                sao giá này?" hay panel sửa tiền là đẩy tờ báo giá xuống gần hết — freelancer phải
                gập lại mới xem được chính thứ mình vừa sửa. Hai cột cuộn ĐỘC LẬP: bên trái dài
                bao nhiêu cũng không ăn một pixel nào của bên phải.  #Huynh */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card text-foreground lg:flex-row">
                {/* CỘT TRÁI — khu quyết định. `max-h-[45%]` là để lo cho màn HẸP (<1024px), lúc
                  hai cột buộc phải xếp chồng: khu này bị chặn chiều cao và tự cuộn, nên tờ báo
                  giá luôn còn ≥55% khung. Không có nó là lỗi cũ tái diễn nguyên si trên laptop
                  nhỏ.  #Huynh */}
                <aside className="flex max-h-[45%] shrink-0 flex-col gap-4 overflow-y-auto border-b border-border p-5 lg:max-h-none lg:w-[400px] lg:border-b-0 lg:border-r">
                  {/* ① GIÁ — thứ duy nhất phải quyết. Căn cứ nằm sau "Vì sao giá này?". */}
                  {proposalId && hasAiPricing && pricingDetail && (
                    <PricingPanel
                      key={`${proposalId}-${pricingDetail.suggested}`}
                      detail={pricingDetail}
                      isSaving={commitPrice.isPending}
                      onChange={handlePriceChange}
                    />
                  )}
                  {proposalId && !hasAiPricing && (
                    <ManualPriceCard
                      committedPrice={committedPrice ?? (priceToSend > 0 ? priceToSend : null)}
                      isCommitting={commitPrice.isPending}
                      onCommit={(price) => commitPrice.mutate({ id: proposalId, price })}
                    />
                  )}

                  {/* ①b CHI PHÍ & MỐC THANH TOÁN — LUÔN MỞ, không còn nút gập. Gập chỉ tồn tại
                    hồi mọi thứ chen nhau trong một cột; giờ có cột riêng thì bắt bấm thêm một
                    cái để thấy bảng điều khiển là phiền vô cớ. Sửa tới đâu tờ báo giá bên phải
                    refetch vẽ lại mục 7/8 tới đó. */}
                  {proposalId && (
                    <>
                      <div className="border-t border-border pt-4">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Hạng mục chi phí (mục 7)
                        </div>
                        <LineItemsEditor
                          items={costItems}
                          agreedTotal={priceToSend}
                          onChange={(items) => patchMoneyContent({ pricing_items: items })}
                        />
                      </div>
                      <div className="border-t border-border pt-4">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Mốc thanh toán (mục 8)
                        </div>
                        <MilestonesEditor
                          milestones={milestoneRows}
                          onChange={(milestones) =>
                            patchMoneyContent({ payment_milestones: milestones })
                          }
                        />
                      </div>
                    </>
                  )}
                </aside>

                {/* CỘT PHẢI — TỜ BÁO GIÁ, do server dựng, đúng bản khách nhận. Bấm vào chữ là sửa
                  ngay tại chỗ; bên dưới vẫn là dữ liệu có cấu trúc chứ không phải một cục HTML. */}
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20 px-5 pb-4 pt-3">
                  <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Bản khách sẽ nhận
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {dirtyContent ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Đang lưu…
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3 w-3" /> Bấm vào chữ để sửa ngay trên tờ báo giá
                        </>
                      )}
                    </span>
                  </div>
                  {previewQuery.isLoading ? (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : previewQuery.data ? (
                    <iframe
                      ref={previewRef}
                      onLoad={handlePreviewLoad}
                      title="Báo giá — bấm vào chữ để sửa"
                      srcDoc={previewQuery.data}
                      className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
                    />
                  ) : (
                    <p className="flex-1 py-16 text-center text-sm text-muted-foreground">
                      Chưa có bản xem trước.
                    </p>
                  )}
                </section>
              </div>

              {/* Footer — MỘT hành động chính. "Tạo lại"/"Tải PDF" là phụ, để nhạt.  #Huynh */}
              <div className="border-t border-border p-4 bg-card flex gap-2 shrink-0">
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading || isSending || isDownloading}
                  title="AI soạn lại bản nháp khác"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" /> Tạo lại
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={PDF_BLOCKED_REASON !== null || !proposalId || isDownloading || isSending}
                  title={PDF_BLOCKED_REASON ?? "Lưu bản nháp rồi tải PDF do server render"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isDownloading ? "Đang tạo PDF..." : "Tải PDF"}
                  {PDF_BLOCKED_REASON && (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                      Chờ BE
                    </span>
                  )}
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={!proposalId || isSending || isDownloading || pendingAction === "save"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingAction === "save" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {dirtyContent ? "Lưu nháp *" : "Lưu nháp"}
                </button>

                {/* Chưa chốt giá thì KHÔNG gửi được. Gửi cho khách một bản ghi "87 – 162 triệu"
                  là tự bắn vào chân: khách chỉ nhìn con số nhỏ nhất, và mọi thương lượng
                  sau đó bắt đầu từ đáy. BE cũng chặn (409) — đây chỉ là lớp lịch sự.  #Huynh */}
                <button
                  onClick={() => setSendDialogOpen(true)}
                  disabled={
                    !proposalId ||
                    isSending ||
                    isDownloading ||
                    priceNotCommitted ||
                    Boolean(milestoneIssue) ||
                    Boolean(costIssue)
                  }
                  title={
                    priceNotCommitted
                      ? "Hãy chốt mức giá bạn muốn chào trước khi gửi cho khách."
                      : (milestoneIssue?.message ?? costIssue?.message ?? undefined)
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSending
                    ? "Đang xử lý..."
                    : priceNotCommitted
                      ? "Hãy đặt giá trước"
                      : milestoneIssue
                        ? `Mốc thanh toán đang ${milestoneIssue.total}%`
                        : costIssue
                          ? "Hạng mục chi phí chưa khớp giá"
                          : "Lưu & gửi cho khách hàng"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Gửi báo giá là hành động KHÔNG LÙI ĐƯỢC và dính tới TIỀN: bản này đi ra ngoài cho
          khách hàng thật, và deal chuyển sang cột "Đã gửi báo giá". Bấm nhầm một cái là
          khách nhận được con số sai — nên phải nhắc lại con số đó thật to trước khi gửi.
          #Huynh */}
      <ConfirmDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        title={`Gửi báo giá ${formatVND(priceToSend)} cho ${deal.client}?`}
        description={
          `Bạn đang nhận dự án "${deal.projectType}" với giá ${formatVND(priceToSend)}. ` +
          `Bản báo giá sẽ được gửi cho khách và deal chuyển sang cột "Đã gửi báo giá". ` +
          `Hãy kiểm tra lại con số trước khi gửi — sau khi gửi thì không rút lại được.`
        }
        confirmLabel={`Gửi ${formatVND(priceToSend)}`}
        cancelLabel="Để tôi xem lại"
        isLoading={isSending}
        onConfirm={() => {
          setSendDialogOpen(false);
          handleSend();
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Hủy tác vụ tạo báo giá?"
        description="SoloDesk sẽ đóng cửa sổ tạo báo giá và bỏ qua kết quả nếu backend trả về sau đó. Bản nháp đã tạo xong trước đó sẽ không bị xóa."
        confirmLabel="Hủy tác vụ"
        cancelLabel="Tiếp tục chờ"
        tone="danger"
        onConfirm={confirmCancelGeneration}
      />
    </>
  );
}
