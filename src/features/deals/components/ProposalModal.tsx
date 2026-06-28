import { useEffect, useRef, useState } from "react";
import {
  Loader2, X, FileText, Send,
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, List,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAiGenerateProposal, useSendProposal } from "@/features/deals/hooks/useProposals";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { updateDealStage } from "@/services/dealsService";
import type { ProposalContentDTO } from "@/services/proposalsService";

// ---------------------------------------------------------------------------
// Convert AI-returned structured content → HTML for rich-text editor
// ---------------------------------------------------------------------------

function proposalContentToHtml(content: ProposalContentDTO, deal: Deal): string {
  const today = new Date().toLocaleDateString("vi-VN");
  const heading = content.title ?? deal.projectType;
  const total = content.pricing?.total ?? deal.value;
  const deposit = Math.round(total * 0.5);
  const final = total - deposit;
  const currency = content.pricing?.currency ?? "VND";

  const lineItemsHtml = content.pricing?.line_items?.length
    ? content.pricing.line_items
        .map(
          (item) =>
            `<tr style="border-bottom:1px solid hsl(var(--border));">
              <td style="padding:10px 14px;color:hsl(var(--foreground));">${item.description}</td>
              <td style="padding:10px 14px;text-align:right;color:hsl(var(--foreground));">${item.quantity} × ${currency === "VND" ? formatVND(item.unit_price) : item.unit_price}</td>
              <td style="padding:10px 14px;font-weight:500;text-align:right;color:hsl(var(--foreground));">${currency === "VND" ? formatVND(item.amount) : item.amount}</td>
            </tr>`
        )
        .join("")
    : `<tr style="border-bottom:1px solid hsl(var(--border));">
        <td style="padding:10px 14px;color:hsl(var(--foreground));">${deal.projectType}</td>
        <td style="padding:10px 14px;text-align:right;color:hsl(var(--foreground));">1</td>
        <td style="padding:10px 14px;font-weight:500;text-align:right;color:hsl(var(--foreground));">${formatVND(deal.value)}</td>
      </tr>`;

  const milestonesHtml = content.timeline?.milestones?.length
    ? `<ul style="list-style-type:disc;padding-left:20px;color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">
        ${content.timeline.milestones.map((m) => `<li style="margin-bottom:4px;">${m.title ?? ""}${m.due_date ? ` — ${m.due_date}` : ""}</li>`).join("")}
      </ul>`
    : "";

  const timelineText =
    content.timeline?.start_date || content.timeline?.end_date
      ? `Từ <strong>${content.timeline.start_date ?? "?"}</strong> đến <strong>${content.timeline.end_date ?? "?"}</strong>.`
      : "Tổng thời gian triển khai: <strong>3 tuần</strong> kể từ ngày nhận tạm ứng và nhận đầy đủ yêu cầu.";

  return `
    <div style="text-align:center;border-bottom:1px solid hsl(var(--border));padding-bottom:16px;margin-bottom:20px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:hsl(var(--muted-foreground));font-weight:500;">ĐỀ XUẤT DỊCH VỤ</div>
      <div style="font-size:24px;font-weight:bold;margin-top:6px;color:hsl(var(--foreground));line-height:1.25;">${heading}</div>
      <div style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:6px;">Ngày lập: ${today}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;font-size:13px;">
      <div>
        <div style="font-size:10px;font-weight:600;color:hsl(var(--muted-foreground));text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">BÊN CUNG CẤP</div>
        <div style="font-weight:600;font-size:14px;color:hsl(var(--foreground));">Freelancer</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:hsl(var(--muted-foreground));text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">BÊN KHÁCH HÀNG</div>
        <div style="font-weight:600;font-size:14px;color:hsl(var(--foreground));">${deal.client}</div>
        <div style="color:hsl(var(--muted-foreground));font-size:12px;margin-top:2px;">${deal.contact}</div>
      </div>
    </div>

    ${content.executive_summary ? `
    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">Tóm Tắt</div>
      <p style="color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">${content.executive_summary}</p>
    </div>` : ""}

    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">1. Phạm Vi Công Việc</div>
      ${content.scope_of_work
        ? `<p style="color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">${content.scope_of_work}</p>`
        : `<ul style="list-style-type:disc;padding-left:20px;color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">
            <li style="margin-bottom:4px;">Khảo sát yêu cầu và lập kế hoạch chi tiết.</li>
            <li style="margin-bottom:4px;">Triển khai: ${deal.projectType.toLowerCase()}.</li>
            <li style="margin-bottom:4px;">2 vòng chỉnh sửa theo phản hồi.</li>
            <li style="margin-bottom:4px;">Bàn giao file gốc theo định dạng yêu cầu.</li>
          </ul>`}
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">2. Tiến Độ Dự Kiến</div>
      <div style="color:hsl(var(--foreground)/0.85);line-height:1.6;">${timelineText}</div>
      ${milestonesHtml}
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">3. Chi Phí &amp; Thanh Toán</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid hsl(var(--border));border-radius:8px;overflow:hidden;margin-bottom:8px;font-size:13px;">
        <tr style="background-color:hsl(var(--muted));border-bottom:1px solid hsl(var(--border));">
          <td style="padding:10px 14px;font-weight:600;color:hsl(var(--foreground));">Hạng mục</td>
          <td style="padding:10px 14px;font-weight:600;text-align:right;color:hsl(var(--foreground));">Số lượng</td>
          <td style="padding:10px 14px;font-weight:600;text-align:right;color:hsl(var(--foreground));">Thành tiền</td>
        </tr>
        ${lineItemsHtml}
        <tr style="background-color:hsl(var(--muted)/0.5);">
          <td colspan="2" style="padding:10px 14px;font-weight:700;color:hsl(var(--foreground));">Tổng cộng</td>
          <td style="padding:10px 14px;font-weight:700;text-align:right;color:hsl(var(--primary));">${formatVND(total)}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;border:1px solid hsl(var(--border));border-radius:8px;overflow:hidden;font-size:13px;">
        <tr style="border-bottom:1px solid hsl(var(--border));">
          <td style="padding:10px 14px;color:hsl(var(--foreground));">Tạm ứng (50%) khi ký hợp đồng</td>
          <td style="padding:10px 14px;font-weight:500;text-align:right;color:hsl(var(--foreground));">${formatVND(deposit)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:hsl(var(--foreground));">Thanh toán nốt (50%) khi nghiệm thu</td>
          <td style="padding:10px 14px;font-weight:500;text-align:right;color:hsl(var(--foreground));">${formatVND(final)}</td>
        </tr>
      </table>
      ${content.terms?.payment_terms
        ? `<div style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:6px;">${content.terms.payment_terms}</div>`
        : ""}
    </div>

    ${content.terms?.ip_ownership || content.terms?.revision_policy ? `
    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">4. Điều Khoản Khác</div>
      ${content.terms?.revision_policy ? `<p style="color:hsl(var(--foreground)/0.85);margin:0 0 8px;line-height:1.6;">${content.terms.revision_policy}</p>` : ""}
      ${content.terms?.ip_ownership ? `<p style="color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">${content.terms.ip_ownership}</p>` : ""}
    </div>` : ""}

    ${content.notes ? `
    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:hsl(var(--foreground));text-transform:uppercase;letter-spacing:0.02em;">Ghi Chú</div>
      <p style="color:hsl(var(--foreground)/0.85);margin:0;line-height:1.6;">${content.notes}</p>
    </div>` : ""}

    <div style="border-top:1px solid hsl(var(--border));padding-top:16px;font-size:12px;color:hsl(var(--muted-foreground));font-style:italic;text-align:center;margin-top:24px;">
      Trân trọng cảm ơn sự hợp tác của Quý khách. Đề xuất báo giá này có hiệu lực trong vòng 7 ngày kể từ ngày gửi.
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RETRY_DELAY_MS = 2500;

