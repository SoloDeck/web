import { useEffect, useRef, useState } from "react";
import {
  Loader2, X, Send,
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, List,
  Minus, RefreshCw, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { useCreateProposal, useAiGenerateProposal, useSendProposal, useUpdateProposal } from "@/features/deals/hooks/useProposals";
import { updateDealStage } from "@/services/dealsService";
import type { ProposalContentDTO } from "@/services/proposalsService";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";

// ---------------------------------------------------------------------------
// Schema thật mà Gemini (qua /proposals/ai-generate) trả về
// ---------------------------------------------------------------------------
type BackendProposalContent = {
  project_overview: string;
  scope_of_work: string[];
  deliverables: string[];
  timeline: string;
  pricing: string;
  payment_terms: string;
  assumptions?: string;
};

function isBackendContent(c: unknown): c is BackendProposalContent {
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
function backendContentToHtml(content: BackendProposalContent, deal: Deal): string {
  return renderQuoteHtml({
    title: deal.projectType,
    clientName: deal.client,
    clientContact: deal.contact,
    summary: content.project_overview || deal.notes,
    lineItems: [{ description: content.pricing || deal.projectType, quantity: 1, amount: deal.value }],
    total: deal.value,
    timeline: content.timeline,
    paymentTerms: content.payment_terms,
    note: content.assumptions,
  });

}

// ---------------------------------------------------------------------------
// Render nội dung thủ công / fallback (ProposalContentDTO) → HTML
// ---------------------------------------------------------------------------
function proposalContentToHtml(content: ProposalContentDTO, deal: Deal): string {
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

function normalizeProposalContentForApi(
  content: ProposalContentDTO | BackendProposalContent | null,
  deal: Deal,
  editedText?: string
): ProposalContentDTO {
  if (content && isBackendContent(content)) {
    return {
      title: `Báo giá ${deal.projectType}`,
      executive_summary: content.project_overview || deal.notes,
      scope_of_work: content.scope_of_work?.join("\n") || deal.projectType,
      pricing: {
        currency: "VND",
        total: deal.value,
        line_items: [{ description: content.pricing || deal.projectType, quantity: 1, unit_price: deal.value, amount: deal.value }],
      },
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
    title: source.title,
    executive_summary: source.executive_summary,
    scope_of_work: source.scope_of_work,
    timeline: source.timeline,
    pricing: source.pricing,
    terms: source.terms,
    notes: editedText?.trim() || source.notes,
  };
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

export function ProposalModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalHtml, setProposalHtml] = useState("");
  const [proposalContent, setProposalContent] = useState<ProposalContentDTO | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();
  const freelancerName = useAuthStore((s) => s.user?.fullName ?? "Freelancer");
  const aiGenerate = useAiGenerateProposal();
  const createDraft = useCreateProposal();
  const updateDraft = useUpdateProposal();
  const send = useSendProposal();
  const upsertJob = useAIActivityStore((state) => state.upsertJob);
  const updateJob = useAIActivityStore((state) => state.updateJob);
  const removeJob = useAIActivityStore((state) => state.removeJob);
  const cancelJob = useAIActivityStore((state) => state.cancelJob);
  const viewRequestId = useAIActivityStore((state) => state.viewRequestId);
  const consumeViewRequest = useAIActivityStore((state) => state.consumeViewRequest);
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
          setProposalHtml(proposalContentToHtml(res.content, d));
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
    aiGenerate.mutate(
      {
        deal_id: d.id,
        client_name: d.client,
        project_type: d.projectType,
        project_description: d.notes?.trim() || d.projectType,
        budget: d.budgetLabel ?? (d.value > 0 ? formatVND(d.value) : undefined),
        service_category: d.serviceCategory ?? d.projectType,
        pricing_tier: d.pricingTier ?? "standard",
        freelancer_name: freelancerName,
      },
      {
        onSuccess: (res) => {
          if (cancelRef.current) return;
          setRetryCount(0);
          setIsGenerating(false);
          setProposalId(res.id);
          setProposalContent(res.content);
          const html = isBackendContent(res.content)
            ? backendContentToHtml(res.content, d)
            : proposalContentToHtml(res.content, d);
          setProposalHtml(html);
          updateJob(currentJobId, {
            status: "success",
            description: "Đã tạo xong bản nháp báo giá. Bấm Xem để chỉnh sửa và gửi khách.",
          });
        },
        onError: (err: unknown) => {
          if (cancelRef.current) return;
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status && status < 500) {
            createManualDraft(d, status);
            return;
          }
          if (!status || status >= 500) {
            setRetryCount(attempt + 1);
            setTimeout(() => {
              if (cancelRef.current) return;
              triggerGenerate(d, attempt + 1);
            }, RETRY_DELAY_MS);
          } else {
            setIsGenerating(false);
            toast.error(`Tạo báo giá thất bại (${status}). Vui lòng thử lại.`);
          }
        },
      }
    );
  }

  useEffect(() => {
    if (!deal) return;
    cancelRef.current = false;
    setMinimized(true);
    upsertJob({
      id: `ai-proposal-${deal.id}`,
      kind: "proposal_generation",
      title: `Tạo báo giá cho ${deal.client}`,
      description: "AI đang soạn bản nháp báo giá. Bạn có thể tiếp tục làm việc khác.",
      entityLabel: deal.projectType,
      status: "running",
    });
    setIsGenerating(true);
    setRetryCount(0);
    setProposalContent(null);
    triggerGenerate(deal, 0);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  useEffect(() => {
    if (!deal || !jobId || viewRequestId !== jobId) return;
    setMinimized(false);
    consumeViewRequest(jobId);
  }, [consumeViewRequest, deal, jobId, viewRequestId]);

  if (!deal || minimized) return null;

  const handleToolbarAction = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false, "");
  };

  const handleSend = () => {
    if (!proposalId) return;
    const editedText = editorRef.current?.innerText ?? "";
    const contentToSave = normalizeProposalContentForApi(proposalContent, deal, editedText);

    // Backend Swagger hiện chỉ nhận ProposalContentDTO chuẩn, nên FE chuẩn hóa payload trước khi khóa và gửi.
    updateDraft.mutate({ proposalId, payload: { deal_id: deal.id, content: contentToSave } }, {
      onSuccess: () => {
        send.mutate(proposalId, {
          onSuccess: () => {
            toast.success("Đã gửi báo giá cho khách hàng.");
            addDealHistoryEntry(deal.id, {
              date: new Date().toISOString(),
              text: `Đã gửi báo giá AI cho khách "${deal.client}".`,
              channel: "email",
            });
            updateDealStage(deal.id, "proposal_sent")
              .then(() => qc.invalidateQueries({ queryKey: ["deals"] }))
              .catch(() => {});
            if (jobId) removeJob(jobId);
            onClose();
          },
          onError: () => {
            toast.error("Gửi báo giá thất bại. Vui lòng thử lại.");
          },
        });
      },
      onError: () => {
        toast.error("Không thể lưu nội dung báo giá trước khi gửi. Vui lòng thử lại.");
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

  const isLoading = isGenerating;
  const isSending = send.isPending || updateDraft.isPending;

  function handleClose() {
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
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">

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
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
              Thu nhỏ
            </button>
            <button
              type="button"
              onClick={isGenerating ? () => setMinimized(true) : handleClose}
              className="p-1.5 rounded-md hover:bg-secondary"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="p-16 text-center flex-1 flex flex-col justify-center items-center" role="status" aria-label="Đang tạo báo giá">
            <div className="relative">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="text-sm font-medium mt-4">
              {retryCount > 0 ? `AI đang bận, đang thử lại lần ${retryCount}...` : "AI đang soạn báo giá..."}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Quá trình này có thể mất vài chục giây</div>
          </div>
        ) : (
          <>
            {/* Rich Text Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 bg-muted/40 border-b border-border shrink-0 flex-wrap">
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "bold")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="In đậm">
                <Bold className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "italic")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="In nghiêng">
                <Italic className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "underline")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Gạch chân">
                <Underline className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "justifyLeft")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Căn lề trái">
                <AlignLeft className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "justifyCenter")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Căn lề giữa">
                <AlignCenter className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "justifyRight")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Căn lề phải">
                <AlignRight className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button type="button" onMouseDown={(e) => handleToolbarAction(e, "insertUnorderedList")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Danh sách">
                <List className="h-4 w-4" />
              </button>
              <div className="flex-1" />
              <button type="button" onClick={handleRegenerate} disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                title="Tạo lại bằng AI">
                <RefreshCw className="h-3.5 w-3.5" /> Tạo lại
              </button>
            </div>

            {/* Editable Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-card text-foreground">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onBlur={(e) => setProposalHtml(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: proposalHtml }}
                className="outline-none focus:ring-1 focus:ring-ring/20 rounded-lg min-h-[350px] text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none border border-transparent focus:border-border/50 p-2"
              />
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 bg-card flex gap-2 shrink-0">
              <button
                onClick={handleSend}
                disabled={!proposalId || isSending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSending ? "Đang xử lý..." : "Gửi báo giá cho khách"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
