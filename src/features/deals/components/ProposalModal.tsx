import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2, X, Send, Download,
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
import { useCreateProposal, useAiGenerateProposal, useSendProposal, useUpdateProposal, useDownloadProposalPdf, useProposal } from "@/features/deals/hooks/useProposals";
import { updateDealStage } from "@/services/dealsService";
import type { ProposalContentDTO } from "@/services/proposalsService";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import {
  backendContentToHtml,
  isBackendContent,
  proposalContentToHtml,
  proposalToHtml,
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
  const [proposalHtml, setProposalHtml] = useState("");
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
  const cancelRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const existing = useProposal(existingProposalId ?? undefined);

  const qc = useQueryClient();
  const freelancerName = useAuthStore((s) => s.user?.fullName ?? "Freelancer");
  const aiGenerate = useAiGenerateProposal();
  const createDraft = useCreateProposal();
  const updateDraft = useUpdateProposal();
  const send = useSendProposal();
  const downloadPdf = useDownloadProposalPdf();
  const [pendingAction, setPendingAction] = useState<"send" | "pdf" | null>(null);
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
          // Nhớ id bản nháp vào thẻ job: bấm "Xem" sau này sẽ nạp lại ĐÚNG bản này thay
          // vì gọi AI sinh bản mới.  #Huynh
          updateJob(currentJobId, { resultId: res.id });
          addDealHistoryEntry(d.id, {
            date: new Date().toISOString(),
            text: `Đã tạo bản nháp báo giá thủ công cho "${d.client}" (AI không dùng được).`,
            channel: "message",
          });
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
          // Nhớ id bản nháp vào thẻ job: bấm "Xem" sau này sẽ nạp lại ĐÚNG bản này thay
          // vì gọi AI sinh bản mới.  #Huynh
          updateJob(currentJobId, { resultId: res.id });
          addDealHistoryEntry(d.id, {
            date: new Date().toISOString(),
            text: `AI đã soạn bản nháp báo giá cho "${d.client}".`,
            channel: "message",
          });
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

    // Mở để XEM LẠI: nạp bản nháp đã có, mở sẵn ra, không gọi AI.
    if (existingProposalId) {
      setProposalId(existingProposalId);
      setIsGenerating(false);
      return;
    }

    // Bấm "Tạo Báo Giá AI" thì phải THẤY cửa sổ đang chạy (mặc định của `minimized` là
    // false). Trước đây nó tự thu nhỏ ngay nên bấm xong không thấy gì, tưởng nút hỏng.
    // Muốn làm việc khác thì bấm ra ngoài — panel thu nhỏ, job vẫn chạy nền.  #Huynh
    upsertJob({
      id: `ai-proposal-${deal.id}`,
      kind: "proposal_generation",
      title: `Tạo báo giá cho ${deal.client}`,
      description: "AI đang soạn bản nháp báo giá. Bạn có thể tiếp tục làm việc khác.",
      entityLabel: deal.projectType,
      entityId: deal.id, // để bấm "Xem" ở màn hình khác vẫn mở lại được
      status: "running",
    });
    setIsGenerating(true);
    setRetryCount(0);
    setProposalContent(null);
    triggerGenerate(deal, 0);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, existingProposalId]);

  // Nạp nội dung của bản nháp đã có (khi mở để xem lại).
  useEffect(() => {
    if (!existingProposalId || !existing.data || !deal) return;
    const content = existing.data.content as ProposalContentDTO | null;
    if (!content) return;
    setProposalContent(content);
    setProposalHtml(proposalToHtml(content, deal));
  }, [existing.data, existingProposalId, deal]);

  if (!deal || minimized) return null;

  const handleToolbarAction = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false, "");
  };

  const handleSend = () => {
    if (!proposalId) return;
    const editedText = editorRef.current?.innerText ?? "";
    const contentToSave = normalizeProposalContentForApi(
      proposalContent,
      deal,
      editedText,
      editorRef.current?.innerHTML
    );

    setPendingAction("send");
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
            updateDealStage(deal.id, "proposal_sent")
              .then(() => qc.invalidateQueries({ queryKey: ["deals"] }))
              .catch(() => {});
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
    const editedText = editorRef.current?.innerText ?? "";
    const contentToSave = normalizeProposalContentForApi(
      proposalContent,
      deal,
      editedText,
      editorRef.current?.innerHTML
    );

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
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
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
                onClick={handleSend}
                disabled={!proposalId || isSending || isDownloading}
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