export function ProposalModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalHtml, setProposalHtml] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const cancelRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const generate = useAiGenerateProposal();
  const send = useSendProposal();

  function buildAiPayload(d: typeof deal) {
    if (!d) return null;
    const value = d.value ?? 0;
    const pricingTier = value < 5_000_000 ? "basic" : value < 30_000_000 ? "standard" : "premium";
    return {
      deal_id: d.id,
      client_name: d.client,
      project_type: d.projectType,
      project_description: d.notes?.trim() || d.projectType,
      service_category: d.projectType,
      pricing_tier: pricingTier,
      freelancer_name: user?.fullName ?? "Freelancer",
      budget: value > 0 ? `${value.toLocaleString("vi-VN")} VND` : undefined,
    };
  }

  function triggerGenerate(d: NonNullable<typeof deal>, attempt: number) {
    const payload = buildAiPayload(d);
    if (!payload) return;
    generate.mutate(payload, {
      onSuccess: (res) => {
        if (cancelRef.current) return;
        setRetryCount(0);
        setIsGenerating(false);
        setProposalId(res.id);
        setProposalHtml(proposalContentToHtml(res.content, d));
      },
      onError: (err: unknown) => {
        if (cancelRef.current) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        const isServerBusy = !status || status >= 500;
        if (isServerBusy) {
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
    });
  }

  // Trigger AI generation when modal opens with a deal
  useEffect(() => {
    if (!deal) return;
    cancelRef.current = false;
    setIsGenerating(true);
    setRetryCount(0);
    triggerGenerate(deal, 0);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  if (!deal) return null;

  const handleToolbarAction = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false, "");
  };

  const handleSend = () => {
    if (!proposalId) return;
    send.mutate(proposalId, {
      onSuccess: () => {
        toast.success("Đã gửi báo giá cho khách hàng.");
        updateDealStage(deal.id, "proposal_sent")
          .then(() => qc.invalidateQueries({ queryKey: ["deals"] }))
          .catch(() => {}); // best-effort — don't block close on stage error
        onClose();
      },
      onError: () => {
        toast.error("Gửi báo giá thất bại. Vui lòng thử lại.");
      },
    });
  };

  const handleRegenerate = () => {
    if (!deal) return;
    cancelRef.current = false;
    setProposalId(null);
    setIsGenerating(true);
    setRetryCount(0);
    triggerGenerate(deal, 0);
  };

  const isLoading = isGenerating;
  const isSending = send.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Báo Giá AI · {deal.client}</div>
              <div className="text-xs text-muted-foreground">Bản nháp tự động bằng tiếng Việt (Hỗ trợ chỉnh sửa)</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="p-16 text-center flex-1 flex flex-col justify-center items-center" role="status" aria-label="Đang tạo báo giá">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground mt-3">
              {retryCount > 0 ? `AI đang bận, đang thử lại lần ${retryCount}...` : "AI đang soạn báo giá..."}
            </div>
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
                title="Tạo lại">
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
                {isSending ? "Đang gửi..." : "Gửi báo giá cho khách"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
