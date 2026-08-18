import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  Lock,
  Loader2,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/Sidebar";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { WindowControlButton } from "@/components/solodesk/WindowControlButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AIActivityCenter } from "@/features/ai/components/AIActivityCenter";
import { DocTemplateChooser } from "@/features/deals/components/DocTemplateChooser";
import { useCanUseAi } from "@/features/subscriptions/hooks/useSubscriptions";
import { fillContractFromTemplate } from "@/services/contractsService";
import { useTermTemplates } from "@/features/deals/hooks/useTermTemplates";
import { proposalToHtml } from "@/features/deals/proposalHtml";
import { getProposalPreview } from "@/services/proposalsService";
import { DealActivityTimeline } from "@/features/deals/components/DealActivityTimeline";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { ProjectTaskPanel } from "@/features/deals/components/ProjectTaskList";
import {
  isPaymentTask,
  paymentMilestoneLabel,
  shouldTickAfterInvoiceSent,
} from "@/features/deals/paymentTasks";
import {
  buildInvoiceDraft,
  composeInvoiceNotes,
  buildDefaultInvoiceNotes,
  getInvoiceDisplayTitle,
  invoiceOrdinal,
  type InvoiceComposerClient,
  type InvoiceDraftState,
  type InvoiceTone,
} from "@/features/deals/invoiceComposer";
import { dealKeys, useDeal, useDealHistory, useDealIntakes, useDeleteDeal, useTransitionDealStage, useUpdateDeal } from "@/features/deals/hooks/useDeals";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { DealReminderPanel } from "@/features/reminders/components/DealReminderPanel";
import { useDealReminders } from "@/features/reminders/hooks/useReminders";
import {
  useProjectTasks,
  useAddTask,
  useToggleTask,
  useUpdateTask,
  useDeleteTask,
  useCreateTaskInvoice,
  useRecordTaskPayment,
  projectTaskKeys,
} from "@/features/deals/hooks/useProjectTasks";
import { useClient, useUpdateClient } from "@/features/clients/hooks/useClients";
import {
  useCreateInvoice,
  useDeleteInvoice,
  useDealInvoices,
  useRecordInvoicePayment,
  useSendInvoice,
  useUpdateInvoice,
  useVoidInvoice,
} from "@/features/deals/hooks/useInvoices";
import { useDeleteProposal, useProposal, useProposalList, useTransitionProposalStatus } from "@/features/deals/hooks/useProposals";
import {
  useContractList,
  useContract,
  useCreateContract,
  useGenerateContractContent,
  useSendContract,
  useRecordClientSignature,
} from "@/features/deals/hooks/useContracts";
import { STAGES, STAGE_BY_ID, formatDealSource, type Deal, type ProjectTask } from "@/features/deals/types";
import { AttachmentViewerModal } from "@/features/deals/components/AttachmentViewerModal";
import { formatVND } from "@/utils/format";
import { gmailComposeLink, zaloLink } from "@/lib/contact-links";
import { cn } from "@/lib/utils";
import { updateDealStage } from "@/services/dealsService";
import type { ProposalContentDTO, ProposalDecisionStatus } from "@/services/proposalsService";
import { getContractPreview, downloadContractPdf } from "@/services/contractsService";
import { downloadProposalPdf } from "@/services/proposalsService";
import { useContractInlineEditor } from "@/features/deals/hooks/useContractInlineEditor";
import type { InvoicePayload, InvoiceResponse, InvoiceUpdatePayload } from "@/services/invoicesService";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import { QualificationResultView } from "@/features/ai/components/QualificationResult";
import { SaveQualificationDialog } from "@/features/ai/components/SaveQualificationDialog";
import { LEVEL_UI, saveWarningLevel } from "@/features/ai/qualificationUi";
import {
  useDealAttachments,
  useDeleteDealAttachment,
  useUploadDealAttachment,
} from "@/features/deals/hooks/useDealAttachments";
import {
  ACCEPTED_FILE_TYPES,
  downloadDealAttachment,
  isViewableInApp,
  MAX_FILE_SIZE_MB,
  type DealAttachment,
} from "@/services/dealAttachmentsService";
import {
  dealQualificationKeys,
  savedQualifications,
  toQualificationView,
  useDealQualifications,
  useSaveDealQualification,
} from "@/features/deals/hooks/useDealQualifications";
import type { DealQualification } from "@/services/dealsService";

type DetailTab = "overview" | "tasks" | "documents" | "reminders" | "history";
type DealDetailDraft = {
  title: string;
  notes: string;
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toApiDateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Backend đặt recommendation = "qualify" nếu điểm >= 60, ngược lại "pass".
 * "pass" ở đây là thuật ngữ sales — nghĩa là "BỎ QUA deal này", KHÔNG phải "đạt".
 * Trước đây giao diện in thẳng chữ "pass" ra cho freelancer Việt đọc, mà chỗ khác lại
 * diễn giải nó thành "nên tiếp tục tư vấn" — đúng NGƯỢC nghĩa, rất nguy hiểm.  #Huynh
 */
function recommendationLabel(value?: string | null): string {
  // Không nói cứng "báo giá": câu này hiện ở mọi giai đoạn, mà deal đã ký hợp đồng rồi thì
  // bước tiếp theo đâu còn là báo giá nữa.
  if (value === "qualify") return "Đủ thông tin - Nên chuyển qua bước tiếp theo";
  if (value === "pass") return "Chưa đủ thông tin — nên hỏi thêm trước khi báo giá.";
  if (value === "reject") return "Nên cân nhắc từ chối deal này.";
  return "Chưa có đánh giá AI chi tiết cho deal này.";
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  pending_signatures: "Chờ ký",
  active: "Đang hiệu lực",
  completed: "Đã hoàn thành",
  terminated: "Đã chấm dứt",
  expired: "Đã hết hạn",
};

/** Dịch lỗi hợp đồng từ backend sang câu người dùng hiểu được. */
function contractErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error);
  // 402: tài khoản không có gói AI. Trước đây mọi lỗi đều ra "Vui lòng thử lại", nên
  // người hết gói cứ bấm lại mãi mà không biết vì sao.
  if (status === 402) {
    return "Gói của bạn chưa có tính năng AI. Hãy nâng cấp để tạo hợp đồng tự động.";
  }
  // 429 = hết hạn mức AI trong kỳ. Thông báo mặc định "Vui lòng thử lại" khiến người
  // dùng bấm lại mãi mà không hiểu vì sao.  #Huynh
  if (status === 429) {
    return "Đã dùng hết lượt AI trong kỳ này. Vào mục Gói dịch vụ để xem hạn mức và nâng cấp.";
  }
  // 409: báo giá chưa được chấp nhận, hoặc hợp đồng không còn là bản nháp.
  if (status === 409) {
    return getApiErrorMessage(error, "Hợp đồng không còn ở trạng thái nháp.");
  }
  return "Không thể tạo hợp đồng. Vui lòng thử lại.";
}

export function DealDetailPage({ dealId }: { dealId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dealQuery = useDeal(dealId);
  const deal = dealQuery.data;
  const updateStoredDeal = useDealStore((state) => state.updateDeal);
  const moveToStage = useDealStore((state) => state.moveToStage);
  const clientQuery = useClient(deal?.clientId);
  const dealHistory = useDealHistory(deal?.id);
  const invoices = useDealInvoices(deal?.id);
  const createInvoice = useCreateInvoice(deal?.id);
  const updateInvoiceMutation = useUpdateInvoice(deal?.id);
  const deleteInvoiceMutation = useDeleteInvoice(deal?.id);
  const sendInvoiceMutation = useSendInvoice(deal?.id);
  const voidInvoiceMutation = useVoidInvoice(deal?.id);
  const recordInvoicePaymentMutation = useRecordInvoicePayment(deal?.id);
  /**
   * Hoá đơn NÀO đang được xử lý — để khoá đúng một hàng thay vì khoá cả danh sách.
   *
   * Trước đây chỗ này là một cờ boolean gộp sáu mutation rồi truyền xuống mọi hàng: bấm gửi
   * một hoá đơn là toàn bộ nút của mọi hàng mờ theo, trông y như hệ thống đang gửi hết một
   * lượt. Vừa gây sợ, vừa che mất việc thật đang chạy là việc nào.
   *
   * Lấy id từ `variables` của mutation đang chạy nên không phải nuôi thêm state — mà state
   * kiểu đó thì kiểu gì cũng có ngày quên dọn.  #Huynh
   */
  const pendingInvoiceId =
    (sendInvoiceMutation.isPending ? sendInvoiceMutation.variables : null) ??
    (voidInvoiceMutation.isPending ? voidInvoiceMutation.variables : null) ??
    (deleteInvoiceMutation.isPending ? deleteInvoiceMutation.variables : null) ??
    (recordInvoicePaymentMutation.isPending
      ? recordInvoicePaymentMutation.variables?.invoiceId
      : null) ??
    null;
  const proposals = useProposalList({ deal_id: deal?.id, page_size: 10 });
  const contracts = useContractList({ deal_id: deal?.id, page_size: 10 });
  const reminders = useDealReminders(deal?.id);
  const intakeQuery = useDealIntakes(Boolean(deal?.clientId));
  const deleteDeal = useDeleteDeal();
  const updateDeal = useUpdateDeal();
  const transitionDealStage = useTransitionDealStage();
  const proposalDecision = useTransitionProposalStatus();
  const deleteProposalMutation = useDeleteProposal();
  const createContract = useCreateContract();
  const generateContract = useGenerateContractContent();
  /** Đường soạn hợp đồng KHÔNG dùng AI — song sinh với `generateContract`, khác mỗi endpoint. */
  const fillContractSkeleton = useMutation({
    mutationFn: ({ contractId, templateId }: { contractId: string; templateId: string | null }) =>
      fillContractFromTemplate(contractId, templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }),
  });
  const recordSignature = useRecordClientSignature();
  const sendContract = useSendContract();
  const contractTemplates = useTermTemplates("contract");
  const canUseAi = useCanUseAi();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [contractChooserOpen, setContractChooserOpen] = useState(false);
  const [contractTemplateId, setContractTemplateId] = useState<string | null>(null);
  // Khác null = mở AIPanel để XEM LẠI job cũ, thay vì chạy đánh giá mới.

  // Mở panel AI qua store — panel được mount ở tầng gốc (AIJobViewer) nên bấm "Xem" ở
  // màn hình nào cũng dùng chung một đường.  #Huynh
  const openAiPanel = useAIActivityStore((state) => state.openPanel);
  const [viewContractId, setViewContractId] = useState<string | null>(null);
  const [viewProposalId, setViewProposalId] = useState<string | null>(null);
  const [viewQualificationDoc, setViewQualificationDoc] = useState<DealQualification | null>(null);
  const [viewAttachment, setViewAttachment] = useState<DealAttachment | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  /**
   * Mốc thu tiền đang chờ gửi hóa đơn qua cửa sổ soạn.
   *
   * Cửa sổ soạn chỉ biết về HÓA ĐƠN, không biết nó thuộc mốc nào — mà gửi xong thì phải tick
   * mốc đó. Giữ ở đây thay vì tra ngược từ `invoice_id`: freelancer có thể mở cùng hóa đơn ấy
   * từ tab Tài liệu, và lúc đó không có mốc nào đang chờ cả.  #Huynh
   */
  const [invoiceTaskAwaitingSend, setInvoiceTaskAwaitingSend] = useState<ProjectTask | null>(null);
  /** File đính kèm đang chờ xác nhận xoá. Xoá là mất hẳn, nên phải hỏi. */
  const [attachmentPendingDelete, setAttachmentPendingDelete] = useState<DealAttachment | null>(null);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completePending, setCompletePending] = useState(false);
  // Bản nháp báo giá đang chờ xác nhận xoá (mục 5). null = không có hộp thoại nào mở.
  const [deleteProposalId, setDeleteProposalId] = useState<string | null>(null);
  /**
   * Hai mốc "khách đã đồng ý" đang chờ xác nhận. Cả hai đều GHI NHẬN một việc xảy ra ngoài
   * hệ thống, và bấm xong là deal đi tiếp một giai đoạn — mà luật chuyển giai đoạn không
   * cho lùi. Trước đây bấm phát ăn ngay, lỡ tay là không gỡ lại được.  #Huynh
   */
  const [proposalPendingAccept, setProposalPendingAccept] = useState<string | null>(null);
  const [contractPendingSign, setContractPendingSign] = useState<{ id: string } | null>(null);

  // File đính kèm giờ lưu trên object storage (MinIO/S3) qua API, KHÔNG còn nhét base64
  // vào localStorage: ~5MB là vỡ, đổi máy là mất sạch, và file không rời khỏi trình duyệt
  // nên không gửi được cho khách.
  //
  // Quan trọng hơn: backend BÓC CHỮ từ PDF và đưa vào prompt chấm điểm. Khách gửi brief
  // thì AI đọc được yêu cầu thật — deal tạo tay không còn tự động COLD.  #Huynh
  const attachmentsQuery = useDealAttachments(deal?.id);
  const dealAttachments = attachmentsQuery.data ?? [];
  const uploadAttachment = useUploadDealAttachment(deal?.id);
  const deleteAttachment = useDeleteDealAttachment(deal?.id);
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [draft, setDraft] = useState<DealDetailDraft>({
    title: "",
    notes: "",
  });
  const contractItems = contracts.data?.data ?? [];
  const hasActiveContract = contractItems.some((contract) => contract.status === "active");
  // MỞ TAB CÔNG VIỆC TỪ LÚC GHI NHẬN ĐÃ KÝ, không đợi bấm "Bắt đầu triển khai".
  //
  // Đợt thanh toán đầu tiên của mọi báo giá ghi "Khi ký hợp đồng / trước khi bắt đầu" — mà
  // trước đây task "Thu tiền:" chỉ hiện sau khi deal vào "active", tức sau khi đã bắt tay
  // làm. Hệ thống nhắc đi đòi cọc MUỘN hơn đúng thời điểm nó bảo phải thu. Backend giờ sinh
  // task ngay lúc hợp đồng chuyển active (`ContractsService.transition_status`), nên chỗ này
  // phải mở theo, nếu không task có mà không ai nhìn thấy.  #Huynh
  const projectStageUnlocked =
    hasActiveContract || deal?.stage === "active" || deal?.stage === "completed_and_billed";
  const taskQuery = useProjectTasks(deal?.id, projectStageUnlocked);
  const projectId = taskQuery.data?.projectId ?? "";
  const addTaskMutation = useAddTask(deal?.id ?? "", projectId);
  const toggleTaskMutation = useToggleTask(deal?.id ?? "");
  const updateTaskMutation = useUpdateTask(deal?.id ?? "");
  const deleteTaskMutation = useDeleteTask(deal?.id ?? "");
  const createTaskInvoice = useCreateTaskInvoice(deal?.id ?? "");
  const recordTaskPayment = useRecordTaskPayment(deal?.id ?? "");
  // Mốc đang chạy thao tác hóa đơn — khoá nút để bấm hai lần không đẻ hai chứng từ.
  const [invoiceBusyTaskId, setInvoiceBusyTaskId] = useState<string | null>(null);
  // Mốc vừa được tick, đang chờ trả lời "gửi hóa đơn / ghi nhận thanh toán / để sau".
  const [paymentTaskPrompt, setPaymentTaskPrompt] = useState<ProjectTask | null>(null);
  // Khoản "thu khi xong" bị bấm xuất hóa đơn lúc công việc chưa tick xong — đang chờ xác nhận.
  const [earlyInvoiceTask, setEarlyInvoiceTask] = useState<ProjectTask | null>(null);

  const proposalItems = proposals.data?.data ?? [];
  // Tài liệu chỉ kể bản đánh giá ĐÃ CHỐT; tab Lịch sử vẫn kể hết mọi lần chấm. Dùng chung
  // một query nên bấm "Lưu" xong là cả hai tab cùng cập nhật.  #Huynh
  const qualifications = useDealQualifications(deal?.id);
  const savedQualificationDocs = savedQualifications(qualifications.data);
  const acceptedProposal = proposalItems.find((proposal) => proposal.status === "accepted");
  // Bản nháp để tái dùng khi bấm "Tạo lại" — tránh đẻ thêm hợp đồng mới.
  const draftContract = contractItems.find((contract) => contract.status === "draft");
  // Chỉ tin trạng thái THẬT từ backend. Trước đây còn cộng thêm một Set trong useState —
  // freelancer bấm "Khách đã ký" thì nút triển khai mở ra, nhưng F5 là mất sạch vì nó
  // chưa bao giờ được gửi lên server. Giao diện nói dối chính người dùng.  #Huynh
  const hasDeploymentReadyContract = hasActiveContract;
  const historyItems = useMemo(() => {
    return [...dealHistory, ...(deal?.history ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [dealHistory, deal?.history]);

  const intakeFallback = useMemo(() => {
    if (!deal) return undefined;

    // Ghép theo deal_id, KHÔNG phải client_id.
    //
    // Bug cũ: ghép theo client_id. Một khách gửi Biểu mẫu tiếp nhận hai lần cho hai dự án
    // khác nhau → hai deal, cùng một client → deal cũ hiện mô tả của dự án MỚI. Backend
    // dính đúng bug này (AI chấm điểm và soạn báo giá bằng brief của dự án sai), giờ đã
    // sửa và trả về deal_id.
    //
    // Phiếu cũ chưa có deal_id → vẫn rơi về ghép theo client như trước.  #Huynh
    const byDeal = intakeQuery.data?.find((item) => item.dealId === deal.id);
    if (byDeal) return byDeal;

    return intakeQuery.data?.find((item) => item.dealId == null && item.clientId === deal.clientId);
  }, [deal, intakeQuery.data]);
  const intakeDescription = intakeFallback?.inquiryText.trim() ?? "";
  const intakeBudget = intakeFallback?.estimatedBudget.trim() ?? "";
  const displayDescription = deal?.notes?.trim() || intakeDescription;
  const displayBudget = deal?.budgetLabel || (deal && deal.value > 0 ? formatVND(deal.value) : intakeBudget || (deal ? formatVND(deal.value) : formatVND(0)));
  const displayBudgetLabel = deal?.budgetLabel ? "Ngân sách khách nhập" : deal && deal.value > 0 ? "Giá trị dự kiến" : intakeBudget ? "Ngân sách khách nhập" : "Giá trị dự kiến";
  const dealForProposal = useMemo(() => {
    if (!deal) return null;
    if (deal.notes.trim() || !intakeDescription) return deal;
    return { ...deal, notes: intakeDescription };
  }, [deal, intakeDescription]);

  // Thanh tiến độ chỉ tính trên các giai đoạn THUỘC quy trình. `lost` không phải một nấc
  // tiến độ mà là lối ra, nên loại khỏi thang đo.
  //
  // Bản cũ chia cho `STAGES.length - 1` = 6 nhưng vẫn tìm chỉ số trong cả 7 phần tử: deal ở
  // `lost` (chỉ số 6) ra 117%, thanh tràn khỏi khung. Kẹp thêm `Math.min` để dù thang có đổi
  // cũng không vỡ giao diện.  #Huynh
  const PIPELINE_STAGES = STAGES.filter((stage) => stage.id !== "lost");
  const isLost = deal?.stage === "lost";
  const progressStageIndex = deal
    ? Math.max(0, PIPELINE_STAGES.findIndex((stage) => stage.id === deal.stage))
    : 0;
  const progress =
    deal && !isLost
      ? Math.min(100, Math.round(((progressStageIndex + 1) / PIPELINE_STAGES.length) * 100))
      : 0;
  const hasOverviewChanges = Boolean(
    deal &&
      (draft.title !== deal.projectType ||
        draft.notes !== (deal.notes ?? ""))
  );

  // ĐANG SỬA THÌ KHÔNG ĐỒNG BỘ ĐÈ LÊN.
  //
  // Effect này nạp lại nháp mỗi khi `deal` đổi. Thiếu chốt chặn `overviewEditing` thì một
  // lần refetch giữa chừng sẽ GHI ĐÈ đúng cái ô người dùng đang gõ dở, và vì
  // `hasOverviewChanges` so nháp với giá trị server nên nút Lưu cũng tắt theo — chữ mất
  // im lặng, không một thông báo nào.
  //
  // Không phải tình huống hiếm: bấm "Bổ sung thông tin" ở panel AI là gọi `useUpdateDeal`,
  // nó vô hiệu hoá `dealKeys.detail` → `deal.notes` đổi → effect chạy. Panel AI gắn ở tầng
  // gốc nên màn chi tiết vẫn đang mở với ô sửa đang gõ dở.
  //
  // Bỏ luôn `deal?.value` và `deal?.source` khỏi deps: thân effect không hề đọc hai thứ đó
  // (nháp chỉ có title + notes), giữ lại chỉ khiến effect chạy oan mỗi lần giá deal đổi.
  useEffect(() => {
    if (!deal || overviewEditing) return;
    setDraft({
      title: deal.projectType,
      notes: deal.notes ?? "",
    });
  }, [deal?.id, deal?.projectType, deal?.notes, overviewEditing]);

  function goBack() {
    navigate({ to: "/" });
  }

  async function handleSaveOverview() {
    if (!deal) return;
    const title = draft.title.trim();
    if (!title) {
      toast.error("Tên dự án không được để trống.");
      return;
    }

    try {
      // Chỉ lưu tên và nội dung dự án; giá trị dự kiến không cho chỉnh ở detail.
      await updateDeal.mutateAsync({
        id: deal.id,
        payload: {
          client_id: deal.clientId,
          title,
          stage: deal.stage,
          // `.trim()` trần, KHÔNG `|| undefined`. Axios bỏ hẳn key `undefined` khỏi JSON,
          // mà backend duyệt field theo kiểu `if value is not None` (deals service, hàm
          // `update`) — field vắng mặt nghĩa là GIỮ NGUYÊN giá trị cũ. Hệ quả: xoá sạch ô
          // mô tả rồi bấm Lưu thì hệ thống báo "Đã cập nhật" nhưng chữ cũ vẫn còn nguyên.
          // Chuỗi rỗng thì backend xoá được thật, nên chỉ cần thôi đổi nó thành undefined.
          notes: draft.notes.trim(),
        },
      });
      setOverviewEditing(false);
    } catch {
      // Toast lỗi đã xử lý trong hook useUpdateDeal.
    }
  }

  function cancelOverviewEdit() {
    if (!deal) return;
    setDraft({
      title: deal.projectType,
      notes: deal.notes ?? "",
    });
    setOverviewEditing(false);
  }

  function handleArchive() {
    if (!deal) return;
    setRemoveDialogOpen(true);
  }

  function confirmRemoveDeal() {
    if (!deal) return;
    // DELETE /deals/{id} là soft-delete bên backend, UI gọi là "Loại bỏ dự án" theo đúng nghiệp vụ.
    deleteDeal.mutate(deal.id, {
      onSuccess: () => {
        setRemoveDialogOpen(false);
        navigate({ to: "/" });
      },
    });
  }

  // Bấm "Tạo hợp đồng": LUÔN mở hộp chọn (AI tự viết / mẫu thư viện) trước khi sinh —
  // đồng nhất với luồng báo giá, thay vì lặng lẽ sinh rồi nhảy vào Detail. Chưa có mẫu cho
  // nghề này thì hộp chọn chỉ có "AI tự viết" kèm chú thích.  #Huynh
  function handleGenerateContract() {
    if (!deal || !acceptedProposal) {
      toast.error("Cần có báo giá đã được khách chấp nhận trước khi tạo hợp đồng.");
      return;
    }
    setContractTemplateId(null);
    setContractChooserOpen(true);
  }

  function runGenerateContract(templateId: string | null, dungKhung = false) {
    if (!deal || !acceptedProposal) return;

    function fillContent(contractId: string) {
      const mutation = dungKhung ? fillContractSkeleton : generateContract;
      mutation.mutate(
        { contractId, templateId },
        {
          onSuccess: () => {
            toast.success(
              dungKhung
                ? "Đã mở hợp đồng từ khung. Bấm vào từng điều để điền nội dung."
                : "Đã tạo nội dung hợp đồng bằng AI."
            );
            addDealHistoryEntry(deal!.id, {
              date: new Date().toISOString(),
              text: dungKhung
                ? "Hợp đồng được soạn từ khung mẫu (không dùng AI)."
                : "Hợp đồng AI đã được tạo và điền nội dung.",
              channel: "message",
            });
            setViewContractId(contractId);
          },
          // Đường AI hỏng vì gói/hạn mức thì CHỈ ĐƯỜNG sang khung, đừng bỏ người dùng ở ngõ cụt.
          // Trước đây nhánh này chỉ có một dòng chữ nhắc tên mục "Gói dịch vụ" — không bấm được,
          // và không mời lối nào khác. Freelancer gói Free đứng ở bước thương lượng là hết đường.
          onError: (error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            // 402/429 = gói/hạn mức. Mở lại màn chọn để họ bấm "Tôi tự soạn" — trước đây
            // nhánh này là ngõ cụt, chỉ có một dòng chữ nhắc tên mục "Gói dịch vụ".
            if (!dungKhung && (status === 402 || status === 429)) setContractChooserOpen(true);
            toast.error(contractErrorMessage(error));
          },
        }
      );
    }

    // Đã có bản nháp thì sinh lại nội dung trên CHÍNH nó, không tạo hợp đồng mới.
    // POST /contracts luôn tạo một hàng mới và tự tăng version_number, nên bấm nút
    // lần hai là đẻ ra "Hợp đồng lần 2" nằm chình ình trong tab Tài liệu. BE cũng chỉ
    // cho generate trên hợp đồng còn draft, nên tái dùng bản nháp là đúng luật của nó.
    if (draftContract) {
      fillContent(draftContract.id);
      return;
    }

    createContract.mutate(
      {
        deal_id: deal.id,
        client_id: deal.clientId,
        proposal_id: acceptedProposal.id,
        content: {},
      },
      {
        onSuccess: (contract) => fillContent(contract.id),
        onError: (error) => toast.error(contractErrorMessage(error)),
      }
    );
  }

  function handleProposalDecision(proposalId: string, status: ProposalDecisionStatus) {
    if (!deal) return;
    proposalDecision.mutate(
      { proposalId, status },
      {
        onSuccess: () => {
          if (status === "accepted") {
            toast.success("Đã ghi nhận khách chấp nhận báo giá.");
            addDealHistoryEntry(deal.id, {
              date: new Date().toISOString(),
              text: `Khách "${deal.client}" đã chấp nhận báo giá.`,
              channel: "message",
            });
            // Sau khi khách đồng ý, deal chuyển qua bước chờ chốt hợp đồng/triển khai.
            if (deal.stage === "proposal_sent") {
              transitionDealStage.mutate({ id: deal.id, stage: "in_negotiation" });
            }
            return;
          }
          addDealHistoryEntry(deal.id, {
            date: new Date().toISOString(),
            text: status === "rejected" ? `Khách "${deal.client}" đã từ chối báo giá.` : `Báo giá đã hết hiệu lực.`,
            channel: "message",
          });
          toast.success(status === "rejected" ? "Đã ghi nhận khách từ chối báo giá." : "Đã đánh dấu báo giá hết hiệu lực.");
        },
        onError: () => {
          toast.error("Không thể cập nhật phản hồi báo giá. Vui lòng thử lại.");
        },
      }
    );
  }

  // Mở lại bản nháp báo giá trong cửa sổ soạn thảo (nơi chốt giá + gửi khách).  #Huynh
  function handleEditProposal(proposalId: string) {
    if (!deal) return;
    openAiPanel({ kind: "proposal_generation", dealId: deal.id, proposalId });
  }

  function handleConfirmDeleteProposal() {
    if (!deleteProposalId) return;
    deleteProposalMutation.mutate(deleteProposalId, {
      onSuccess: () => {
        toast.success("Đã xoá bản nháp báo giá.");
        setDeleteProposalId(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Không xoá được báo giá. Vui lòng thử lại."));
      },
    });
  }

  function handleStartProject() {
    if (!deal) return;
    if (!hasDeploymentReadyContract) {
      toast.error("Cần ghi nhận khách đã ký hợp đồng trước khi bắt đầu triển khai.");
      return;
    }
    transitionDealStage.mutate(
      { id: deal.id, stage: "active" },
      {
        onSuccess: () => {
          toast.success("Đã bắt đầu triển khai dự án. Hồ sơ công việc đang được tạo.");
          addDealHistoryEntry(deal.id, {
            date: new Date().toISOString(),
            text: "Dự án chuyển sang giai đoạn Đang triển khai.",
            channel: "message",
          });
        },
        onError: () => toast.error("Không thể chuyển sang triển khai. Vui lòng thử lại."),
      }
    );
  }

  function handleCompleteProject() {
    if (!deal) return;
    // "Thu đủ tiền" đo bằng các task THU TIỀN (tự sinh từ hạng mục chi phí của báo giá đã
    // chốt), thay cho hoá đơn. Còn khoản chưa tick xong thì chưa cho hoàn thành. Deal không
    // có khoản thu nào (báo giá cũ / không hạng mục) thì không chặn — khớp guard BE.
    //
    // Đi qua `isPaymentTask` chứ KHÔNG tự gõ lại điều kiện: chỗ này từng dò tiền tố tên trực
    // tiếp, nên khi dấu nhận biết đổi sang `billingAmount` là rất dễ sót đúng một mình nó —
    // mà sót ở đây nghĩa là deal đóng lại được trong khi tiền chưa về.  #Huynh
    const paymentTasks = (taskQuery.data?.tasks ?? []).filter(isPaymentTask);
    const unpaid = paymentTasks.filter((task) => task.status !== "done");
    if (unpaid.length > 0) {
      toast.error(
        `Còn ${unpaid.length}/${paymentTasks.length} khoản thu tiền chưa hoàn tất. ` +
          `Hãy tick xong chúng trong tab Công việc.`
      );
      setTab("tasks");
      return;
    }

    setCompleteDialogOpen(true);
  }

  async function handleConfirmCompleteProject() {
    if (!deal) return;
    setCompletePending(true);
    try {
      const completedDeal = await updateDealStage(deal.id, "completed_and_billed");
      const nextDeal = { ...deal, ...completedDeal, client: deal.client, contact: deal.contact };
      // Đưa deal lên đầu cột "Hoàn thành" + highlight, giống mọi đường đổi giai đoạn khác.
      moveToStage(deal.id, "completed_and_billed");
      updateStoredDeal(nextDeal);
      queryClient.setQueryData(dealKeys.detail(deal.id), nextDeal);
      toast.success("Đã hoàn thành và ghi nhận thanh toán dự án.");
      addDealHistoryEntry(deal.id, {
        date: new Date().toISOString(),
        text: "Dự án hoàn thành và đã thanh toán.",
        channel: "message",
      });
      setCompleteDialogOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error, "");
      if (message.includes("mốc thu tiền")) {
        toast.error(message);
        setTab("tasks");
      } else {
        toast.error("Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.");
      }
    } finally {
      setCompletePending(false);
    }
  }

  function handleSubmitInvoiceDraft(payload: InvoicePayload) {
    if (!deal) return;
    createInvoice.mutate(payload, {
      onSuccess: (invoice) => {
        toast.success("Đã tạo hóa đơn nháp và lưu vào Tài liệu.");
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: `Đã tạo hóa đơn ${invoice.invoice_number}.`,
          channel: "message",
        });
        setSelectedInvoice(invoice);
        setInvoiceModalMode("edit");
      },
      onError: (error) => {
        const message = getApiErrorMessage(error, "");
        toast.error(message || "Không thể tạo hóa đơn. Vui lòng thử lại.");
      },
    });
  }

  function handleUpdateInvoice(invoiceId: string, payload: InvoiceUpdatePayload) {
    if (!deal) return;
    updateInvoiceMutation.mutate(
      { invoiceId, payload },
      {
        onSuccess: (invoice) => {
          toast.success("Đã lưu chỉnh sửa hóa đơn.");
          addDealHistoryEntry(deal.id, {
            date: new Date().toISOString(),
            text: `Đã chỉnh sửa hóa đơn ${invoice.invoice_number}.`,
            channel: "message",
          });
          setSelectedInvoice(invoice);
          setInvoiceModalMode("edit");
        },
        onError: (error) => {
          const message = getApiErrorMessage(error, "");
          toast.error(message || "Không thể chỉnh sửa hóa đơn. Vui lòng thử lại.");
        },
      }
    );
  }

  /**
   * "Lưu & gửi cho khách" trong cửa sổ soạn: lưu nội dung TRƯỚC rồi mới gửi.
   *
   * Thứ tự này không đổi được. Gửi trước rồi lưu là thư đã ra khỏi máy chủ mang nội dung cũ,
   * còn màn hình thì hiện nội dung mới — freelancer tin vào thứ khách không hề nhận được.
   * Lưu hụt thì dừng hẳn, không gửi.  #Huynh
   */
  function handleSaveAndSendInvoice(invoiceId: string, payload: InvoiceUpdatePayload) {
    if (!deal) return;
    const task = invoiceTaskAwaitingSend;
    updateInvoiceMutation.mutate(
      { invoiceId, payload },
      {
        onSuccess: () => {
          sendInvoiceMutation.mutate(invoiceId, {
            onSuccess: (sent) => {
              toast.success(`Đã gửi hóa đơn ${sent.invoice_number} cho khách.`);
              addDealHistoryEntry(deal.id, {
                date: new Date().toISOString(),
                text: `Đã gửi hóa đơn ${sent.invoice_number}.`,
                channel: "email",
              });
              if (task) markPaymentTaskDoneAfterSend(task);
              setInvoiceTaskAwaitingSend(null);
              setSelectedInvoice(null);
              setInvoiceModalMode(null);
            },
            onError: (err) => {
              // Nội dung ĐÃ lưu nhưng thư chưa đi. Nói rõ cả hai vế, không thì người dùng
              // tưởng mất luôn thứ vừa gõ và ngồi soạn lại từ đầu.
              toast.error(
                "Đã lưu nội dung nhưng chưa gửi được: " +
                  invoiceErrorMessage(err, "lỗi không rõ.")
              );
            },
          });
        },
        onError: (err) => {
          toast.error(invoiceErrorMessage(err, "Không lưu được nội dung nên chưa gửi."));
        },
      }
    );
  }

  function handleViewInvoice(invoice: InvoiceResponse) {
    setSelectedInvoice(invoice);
    setInvoiceModalMode(invoice.status === "draft" ? "edit" : "view");
  }

  function handleDeleteInvoice(invoice: InvoiceResponse) {
    if (!deal) return;
    if (invoice.status !== "draft") {
      toast.error("Hóa đơn đã gửi thì không xóa trực tiếp được. Nếu cần, hãy hủy hóa đơn.");
      return;
    }
    deleteInvoiceMutation.mutate(invoice.id, {
      onSuccess: () => {
        toast.success("Đã xóa hóa đơn nháp.");
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: `Đã xóa hóa đơn nháp ${invoice.invoice_number}.`,
          channel: "message",
        });
        setSelectedInvoice(null);
        setInvoiceModalMode(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Không thể xóa bản nháp. Vui lòng thử lại."));
      },
    });
  }

  function handleVoidInvoice(invoice: InvoiceResponse) {
    if (!deal) return;
    voidInvoiceMutation.mutate(invoice.id, {
      onSuccess: (voidedInvoice) => {
        toast.success("Đã hủy hóa đơn.");
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: `Đã hủy hóa đơn ${voidedInvoice.invoice_number}.`,
          channel: "message",
        });
        setSelectedInvoice(voidedInvoice);
        setInvoiceModalMode("view");
      },
      onError: (error) => {
        const message = getApiErrorMessage(error, "");
        toast.error(message || "Không thể hủy hóa đơn. Vui lòng thử lại.");
      },
    });
  }

  function handleSendInvoice(invoiceId: string) {
    if (!deal) return;
    sendInvoiceMutation.mutate(invoiceId, {
      onSuccess: (invoice) => {
        toast.success("Đã chuyển hóa đơn sang trạng thái đã gửi.");
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: `Đã gửi hóa đơn ${invoice.invoice_number}.`,
          channel: "email",
        });
      },
      onError: (error) => {
        const message = getApiErrorMessage(error, "");
        toast.error(message || "Không thể gửi hóa đơn. Vui lòng thử lại.");
      },
    });
  }

  function handleRecordInvoicePayment(invoice: InvoiceResponse) {
    if (!deal) return;
    const remaining = Math.max(Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0), 0);
    if (remaining <= 0) {
      toast.info("Hóa đơn này đã được ghi nhận thanh toán đủ.");
      return;
    }
    if (invoice.status === "draft") {
      toast.error("Cần gửi hóa đơn trước khi ghi nhận thanh toán.");
      return;
    }

    recordInvoicePaymentMutation.mutate(
      {
        invoiceId: invoice.id,
        payload: {
          amount: remaining,
          payment_date: toApiDateValue(new Date()),
          payment_method: "other",
          reference_note: "Freelancer xác nhận khách đã thanh toán ngoài hệ thống.",
        },
      },
      {
        onSuccess: (updatedInvoice) => {
          toast.success("Đã ghi nhận thanh toán cho hóa đơn.");
          addDealHistoryEntry(deal.id, {
            date: new Date().toISOString(),
            text: `Đã ghi nhận thanh toán ${formatVND(remaining)} cho hóa đơn ${updatedInvoice.invoice_number}.`,
            channel: "message",
          });
        },
        onError: (error) => {
          const message = getApiErrorMessage(error, "");
          toast.error(message || "Không thể ghi nhận thanh toán. Vui lòng thử lại.");
        },
      }
    );
  }

  function handleAddAttachment(file: File) {
    if (!deal) return;

    // KHÔNG chặn theo `file.type`. Trình duyệt trên Windows đôi khi trả về chuỗi RỖNG cho
    // đúng file PDF (thiếu ánh xạ MIME trong registry) — chặn theo nó là người dùng chọn
    // PDF thật mà bị từ chối, không hiểu vì sao.
    //
    // Backend đã kiểm tra định dạng rồi (ALLOWED_CONTENT_TYPES) và trả 422 kèm lý do rõ
    // ràng. Ở đây chỉ chặn thứ chắc chắn sai: file quá lớn.  #Huynh
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File quá lớn (tối đa ${MAX_FILE_SIZE_MB}MB).`);
      return;
    }

    uploadAttachment.mutate(file, {
      onSuccess: (attachment) => {
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: attachment.ai_readable
            ? `Đã tải lên "${attachment.filename}" — AI đọc được nội dung.`
            : `Đã tải lên "${attachment.filename}".`,
          channel: "document",
        });
      },
    });
  }

  function handleSendContract(contractId: string) {
    sendContract.mutate(contractId, {
      onSuccess: () => {
        toast.success("Đã gửi hợp đồng cho khách ký.");
        if (deal) addDealHistoryEntry(deal.id, { date: new Date().toISOString(), text: "Đã gửi hợp đồng cho khách ký.", channel: "email" });
      },
      onError: () => toast.error("Gửi hợp đồng thất bại. Vui lòng thử lại."),
    });
  }

  /**
   * HỎI trước khi xoá file đính kèm.
   *
   * Nút thùng rác nằm ngay cạnh nút "Tải PDF", cùng cỡ, cùng hàng — trượt tay một ô là file
   * biến mất, mà file này thường là thứ KHÁCH gửi (mô tả yêu cầu, chứng từ chuyển khoản) nên
   * không tự dựng lại được. Mọi hành động xoá khác trong trang đều đã hỏi; riêng chỗ này bị
   * bỏ sót.  #Huynh
   */
  function handleDeleteAttachment(attachment: DealAttachment) {
    setAttachmentPendingDelete(attachment);
  }

  function handleConfirmDeleteAttachment() {
    const attachment = attachmentPendingDelete;
    if (!attachment) return;
    setAttachmentPendingDelete(null);
    deleteAttachment.mutate(attachment.id);
  }

  function handleSignContract(contract: { id: string }) {
    if (!deal) return;
    // Khách ký ngoài hệ thống (giấy/scan/Zalo), freelancer GHI NHẬN lại. SoloDesk là sổ
    // theo dõi, không phải nền tảng chữ ký số.
    //
    // Trước đây hàm này chỉ nhét id vào một Set trong useState — không gọi API, không lưu
    // đâu cả. Bấm xong thấy nút triển khai mở ra, F5 phát là về như cũ. Giờ gọi thật:
    // PATCH /contracts/{id}/status -> active, backend ghi cả hai mốc chữ ký.  #Huynh
    recordSignature.mutate(contract.id, {
      onSuccess: () => {
        // Backend vừa sinh các mốc "Thu tiền:" trên project (xem
        // `ContractsService.transition_status`). Không nạp lại danh sách task ở đây thì tab
        // Công việc vừa mở ra đã trống trơn, phải F5 mới thấy — mà thứ nằm trong đó lại đúng
        // là việc phải làm NGAY: đi thu cọc.  #Huynh
        queryClient.invalidateQueries({ queryKey: projectTaskKeys.all(deal.id) });
        toast.success(
          "Đã ghi nhận khách ký hợp đồng. Xem tab Công việc để thu đợt đầu trước khi bắt đầu."
        );
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: "Ghi nhận: khách đã ký hợp đồng (ký ngoài hệ thống).",
          channel: "message",
        });
      },
      onError: (error) => toast.error(contractErrorMessage(error)),
    });
  }

  function handleAddTask(title: string, note: string) {
    if (!projectId) {
      toast.error("Project chưa sẵn sàng. Vui lòng đợi dữ liệu triển khai tải xong.");
      return;
    }
    addTaskMutation.mutate({ title, note });
  }

  function handleUpdateTask(taskId: string, patch: Partial<ProjectTask>) {
    updateTaskMutation.mutate({ taskId, title: patch.title, note: patch.note });
  }

  // --- Mốc "Thu tiền:" ↔ hóa đơn ------------------------------------------------------
  //
  // Tick một mốc thu tiền nghĩa là TIỀN ĐÃ VỀ. Nhưng nếu chỉ tick suông thì `amount_paid`
  // của hóa đơn không ai cập nhật — hóa đơn nằm mãi ở "đã gửi" và bảng doanh thu không bao
  // giờ đúng. Nên lúc tick phải hỏi, và câu hỏi đổi theo việc mốc đó đã có chứng từ chưa.
  //  #Huynh

  /** Câu tiếng Việt cho lỗi thao tác hóa đơn, nói rõ lý do thay vì "có lỗi xảy ra". */
  function invoiceErrorMessage(err: unknown, fallback: string): string {
    if (getApiErrorStatus(err) === undefined) {
      return "Không kết nối được máy chủ. Kiểm tra đường mạng rồi thử lại.";
    }
    // 502 + EMAIL_DELIVERY_FAILED: backend đã phân loại sẵn (hộp thư sai cấu hình / chạm
    // giới hạn gửi / không nối được máy chủ thư) và soạn câu an toàn. Hiện nguyên câu đó.
    if (getApiErrorCode(err) === "EMAIL_DELIVERY_FAILED") {
      return getApiErrorMessage(err, "Hệ thống thư đang gặp sự cố. Vui lòng thử lại sau.");
    }
    return getApiErrorMessage(err, fallback);
  }

  /**
   * Bấm "Tạo & gửi hóa đơn" cho một khoản THU KHI XONG mà công việc chưa tick xong.
   *
   * CẢNH BÁO chứ không CHẶN. Chặn cứng nghe hợp lý nhưng cắn ngược: freelancer làm xong hôm
   * nay, xuất hóa đơn luôn, tick task sau — chuyện rất thường. Chặn là biến thao tác đúng
   * thành lỗi. Còn gửi khách hóa đơn cho việc chưa làm thì đáng hỏi lại một câu.  #Huynh
   */
  function requestCreateAndSendInvoice(task: ProjectTask) {
    if (task.billingDueType === "on_completion" && task.status !== "done") {
      setEarlyInvoiceTask(task);
      return;
    }
    createInvoiceDraftForReview(task);
  }

  /**
   * Gửi hóa đơn xong thì TICK LUÔN công việc đó.
   *
   * Trước đây hai thứ rời nhau, nên bảng việc hiện những hàng tự mâu thuẫn: mốc còn nhãn
   * "Chưa làm" trong khi hóa đơn của chính nó đã "Đã thanh toán". Freelancer phải nhớ tick
   * tay, mà quên thì guard "Hoàn thành dự án" chặn lại dù tiền đã về đủ.
   *
   * Đi thẳng vào mutation chứ KHÔNG qua `handleToggleTask`: hàm đó mở hộp thoại hỏi "gửi hóa
   * đơn cho khách luôn?" — hỏi đúng thứ vừa làm xong.
   *
   * Bỏ qua khi task đã xong sẵn (gửi lại hóa đơn cho một mốc đã tick) để không bắn thêm một
   * lượt ghi vô nghĩa.  #Huynh
   */
  function markPaymentTaskDoneAfterSend(task: ProjectTask) {
    if (!shouldTickAfterInvoiceSent(task)) return;
    toggleTaskMutation.mutate({ taskId: task.id, is_done: true });
  }

  /**
   * Bấm "Soạn & gửi hóa đơn" ở một mốc thu tiền → tạo BẢN NHÁP rồi MỞ CỬA SỔ SOẠN.
   *
   * Bản trước tạo xong gửi thẳng, không cho xem lại một chữ. Hậu quả: thư khách nhận chỉ có
   * số tiền và hạn thanh toán, không một dòng nào của freelancer — mà freelancer thì không hề
   * biết, vì họ có được nhìn thấy nội dung ấy đâu. Gửi thư đứng tên mình ra ngoài cho khách
   * là việc không được làm sau lưng người ta.
   *
   * Nháp tạo trước rồi mới mở cửa sổ, chứ không mở cửa sổ trống: số tiền và hạn thanh toán
   * phải là con số CHỐT của mốc trong báo giá đã ký, do backend tính từ `billing_amount` —
   * không phải thứ để gõ lại bằng tay. Freelancer chỉ sửa tên hóa đơn và lời nhắn.
   *
   * `POST /tasks/{id}/invoice` idempotent, nên bấm nhầm hai lần cũng chỉ ra một hóa đơn.  #Huynh
   */
  function createInvoiceDraftForReview(task: ProjectTask) {
    setInvoiceBusyTaskId(task.id);
    createTaskInvoice.mutate(task.id, {
      onSuccess: (invoice) => {
        setInvoiceBusyTaskId(null);
        // Nhớ mốc lại: gửi xong còn phải tick nó, mà cửa sổ soạn không biết gì về task.
        setInvoiceTaskAwaitingSend(task);
        setSelectedInvoice(invoice);
        setInvoiceModalMode("edit");
      },
      onError: (err) => {
        toast.error(invoiceErrorMessage(err, "Không tạo được hóa đơn cho mốc này."));
        setInvoiceBusyTaskId(null);
      },
    });
  }

  /**
   * Mốc đã có bản nháp → mở lại cửa sổ soạn để xem trước khi gửi.
   *
   * Cùng lý do với `createInvoiceDraftForReview`: không có đường nào gửi thư ra ngoài mà
   * freelancer chưa nhìn thấy nội dung.  #Huynh
   */
  function sendExistingInvoice(task: ProjectTask) {
    if (!task.invoice) return;
    const draft = (invoices.data ?? []).find((item) => item.id === task.invoice?.id);
    if (!draft) {
      toast.error("Không mở được hóa đơn của mốc này. Hãy tải lại trang.");
      return;
    }
    setInvoiceTaskAwaitingSend(task);
    setSelectedInvoice(draft);
    setInvoiceModalMode("edit");
  }

  function recordFullPayment(task: ProjectTask) {
    if (!task.invoice) return;
    const conLai = task.invoice.total - task.invoice.amountPaid;
    if (conLai <= 0) return;
    setInvoiceBusyTaskId(task.id);
    recordTaskPayment.mutate(
      {
        invoiceId: task.invoice.id,
        payload: {
          amount: conLai,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: "bank_transfer",
        },
      },
      {
        onSuccess: () => toast.success(`Đã ghi nhận thu ${formatVND(conLai)}.`),
        onError: (err) => toast.error(invoiceErrorMessage(err, "Không ghi nhận được thanh toán.")),
        onSettled: () => setInvoiceBusyTaskId(null),
      }
    );
  }

  function handleToggleTask(taskId: string, completed: boolean) {
    const task = (taskQuery.data?.tasks ?? []).find((item) => item.id === taskId);

    // Chỉ hỏi khi TICK XONG một mốc thu tiền. Bỏ tick thì không hỏi gì — người ta đang sửa
    // lại thao tác lỡ tay, chen một hộp thoại vào lúc đó chỉ tổ vướng.
    //
    // Hóa đơn đã thu đủ rồi thì cũng không hỏi: không còn gì để làm, hỏi nữa là phiền.
    if (completed && task && isPaymentTask(task)) {
      const daThuDu = task.invoice ? task.invoice.amountPaid >= task.invoice.total : false;
      if (!daThuDu) {
        setPaymentTaskPrompt(task);
        return;
      }
    }
    toggleTaskMutation.mutate({ taskId, is_done: completed });
  }

  /** "Để sau" — vẫn tick xong task. Người ta bấm tick là để tick. */
  function finishTogglingPaymentTask() {
    if (!paymentTaskPrompt) return;
    toggleTaskMutation.mutate({ taskId: paymentTaskPrompt.id, is_done: true });
    setPaymentTaskPrompt(null);
  }

  function handleDeleteTask(taskId: string) {
    deleteTaskMutation.mutate(taskId);
  }

  if (dealQuery.isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết dự án...
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="grid h-screen place-items-center bg-background p-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Không tìm thấy dự án</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dự án có thể đã bị lưu trữ hoặc bạn không có quyền truy cập.</p>
          <button
            onClick={goBack}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Quay lại quy trình
          </button>
        </div>
      </div>
    );
  }

  const client = clientQuery.data;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active="pipeline"
        onOpenAI={() => setNewDealOpen(true)}
        onNavigate={(nav) => navigate({ to: nav === "admin" ? "/admin" : "/" })}
      />

      {/* KHUNG CỐ ĐỊNH: trang không cuộn, mỗi vùng tự cuộn phần của nó.
          Tab nào nhiều nội dung thì cuộn trong tab đó, cột phải cuộn riêng.

          NHƯNG chỉ áp từ `xl` trở lên — chỗ này từng là một lỗi mất nội dung thật.
          Dưới 1280px lưới hai cột xếp chồng lại, tổng chiều cao chắc chắn vượt màn hình;
          khoá `overflow-hidden` lúc đó là phần dưới bị cắt mà KHÔNG có thanh cuộn nào kéo
          tới được (laptop 1366×768 dính đúng lỗi này). Nên dưới `xl` để vùng nội dung tự
          cuộn như một trang bình thường.  #Huynh */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={goBack}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Quay lại quy trình"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Dự án</span>
                  <span>/</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", STAGE_BY_ID[deal.stage].dotClass)} />
                    {STAGE_BY_ID[deal.stage].shortTitle}
                  </span>
                </div>
                <h1 className="truncate text-lg font-bold">{deal.client} — {draft.title || deal.projectType}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StageBadge deal={deal} />
              <button
                onClick={handleArchive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Loại bỏ dự án
              </button>
            </div>
          </div>
        </header>

        {/* Vùng này cuộn — nhưng bình thường KHÔNG hiện thanh cuộn nào, vì lưới bên trong
            cao đúng 100% (`xl:h-full`) nên vừa khít.

            Giữ `overflow-y-auto` làm lưới đỡ cho hai trường hợp: dưới 1280px (hai cột xếp
            chồng, chắc chắn cao hơn màn hình) và khi cột phải dài bất thường. Khoá cứng
            `overflow-hidden` là nội dung tràn ra bị cắt mà không cách nào kéo tới. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {/* HAI cột: việc bên trái, thông tin bổ trợ bên phải.
              Bản cũ ba cột (khách 280px | nội dung | hành động 300px) ngốn 580px chiều ngang
              cho hai cột phụ, mà cả hai đều là thông tin bổ trợ nên gom về một chỗ. */}
          <div className="grid gap-4 xl:h-full xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              {/* MỘT thanh tab cho cả trang, "Tổng quan" là tab đầu.
                  Trước đây thẻ tổng quan nằm rời phía trên rồi mới tới thanh tab — nhìn như
                  hai khu riêng, mà thực chất đều là nội dung của cùng một deal.

                  CỐ Ý không bọc tất cả vào một thẻ có viền: mỗi tab bên trong đã tự dựng thẻ
                  riêng (DocumentsTab, ProjectTaskPanel, DealReminderPanel…), bọc thêm một
                  lớp nữa là viền lồng viền.  #Huynh */}
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as DetailTab)}
                className="flex-col gap-0 xl:min-h-0 xl:flex-1 xl:overflow-hidden"
              >
                <TabsList variant="line" className="w-full shrink-0 justify-start overflow-x-auto border-b border-border">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="tasks">
                    Công việc {projectStageUnlocked ? `(${taskQuery.data?.total ?? 0})` : "(chưa mở)"}
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    Tài liệu ({proposalItems.length + contractItems.length + dealAttachments.length + (invoices.data?.length ?? 0) + savedQualificationDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="reminders">Nhắc nhở ({reminders.data?.length ?? 0})</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="min-w-0 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    {/* Bỏ nhãn "TỔNG QUAN DỰ ÁN": chính cái tab đang mở đã nói điều đó rồi.
                        Nhãn đi thì hàng này chỉ còn nhóm nút bên phải, nên gộp luôn hai lớp
                        div lồng nhau (cả hai đều justify-end) làm một. */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {overviewEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={cancelOverviewEdit}
                            disabled={updateDeal.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" /> Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveOverview}
                            disabled={!hasOverviewChanges || updateDeal.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updateDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {updateDeal.isPending ? "Đang lưu..." : "Lưu"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOverviewEditing(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{displayBudgetLabel}</div>
                        <div className="mt-1 max-w-[12rem] break-words text-xl font-bold text-primary">{displayBudget}</div>
                      </div>
                    </div>

                    <div className="mt-3 min-w-0">
                      {overviewEditing ? (
                        <>
                          <input
                            value={draft.title}
                            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                            aria-label="Tên dự án"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xl font-bold outline-none focus:ring-2 focus:ring-ring"
                          />
                          <textarea
                            value={draft.notes}
                            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                            aria-label="Mô tả dự án"
                            rows={4}
                            placeholder="Mô tả yêu cầu, phạm vi hoặc ghi chú nội bộ..."
                            className="mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                          />
                        </>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold">{deal.projectType}</h2>
                          {/* Giữ NGUYÊN VĂN như lúc nhập, không tách thành từng mục. Đây là chữ
                              của khách và của chính freelancer gõ vào — bóc nhỏ ra rồi sắp lại
                              làm mất mạch đọc. */}
                          <p className="mt-2 w-full whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                            {displayDescription || "Chưa có mô tả chi tiết."}
                          </p>
                        </>
                      )}
                    </div>

                    {/* File khách gửi kèm — hiện NGAY ở tổng quan, không bắt lặn vào tab Tài liệu.
                        Đây là thứ AI đọc để chấm điểm, nên người dùng cần thấy ngay "deal này có
                        brief hay không" và "AI có đọc được nó không".  #Huynh */}
                    {dealAttachments.length > 0 && (
                      <div className="mt-4 border-t border-border pt-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          File khách gửi ({dealAttachments.length})
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {dealAttachments.map((file) => (
                            <li key={file.id} className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {isViewableInApp(file.content_type) ? (
                                <button
                                  type="button"
                                  onClick={() => setViewAttachment(file)}
                                  className="min-w-0 truncate text-sm text-foreground underline-offset-2 hover:underline"
                                >
                                  {file.filename}
                                </button>
                              ) : (
                                <span className="min-w-0 truncate text-sm text-foreground">{file.filename}</span>
                              )}
                              {file.ai_readable ? (
                                <span
                                  title="AI đã đọc nội dung file này để chấm điểm deal"
                                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                                >
                                  <Sparkles className="h-2.5 w-2.5" /> AI đọc được
                                </span>
                              ) : (
                                <span
                                  title="File scan/ảnh không có lớp chữ — AI không bóc được nội dung"
                                  className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  AI không đọc được
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Deal đã loại bỏ thì không có "tiến độ" nào cả — nói thẳng trạng thái thay
                        vì vẽ một thanh 0% trông như dự án mới bắt đầu. */}
                    <div className="mt-5">
                      {isLost ? (
                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          Dự án đã bị loại bỏ — không còn nằm trong quy trình.
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Tiến độ quy trình</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Trang tự cuộn nên tab KHÔNG được tự cuộn nữa.
                    Bất biến cũ ("mỗi TabsContent phải có min-h-0 flex-1 overflow-y-auto") gắn
                    với mô hình khung cố định. Giữ lại trong mô hình mới là sinh hai thanh cuộn
                    lồng nhau — thứ khó chịu nhất khi dùng.  #Huynh */}
                <TabsContent value="tasks" className="min-w-0 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  {projectStageUnlocked && taskQuery.isLoading ? (
                    <div className="grid min-h-64 place-items-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải project và công việc...
                      </div>
                    </div>
                  ) : projectStageUnlocked ? (
                    <ProjectTaskPanel
                      tasks={taskQuery.data?.tasks ?? []}
                      onAddTask={handleAddTask}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      onToggleTask={handleToggleTask}
                      /* `fill` để khung kéo dài hết chiều cao tab. Bản mặc định chốt cứng
                         560px nên trên màn hình cao, thẻ dừng lơ lửng giữa chừng mà bên
                         trong đã có thanh cuộn — nhìn như bị cắt cụt.

                         An toàn ở cả hai phía: `fill` = `h-full`, tức `height: 100%`. Dưới
                         `xl` khung cha cao tự do nên theo chuẩn CSS nó tính về `auto` —
                         danh sách trải hết và trang cuộn, đúng thứ mình muốn ở màn nhỏ. */
                      height="fill"
                      invoiceActions={{
                        onCreateAndSend: requestCreateAndSendInvoice,
                        onSend: sendExistingInvoice,
                        onRecordPayment: recordFullPayment,
                        pendingTaskId: invoiceBusyTaskId,
                      }}
                    />
                  ) : (
                    <ProjectLockedPanel deal={deal} hasAcceptedProposal={Boolean(acceptedProposal)} />
                  )}
                </TabsContent>

                <TabsContent value="documents" className="min-w-0 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  <DocumentsTab
                    attachments={dealAttachments}
                    onViewAttachment={setViewAttachment}
                    proposals={proposalItems}
                    contracts={contractItems}
                    invoices={invoices.data ?? []}
                    onAddAttachment={handleAddAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onViewInvoice={handleViewInvoice}
                    onVoidInvoice={handleVoidInvoice}
                    onSendInvoice={handleSendInvoice}
                    onRecordInvoicePayment={handleRecordInvoicePayment}
                    onProposalDecision={(proposalId, status) =>
                      status === "accepted"
                        ? setProposalPendingAccept(proposalId)
                        : handleProposalDecision(proposalId, status)
                    }
                    proposalDecisionLoading={proposalDecision.isPending}
                    onViewProposal={(id) => setViewProposalId(id)}
                    onEditProposal={handleEditProposal}
                    onDeleteProposal={(id) => setDeleteProposalId(id)}
                    onSendContract={handleSendContract}
                    onSignContract={(contract) => setContractPendingSign({ id: contract.id })}
                    onViewContract={(id) => setViewContractId(id)}
                    savedQualifications={savedQualificationDocs}
                    onViewQualification={setViewQualificationDoc}
                    contractActionLoading={sendContract.isPending}
                    pendingInvoiceId={pendingInvoiceId}
                  />
                </TabsContent>

                {/* `overflow-hidden` chứ không phải `overflow-y-auto`: `DealReminderPanel`
                    đã tự cuộn danh sách bên trong nó. Cho tab cuộn nữa là hai thanh lồng. */}
                <TabsContent value="reminders" className="min-w-0 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
                  <DealReminderPanel deal={deal} />
                </TabsContent>

                <TabsContent value="history" className="min-w-0 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  {/* MỘT dòng thời gian: các lần AI chấm điểm (lấy thẳng từ backend nên
                      xem lại được kể cả sau F5) trộn chung với hoạt động khác, xếp theo
                      thời gian. Trước đây tách hai danh sách, người dùng phải nhìn hai
                      chỗ mới dựng lại được câu chuyện của deal. */}
                  <DealActivityTimeline
                    dealId={deal?.id}
                    historyItems={historyItems}
                    proposals={proposalItems}
                    onViewQualification={setViewQualificationDoc}
                    onViewProposal={(id) => setViewProposalId(id)}
                  />
                </TabsContent>
              </Tabs>
            </section>

            {/* MỘT cột bổ trợ duy nhất, dính lại khi cuộn.
                `max-h` + `overflow-y-auto` là bắt buộc chứ không phải cho đẹp: cột này cao
                hơn màn hình (thẻ điểm + thẻ khách + thẻ thông tin) mà chỉ có `sticky` thì
                phần đáy bị ghim ngoài tầm nhìn, cuộn kiểu gì cũng không tới.  #Huynh */}
            {/* `div` chứ không phải `aside`: hai thẻ con đã là `aside` rồi, lồng landmark
                trong landmark thì trình đọc màn hình đọc thành ba vùng phụ chồng nhau.

                Cột này KHÔNG tự cuộn: cao đúng bằng nội dung (`xl:self-start`), không kéo
                giãn theo hàng lưới nên cũng không sinh thanh cuộn riêng. Trường hợp hiếm mà
                nội dung cao hơn màn hình thì vùng ngoài đỡ (xem chú thích ở đó), chứ không
                bị cắt mất. */}
            <div className="space-y-4 xl:self-start">
              <ActionsPanel
                deal={deal}
                onEvaluate={() => {
                  if (!deal) return;
                  openAiPanel({ kind: "deal_qualification", dealId: deal.id });
                }}
                onProposal={() => {
                  const target = dealForProposal ?? deal;
                  if (!target) return;
                  // KHÔNG nhét sẵn id bản nháp nữa: modal tự hiện màn chọn (bản nháp đang có +
                  // mẫu điều khoản) rồi freelancer quyết mở lại bản nào hay tạo bản mới. Nhảy
                  // thẳng vào bản nháp là cướp mất quyền chọn đó.  #Huynh
                  openAiPanel({ kind: "proposal_generation", dealId: target.id });
                }}
                onContract={handleGenerateContract}
                onStartProject={handleStartProject}
                onComplete={handleCompleteProject}
                contractLoading={
                  createContract.isPending ||
                  generateContract.isPending ||
                  fillContractSkeleton.isPending
                }
                stageTransitionLoading={transitionDealStage.isPending || completePending}
                hasAcceptedProposal={Boolean(acceptedProposal)}
                hasContract={contractItems.length > 0}
                hasDraftContract={Boolean(draftContract)}
                hasActiveContract={hasDeploymentReadyContract}
              />

              <ClientInfoPanel deal={deal} client={client} />
            </div>
          </div>
        </div>
      </main>

      <NewDealModal open={newDealOpen} onClose={() => setNewDealOpen(false)} />
      <AIActivityCenter />

      <Dialog open={contractChooserOpen} onOpenChange={setContractChooserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo hợp đồng</DialogTitle>
          </DialogHeader>
          <DocTemplateChooser
            templates={contractTemplates.data ?? []}
            value={contractTemplateId}
            onChange={setContractTemplateId}
            docLabel="hợp đồng"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setContractChooserOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Hủy
            </button>
            <button
              type="button"
              title="Không gọi AI, không tốn lượt — bạn tự điền nội dung trên tờ hợp đồng"
              onClick={() => {
                setContractChooserOpen(false);
                runGenerateContract(contractTemplateId, true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Tôi tự soạn
            </button>
            <button
              type="button"
              disabled={canUseAi === false}
              title={
                canUseAi === false
                  ? "Gói hiện tại chưa dùng được AI — bạn vẫn soạn tay được"
                  : "AI viết nội dung hợp đồng dựa trên báo giá đã chốt"
              }
              onClick={() => {
                setContractChooserOpen(false);
                runGenerateContract(contractTemplateId);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Nhờ AI viết
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewContractId && <ContractViewModal contractId={viewContractId} onClose={() => setViewContractId(null)} />}
      {viewProposalId && (
        <ProposalViewModal
          proposalId={viewProposalId}
          deal={deal ?? null}
          onClose={() => setViewProposalId(null)}
        />
      )}
      {viewQualificationDoc && (
        <QualificationViewModal
          document={viewQualificationDoc}
          deal={deal}
          onClose={() => setViewQualificationDoc(null)}
        />
      )}
      {viewAttachment && (
        <AttachmentViewerModal attachment={viewAttachment} onClose={() => setViewAttachment(null)} />
      )}
      {invoiceModalMode && (
        <InvoiceComposerModal
          mode={invoiceModalMode}
          deal={deal}
          suggestedInvoiceIndex={(invoices.data?.length ?? 0) + 1}
          existingInvoices={invoices.data ?? []}
          client={{
            name: client?.name ?? deal.client,
            email: client?.email ?? deal.clientEmail ?? null,
            phone: client?.phone ?? deal.clientPhone ?? null,
          }}
          invoice={selectedInvoice}
          isLoading={createInvoice.isPending || updateInvoiceMutation.isPending || deleteInvoiceMutation.isPending}
          onClose={() => {
            setInvoiceModalMode(null);
            setSelectedInvoice(null);
            setInvoiceTaskAwaitingSend(null);
          }}
          onCreate={handleSubmitInvoiceDraft}
          onUpdate={handleUpdateInvoice}
          onSaveAndSend={handleSaveAndSendInvoice}
          onDelete={handleDeleteInvoice}
        />
      )}
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Loại bỏ dự án?"
        description={
          deal
            ? `Dự án "${deal.projectType}" sẽ được loại khỏi quy trình và không còn hiển thị trong bảng dự án.`
            : undefined
        }
        confirmLabel="Loại bỏ dự án"
        cancelLabel="Giữ lại"
        tone="danger"
        isLoading={deleteDeal.isPending}
        onConfirm={confirmRemoveDeal}
      />
      {/* Hai mốc "khách đã đồng ý" — đều là GHI NHẬN việc xảy ra ngoài hệ thống (Zalo, gọi
          điện, gặp mặt), nên chỉ mình freelancer biết đúng hay sai. Bấm xong deal đi tiếp
          một giai đoạn mà luật không cho lùi, nên phải hỏi lại một câu.  #Huynh */}
      <ConfirmDialog
        open={Boolean(proposalPendingAccept)}
        onOpenChange={(open) => {
          if (!open) setProposalPendingAccept(null);
        }}
        title="Khách đã đồng ý báo giá này?"
        description={
          deal
            ? `Chỉ bấm khi khách "${deal.client}" đã thật sự đồng ý ở ngoài (Zalo, email, gọi điện). Dự án sẽ chuyển sang Đang Đàm Phán và không lùi lại được.`
            : undefined
        }
        confirmLabel="Đúng, khách đã đồng ý"
        cancelLabel="Chưa, để sau"
        isLoading={proposalDecision.isPending}
        onConfirm={() => {
          if (!proposalPendingAccept) return;
          handleProposalDecision(proposalPendingAccept, "accepted");
          setProposalPendingAccept(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(contractPendingSign)}
        onOpenChange={(open) => {
          if (!open) setContractPendingSign(null);
        }}
        title="Khách đã ký hợp đồng?"
        description="Chỉ bấm khi đã cầm được bản ký của khách (giấy, bản scan, hoặc ảnh chụp). Hợp đồng sẽ chuyển sang có hiệu lực và hệ thống lập luôn các mốc thu tiền — bỏ ra thì phải dọn tay."
        confirmLabel="Đúng, khách đã ký"
        cancelLabel="Chưa, để sau"
        isLoading={recordSignature.isPending}
        onConfirm={() => {
          if (!contractPendingSign) return;
          handleSignContract(contractPendingSign);
          setContractPendingSign(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(attachmentPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setAttachmentPendingDelete(null);
        }}
        title="Xoá file này?"
        description={
          attachmentPendingDelete
            ? `"${attachmentPendingDelete.filename}" sẽ bị xoá khỏi hồ sơ giao dịch và không lấy lại được. Nếu là file khách gửi thì bạn sẽ phải xin lại.`
            : undefined
        }
        confirmLabel="Xoá file"
        cancelLabel="Giữ lại"
        tone="danger"
        isLoading={deleteAttachment.isPending}
        onConfirm={handleConfirmDeleteAttachment}
      />

      <ConfirmDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        title="Hoàn thành dự án?"
        description="SoloDesk sẽ ghi nhận dự án đã xong và đã thanh toán. Bạn nên chỉ xác nhận khi đã bàn giao hoặc đã tự đối soát thanh toán với khách ngoài hệ thống."
        confirmLabel="Xác nhận hoàn thành"
        cancelLabel="Kiểm tra lại"
        isLoading={completePending}
        onConfirm={handleConfirmCompleteProject}
      />
      {/* Tick một mốc thu tiền = tiền đã về. Hỏi ngay để chứng từ đi theo, thay vì bắt người
          dùng nhớ sang tab Tài liệu làm nốt — mà thường là không ai nhớ.

          "Để sau" vẫn tick xong task — người ta bấm tick là để tick, đừng bắt trả lời câu
          hỏi khác mới cho làm việc mình định làm.

          Từng có nút "Huỷ" thứ ba (bỏ luôn việc tick), nay bỏ đi: dấu ✕ ở góc cửa sổ vốn đã
          làm đúng việc đó rồi (onOpenChange -> setPaymentTaskPrompt(null)), nên nó chỉ là
          một nút nói lại điều người dùng đã biết cách làm.  #Huynh */}
      <Dialog
        open={Boolean(paymentTaskPrompt)}
        onOpenChange={(open) => {
          if (!open) setPaymentTaskPrompt(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {paymentTaskPrompt &&
            (() => {
              const inv = paymentTaskPrompt.invoice;
              const conLai = inv ? inv.total - inv.amountPaid : 0;
              const chuaCoHoaDon = !inv;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {chuaCoHoaDon ? "Gửi hóa đơn cho khách luôn?" : "Ghi nhận đã thanh toán?"}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Mốc <b className="text-foreground">{paymentMilestoneLabel(paymentTaskPrompt)}</b>
                    {chuaCoHoaDon ? (
                      <>
                        {" "}
                        {/* KHÔNG hứa mã QR ở đây: thư chỉ đính QR khi freelancer đã khai
                          thông tin ngân hàng trong hồ sơ, mà phần lớn thì chưa. Hứa một thứ
                          khách không thấy trong thư là tự tạo ra câu hỏi "QR đâu?".  #Huynh */}
                        — SoloDesk sẽ tạo hóa đơn theo đúng số tiền của mốc này trong báo giá đã
                        chốt, rồi <b className="text-foreground">gửi email cho khách</b>.
                      </>
                    ) : (
                      <>
                        {" "}
                        — hóa đơn <b className="text-foreground">{inv?.invoiceNumber}</b> còn{" "}
                        <b className="text-foreground">{formatVND(conLai)}</b>. Xác nhận là khách đã
                        chuyển đủ số này.
                      </>
                    )}
                  </p>
                  <DialogFooter className="gap-2">
                    <button
                      type="button"
                      onClick={finishTogglingPaymentTask}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
                    >
                      Để sau
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const task = paymentTaskPrompt;
                        finishTogglingPaymentTask();
                        if (chuaCoHoaDon) createInvoiceDraftForReview(task);
                        else recordFullPayment(task);
                      }}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {chuaCoHoaDon ? "Tạo & gửi hóa đơn" : "Ghi nhận đã thanh toán"}
                    </button>
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
      {/* Xuất hóa đơn cho một khoản "thu khi xong" mà công việc chưa tick xong.
          HỎI chứ không CHẶN — freelancer làm xong hôm nay rồi xuất hóa đơn luôn, tick task
          sau, là chuyện rất thường; chặn cứng biến thao tác đúng thành lỗi.

          HỎI THEO CHIỀU XUÔI, không dọa. Bản trước mở đầu bằng "Công việc chưa xong — vẫn
          gửi hóa đơn?" và cảnh báo "khách sẽ nhận hóa đơn cho phần chưa bàn giao" — nghe như
          người dùng sắp làm điều gì đó mờ ám, trong khi thực tế họ vừa làm xong việc và đang
          đi thu tiền. Cái máy chưa biết là việc đã xong, chứ không phải người dùng đang sai.
          Nay hỏi đúng thứ cần biết ("xong chưa?"), và gửi xong thì tự tick luôn.  #Huynh */}
      <ConfirmDialog
        open={Boolean(earlyInvoiceTask)}
        onOpenChange={(open) => {
          if (!open) setEarlyInvoiceTask(null);
        }}
        title="Công việc đã xong — gửi hóa đơn?"
        description={
          earlyInvoiceTask
            ? `"${earlyInvoiceTask.title}" được thoả thuận thu khi hoàn thành, và mốc này chưa ` +
              "được tick xong. Gửi hóa đơn sẽ đánh dấu luôn là đã hoàn thành."
            : undefined
        }
        confirmLabel="Đã xong, gửi hóa đơn"
        cancelLabel="Để sau"
        onConfirm={() => {
          const task = earlyInvoiceTask;
          setEarlyInvoiceTask(null);
          if (task) createInvoiceDraftForReview(task);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteProposalId)}
        onOpenChange={(open) => {
          if (!open) setDeleteProposalId(null);
        }}
        title="Xoá bản nháp báo giá?"
        description="Bản nháp này sẽ bị xoá vĩnh viễn. (Báo giá đã gửi cho khách thì không xoá được.)"
        confirmLabel="Xoá bản nháp"
        cancelLabel="Giữ lại"
        isLoading={deleteProposalMutation.isPending}
        onConfirm={handleConfirmDeleteProposal}
      />
    </div>
  );
}

function StageBadge({ deal }: { deal: Deal }) {
  const stage = STAGE_BY_ID[deal.stage];

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
      <span className={cn("h-2 w-2 rounded-full", stage.dotClass)} />
      {stage.title}
    </div>
  );
}

function ClientInfoPanel({
  deal,
  client,
}: {
  deal: Deal;
  client?: { name?: string | null; email: string | null; phone: string | null; notes?: string | null };
}) {
  const updateClient = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [draft, setDraft] = useState({
    phone: "",
    email: "",
    notes: "",
  });
  const initials = deal.client
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "KH";
  const phone = client?.phone ?? deal.clientPhone;
  const email = client?.email ?? deal.clientEmail;

  const zaloUrl = zaloLink(phone);
  const mailUrl = gmailComposeLink({ to: email, subject: `Về dự án ${deal.projectType}` });
  const notes = client?.notes ?? "";
  const hasChanges =
    draft.phone !== (phone ?? "") ||
    draft.email !== (email ?? "") ||
    draft.notes !== notes;

  useEffect(() => {
    setDraft({
      phone: phone ?? "",
      email: email ?? "",
      notes,
    });
  }, [deal.clientId, phone, email, notes]);

  function cancelEdit() {
    setDraft({
      phone: phone ?? "",
      email: email ?? "",
      notes,
    });
    setEditing(false);
  }

  function saveClientInfo() {
    updateClient.mutate(
      {
        id: deal.clientId,
        payload: {
          name: client?.name ?? deal.client,
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          notes: draft.notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
          setConfirmSaveOpen(false);
        },
      }
    );
  }

  return (
    <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{deal.client}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{phone || "Chưa có Zalo/SĐT"}</p>
          {/* Bỏ cặp chip Zalo/Email ở đây: y hệt cặp nút to phía dưới thẻ. Một việc bày hai
              chỗ trong cùng một thẻ thì người dùng phải đoán hai cái đó khác nhau ra sao. */}
        </div>
      </div>

      <div className="my-5 border-t border-border" />

      <dl className="space-y-3 text-sm">
        <InfoRow label="Nguồn" value={formatDealSource(deal.source)} />
        <InfoRow label="Ngày tạo" value={formatDate(deal.createdAt)} />
        <InfoRow label="Kênh" value={deal.channel} />
        {editing ? (
          <>
            <EditableInfoRow
              label="Số điện thoại"
              value={draft.phone}
              placeholder="Nhập số điện thoại"
              onChange={(phone) => setDraft((current) => ({ ...current, phone }))}
            />
            <EditableInfoRow
              label="Email"
              value={draft.email}
              placeholder="Nhập email"
              onChange={(email) => setDraft((current) => ({ ...current, email }))}
            />
          </>
        ) : (
          <>
            <InfoRow label="Số điện thoại" value={phone || "Chưa có"} />
            <InfoRow label="Email" value={email || "Chưa có"} />
          </>
        )}
      </dl>

      <div className="my-5 border-t border-border" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ghi chú nội bộ</div>
        {editing ? (
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={4}
            placeholder="Nhập ghi chú khách hàng"
            className="mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          // KHÔNG rơi về `deal.notes` nữa. `clients.notes` là ghi chú RIÊNG về khách
          // ("khách này khó tính"), còn `deals.notes` là YÊU CẦU của khách — hai khái niệm
          // khác nhau, lưu hai bảng khác nhau. Rơi về nhau khiến bản mô tả dự án bị bày ra
          // dưới nhãn "Ghi chú nội bộ", vừa trùng lần thứ ba trên cùng màn hình, vừa làm
          // người dùng tưởng đã điền ghi chú khách rồi.  #Huynh
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {client?.notes || "Chưa có ghi chú khách hàng."}
          </p>
        )}
      </div>

      {/* Nối THẬT chứ không còn là nút trang trí. Trước đây cả bốn nút liên hệ trong thẻ
          này đều không có `onClick` — bấm không ra gì.

          Cả hai đường dẫn dựng bằng `src/lib/contact-links.ts`; xem chú thích ở đó để biết
          vì sao nút thư mở Gmail chứ không phải `mailto:`.  #Huynh */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {zaloUrl ? (
          <a
            href={zaloUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:opacity-95"
          >
            Zalo
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Khách chưa có số điện thoại"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground opacity-45"
          >
            Zalo
          </button>
        )}
        {mailUrl ? (
          /* Mở tab mới: giờ đây là trang web (Gmail) chứ không phải ứng dụng ngoài, để cùng
             tab là đá người dùng ra khỏi màn deal đang xem. */
          <a
            href={mailUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <Mail className="h-4 w-4" /> Email
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Khách chưa có email"
            className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold opacity-45"
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={updateClient.isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Hủy
            </button>
            <button
              type="button"
              onClick={() => setConfirmSaveOpen(true)}
              disabled={!hasChanges || updateClient.isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {updateClient.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Pencil className="h-4 w-4" /> Chỉnh sửa
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title="Cập nhật thông tin khách hàng?"
        description="Thông tin liên hệ và ghi chú của khách hàng sẽ được lưu lại."
        confirmLabel="Lưu thay đổi"
        cancelLabel="Xem lại"
        isLoading={updateClient.isPending}
        onConfirm={saveClientInfo}
      />
    </aside>
  );
}

/**
 * Vòng tròn điểm — bản thu nhỏ của `ScoreCard` trong panel đánh giá.
 *
 * Vẫn là SVG dựng tay chứ không kéo thư viện chart về cho một chỉ số. `currentColor` để
 * vòng tròn ăn theo màu chữ của mức, khỏi khai màu hai lần.
 */
function ScoreDial({ score, level }: { score: number; level: Deal["score"] }) {
  const pct = Math.max(0, Math.min(100, score));
  const RADIUS = 26;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className={cn("relative h-16 w-16 shrink-0", LEVEL_UI[level].scoreClass)}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-lg font-black leading-none">{score}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}

function EditableInfoRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

/**
 * Cột phải màn chi tiết deal — thuần trình bày, mọi thứ nhận qua props.
 *
 * `export` để kiểm riêng được luật "một việc tại một thời điểm" mà không phải dựng cả trang
 * (trang này kéo theo router, hàng chục hook và service).  #Huynh
 */
export function ActionsPanel({
  deal,
  onEvaluate,
  onProposal,
  onContract,
  onStartProject,
  onComplete,
  contractLoading,
  stageTransitionLoading,
  hasAcceptedProposal,
  hasContract,
  hasDraftContract,
  hasActiveContract,
}: {
  deal: Deal;
  onEvaluate: () => void;
  onProposal: () => void;
  onContract: () => void;
  onStartProject: () => void;
  onComplete: () => void;
  contractLoading: boolean;
  stageTransitionLoading: boolean;
  hasAcceptedProposal: boolean;
  hasContract: boolean;
  hasDraftContract: boolean;
  hasActiveContract: boolean;
}) {
  const stage = deal.stage;

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* CHƯA CHẤM THÌ KHÔNG HIỆN SỐ NÀO.
          Trước đây chỗ này là `{deal.aiQualificationScore ?? 50}` — deal chưa từng được
          chấm vẫn hiện "50", tức hệ thống TỰ BỊA một điểm đánh giá AI. Tệ hơn nữa: ngay
          dưới nó ghi "Chưa có đánh giá AI chi tiết cho deal này" — cái thẻ tự mâu thuẫn
          với chính nó.
          Cả sản phẩm này dựng trên việc "điểm AI phải kiểm chứng được"; bịa một con số
          mặc định là đạp đổ đúng thứ đó. Thà nói thẳng "chưa chấm".  #Huynh */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Đánh giá AI
          </div>
          {/* Nhãn HOT/WARM/COLD lấy từ `LEVEL_UI` — cùng bảng màu với thẻ Kanban và bảng
              chấm điểm, không tự khai lại lần nữa. */}
          {typeof deal.aiQualificationScore === "number" && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                LEVEL_UI[deal.score].badgeClass
              )}
            >
              {LEVEL_UI[deal.score].label}
            </span>
          )}
        </div>
        {typeof deal.aiQualificationScore === "number" ? (
          <>
            {/* Vòng tròn giống hệt panel đánh giá và hộp xem lại. Trước đây chỗ này tự vẽ
                kiểu chữ trơn riêng — là bản vẽ THỨ BA của cùng một con điểm, nên cùng một
                deal nhìn ba nơi lại thấy ba kiểu.  #Huynh */}
            <div className="mt-3 flex items-center gap-3">
              <ScoreDial score={deal.aiQualificationScore} level={deal.score} />
              <div className="min-w-0 text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">{deal.aiQualificationScore}</span> / 100 điểm
                </div>
                {deal.aiQualificationScore < 100 && (
                  <div className="mt-0.5 text-xs">
                    còn thiếu{" "}
                    <span className="font-semibold text-foreground">
                      {100 - deal.aiQualificationScore}
                    </span>{" "}
                    điểm
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {recommendationLabel(deal.aiQualificationRecommendation)}
            </p>
          </>
        ) : (
          <>
            <div className="mt-3 text-xl font-bold text-muted-foreground">Chưa chấm điểm</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bấm "Đánh giá Deal" để AI chấm điểm mức độ sẵn sàng báo giá.
            </p>
          </>
        )}
      </div>

      {stage === "new_lead" && (
        <button
          onClick={onEvaluate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" /> Đánh giá Deal
        </button>
      )}

      {stage === "qualified" && (
        <button
          onClick={onProposal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <FileText className="h-4 w-4" /> Tạo Báo Giá AI
        </button>
      )}

      {stage === "proposal_sent" && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">Đã gửi báo giá · chờ phản hồi khách</p>
          <p className="mt-1 text-xs text-muted-foreground">Vào tab <span className="font-semibold text-foreground">Tài liệu</span> để ghi nhận phản hồi.</p>
        </div>
      )}

      {/* MỘT việc tại một thời điểm, không bày cả hai.
        Trước đây "Tạo Hợp Đồng AI" và "Bắt đầu triển khai" hiện cùng lúc, cái sau bị khoá cho
        tới khi ghi nhận đã ký. Nhưng hai nút xếp chồng thì nút nào cũng trông như việc phải
        làm, và cái đang khoá lại là cái sáng màu hơn về mặt bố cục — người dùng bấm vào rồi
        tự hỏi vì sao không ăn. Ký xong thì việc tạo hợp đồng cũng hết nghĩa (backend chỉ cho
        sinh nội dung khi hợp đồng còn ở nháp), nên THAY hẳn là đúng.  #Huynh */}
      {stage === "in_negotiation" && (
        <>
          {hasActiveContract ? (
            <button
              onClick={onStartProject}
              disabled={stageTransitionLoading}
              title="Bắt đầu triển khai project"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stageTransitionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {stageTransitionLoading ? "Đang xử lý..." : "Bắt đầu triển khai"}
            </button>
          ) : (
            <>
              <button
                onClick={onContract}
                disabled={contractLoading || !hasAcceptedProposal}
                title={!hasAcceptedProposal ? "Cần báo giá đã được chấp nhận trước" : "Tạo hợp đồng bằng AI"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {contractLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {contractLoading
                  ? "Đang tạo hợp đồng..."
                  : hasDraftContract
                    ? "Tạo Lại Hợp Đồng AI"
                    : "Tạo Hợp Đồng AI"}
              </button>
              {hasDraftContract && (
                <p className="-mt-1 text-center text-xs text-muted-foreground">
                  Sẽ viết lại nội dung bản nháp hiện có, không tạo hợp đồng mới.
                </p>
              )}
            </>
          )}
          {!hasContract && (
            <p className="text-center text-xs text-muted-foreground">Cần tạo hợp đồng và gửi cho khách ký trước khi mở project triển khai.</p>
          )}
          {hasContract && !hasActiveContract && (
            <p className="text-center text-xs text-muted-foreground">Hợp đồng đang chờ ký. Vào tab Tài liệu, bấm "Ghi nhận: khách đã ký" sau khi hai bên đã ký ngoài hệ thống.</p>
          )}
        </>
      )}

      {stage === "active" && (
        <button
          onClick={onComplete}
          disabled={stageTransitionLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stageTransitionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {stageTransitionLoading ? "Đang xử lý..." : "Hoàn thành dự án"}
        </button>
      )}

      {(stage === "completed_and_billed" || stage === "lost") && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {stage === "completed_and_billed" ? "Dự án đã hoàn thành và thanh toán." : "Deal đã đóng (không thành công)."}
          </p>
        </div>
      )}

    </aside>
  );
}

function ProjectLockedPanel({ deal, hasAcceptedProposal }: { deal: Deal; hasAcceptedProposal: boolean }) {
  const steps = [
    {
      label: "Deal",
      title: "Yêu cầu / cơ hội",
      done: true,
      description: "Đang lưu thông tin khách, nhu cầu, ngân sách và trạng thái tư vấn.",
    },
    {
      label: "Báo giá",
      title: "Gửi proposal",
      done: ["proposal_sent", "in_negotiation", "active", "completed_and_billed"].includes(deal.stage),
      description: "Tạo báo giá để khách xác nhận phạm vi và chi phí.",
    },
    {
      label: "Hợp đồng",
      title: "Khách đồng ý",
      done: hasAcceptedProposal || deal.stage === "active" || deal.stage === "completed_and_billed",
      description: "Khi báo giá/hợp đồng được chốt, deal mới đủ điều kiện triển khai.",
    },
    {
      label: "Project",
      title: "Mở dự án triển khai",
      done: deal.stage === "active" || deal.stage === "completed_and_billed",
      description: "Hệ thống sẽ tạo hồ sơ công việc khi chuyển sang Đang triển khai.",
    },
    {
      label: "Task",
      title: "Quản lý công việc",
      done: false,
      description: "Task sẽ nằm dưới project, không tạo trực tiếp dưới deal ở flow chính.",
    },
  ];

  const nextHint =
    deal.stage === "new_lead"
      ? "Hãy đánh giá deal và chuyển sang Đã đánh giá nếu phù hợp."
      : deal.stage === "qualified"
      ? "Hãy tạo/gửi báo giá cho khách trước khi mở triển khai."
      : deal.stage === "proposal_sent" || deal.stage === "in_negotiation"
      ? "Cần báo giá được khách chấp nhận rồi mới chuyển sang Đang triển khai."
      : "Project chưa sẵn sàng để tạo công việc.";

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold uppercase tracking-wide">Công việc chưa mở</div>
            <p className="mt-1 text-sm text-muted-foreground">
              SoloDesk tách rõ Deal và Project: deal là cơ hội bán hàng, project là phần triển khai sau khi đã chốt.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step) => (
            <div
              key={step.label}
              className={cn(
                "rounded-lg border p-3",
                step.done ? "border-primary/25 bg-primary/5" : "border-border bg-muted/25"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : step.label === "Project" ? (
                  <Briefcase className="h-3.5 w-3.5" />
                ) : step.label === "Task" ? (
                  <ClipboardCheck className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {step.label}
              </div>
              <div className="mt-2 text-sm font-semibold">{step.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="font-semibold text-primary">Bước tiếp theo</div>
          <p className="mt-1 text-muted-foreground">{nextHint}</p>
        </div>
      </div>
    </section>
  );
}


export function InvoiceComposerModal({
  mode,
  deal,
  suggestedInvoiceIndex,
  existingInvoices,
  client,
  invoice,
  isLoading,
  onClose,
  onCreate,
  onUpdate,
  onSaveAndSend,
  onDelete,
}: {
  mode: "create" | "view" | "edit";
  deal: Deal;
  suggestedInvoiceIndex: number;
  existingInvoices: InvoiceResponse[];
  client: InvoiceComposerClient;
  invoice: InvoiceResponse | null;
  isLoading: boolean;
  onClose: () => void;
  onCreate: (payload: InvoicePayload) => void;
  onUpdate: (invoiceId: string, payload: InvoiceUpdatePayload) => void;
  /** Lưu nội dung rồi gửi luôn cho khách. Bỏ trống thì cửa sổ chỉ có nút lưu. */
  onSaveAndSend?: (invoiceId: string, payload: InvoiceUpdatePayload) => void;
  onDelete: (invoice: InvoiceResponse) => void;
}) {
  const [tone, setTone] = useState<InvoiceTone>("formal");
  // Hóa đơn ĐANG MỞ thì lấy số thứ tự của chính nó; chỉ khi tạo mới mới dùng số kế tiếp.
  const draftOrdinal = invoice ? invoiceOrdinal(existingInvoices, invoice) : suggestedInvoiceIndex;
  const [draft, setDraft] = useState<InvoiceDraftState>(() =>
    buildInvoiceDraft(deal, client, "formal", draftOrdinal, invoice)
  );
  const [dueDateText, setDueDateText] = useState(() => formatDateForVietnameseInput(draft.dueDate));
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const subtotal = parseMoneyInput(draft.amount);
  const taxRate = Math.max(0, parseMoneyInput(draft.taxRate) / 100);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;
  const isDraftInvoice = !invoice || invoice.status === "draft";
  const canEdit = mode !== "view" && isDraftInvoice;
  const title =
    mode === "create"
      ? "Tạo hóa đơn nháp"
      : invoice?.status === "draft"
        ? `Sửa ${draft.title}`
        : draft.title;

  useEffect(() => {
    const nextDraft = buildInvoiceDraft(deal, client, tone, draftOrdinal, invoice);
    setDraft(nextDraft);
    setDueDateText(formatDateForVietnameseInput(nextDraft.dueDate));
  }, [client.email, client.name, client.phone, deal.id, deal.projectType, deal.value, invoice, draftOrdinal]);

  function updateDraft(field: keyof InvoiceDraftState, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function changeTone(nextTone: InvoiceTone) {
    setTone(nextTone);
    if (!canEdit) return;
    const amount = parseMoneyInput(draft.amount) || deal.value;
    setDraft((current) => ({
      ...current,
      notes: buildDefaultInvoiceNotes(deal, client, amount, nextTone),
    }));
  }

  function hasDuplicateInvoiceTitle(): boolean {
    const currentTitle = draft.title.trim().toLowerCase();
    if (!currentTitle) return false;
    return existingInvoices.some((item, index) => {
      if (invoice && item.id === invoice.id) return false;
      // Vị trí THẬT, không phải 0: để index cứng thì mọi hóa đơn chưa đặt tên đều đọc ra
      // "Thanh toán đợt 1", và đặt tên đúng số thứ tự của mình lại bị báo trùng.  #Huynh
      return getInvoiceDisplayTitle(item, index).trim().toLowerCase() === currentTitle;
    });
  }

  function validateInvoiceDraft(): boolean {
    if (!draft.title.trim()) {
      toast.error("Vui lòng nhập tên hóa đơn.");
      return false;
    }
    if (hasDuplicateInvoiceTitle()) {
      toast.error("Tên hóa đơn đã tồn tại trong dự án này. Bạn hãy đổi tên khác nhé.");
      return false;
    }
    const parsedDueDate = parseVietnameseDateInput(dueDateText);
    if (!parsedDueDate) {
      toast.error("Hạn thanh toán cần nhập theo dạng ngày/tháng/năm.");
      return false;
    }
    if (isPastDate(parsedDueDate)) {
      toast.error("Hạn thanh toán không được nằm trong quá khứ.");
      return false;
    }
    setDraft((current) => ({ ...current, dueDate: parsedDueDate }));
    setDueDateText(formatDate(parsedDueDate));
    if (subtotal <= 0) {
      toast.error("Tổng tiền hóa đơn phải lớn hơn 0đ.");
      return false;
    }
    return true;
  }

  function buildPayload(): InvoicePayload {
    const parsedDueDate = parseVietnameseDateInput(dueDateText) ?? draft.dueDate;
    return {
      client_id: deal.clientId,
      deal_id: deal.id,
      issue_date: toApiDateValue(new Date()),
      due_date: parsedDueDate,
      subtotal,
      tax_rate: taxRate,
      currency: "VND",
      notes: composeInvoiceNotes(draft.title, draft.notes),
      line_items: [
        {
          description: draft.description.trim() || deal.projectType,
          quantity: 1,
          unit_price: subtotal,
          sort_order: 0,
        },
      ],
    };
  }

  function buildUpdatePayload(): InvoiceUpdatePayload {
    const payload = buildPayload();
    return {
      due_date: payload.due_date,
      subtotal: payload.subtotal,
      tax_rate: payload.tax_rate,
      notes: payload.notes,
      line_items: payload.line_items,
    };
  }

  function handleCreate() {
    if (!validateInvoiceDraft()) return;
    setCreateConfirmOpen(true);
  }

  function handleUpdate() {
    if (!invoice) return;
    if (!validateInvoiceDraft()) return;
    onUpdate(invoice.id, buildUpdatePayload());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="truncate text-lg font-bold">{title}</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {canEdit ? "Soạn nội dung trước khi lưu hóa đơn vào hệ thống." : "Hóa đơn đã gửi nên chỉ xem và ghi nhận thanh toán."}
            </p>
          </div>
          <WindowControlButton icon={X} label="Đóng" onClick={onClose} />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-xl border border-border bg-background p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hóa đơn dịch vụ</div>
              <h3 className="mt-2 text-2xl font-bold">{deal.projectType}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Khách hàng: <span className="font-semibold text-foreground">{client.name}</span>
                {client.phone ? ` · ${client.phone}` : ""}
                {client.email ? ` · ${client.email}` : ""}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                Tên hóa đơn / đợt thanh toán
                <input
                  value={draft.title}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Ví dụ: Đợt 1 - Tạm ứng 50%"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
                <span className="block text-xs font-normal text-muted-foreground">
                  Dùng tên dễ hiểu cho Freelancer; mã hóa đơn backend vẫn được giữ riêng để đối soát.
                </span>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Hạng mục thanh toán
                <input
                  value={draft.description}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Hạn thanh toán
                <input
                  value={dueDateText}
                  disabled={!canEdit}
                  placeholder="dd/mm/yyyy"
                  onChange={(event) => {
                    const value = event.target.value;
                    setDueDateText(value);
                    const parsed = parseVietnameseDateInput(value);
                    if (parsed) updateDraft("dueDate", parsed);
                  }}
                  onBlur={() => {
                    const parsed = parseVietnameseDateInput(dueDateText);
                    if (parsed) setDueDateText(formatDate(parsed));
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Số tiền trước thuế
                <input
                  value={draft.amount}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft("amount", event.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Thuế/VAT nếu có (%)
                <input
                  value={draft.taxRate}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft("taxRate", event.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <div>
                <div className="text-sm font-semibold">Giọng văn hóa đơn</div>
                <p className="text-xs text-muted-foreground">Dùng để soạn nhanh nội dung gửi khách trong phần ghi chú.</p>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-background p-1">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeTone("formal")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    tone === "formal" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  Trang trọng
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => changeTone("friendly")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    tone === "friendly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  Thân mật
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Tóm tắt</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-semibold">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Thuế</span>
                  <span className="font-semibold">{formatVND(taxAmount)}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between gap-3 text-base">
                    <span className="font-semibold">Tổng cần thanh toán</span>
                    <span className="font-bold text-primary">{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Khối "Trạng thái" đã BỎ: nó in thẳng giá trị thô của backend (`draft`, `sent`,
                `partially_paid`) ra màn hình tiếng Việt, và lặp lại con số vừa nằm ngay trên
                trong bảng tóm tắt. Trạng thái thật thì hàng ở tab Tài liệu và khối hóa đơn
                dưới mốc thu tiền đều đã hiện bằng nhãn tiếng Việt có màu.  #Huynh */}
          </section>

          <section className="flex min-h-[520px] flex-col rounded-xl border border-border bg-background p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Nội dung gửi khách</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {canEdit
                    ? "Đây là nội dung Freelancer có thể gửi kèm hóa đơn cho khách."
                    : "Đây là nội dung ĐÃ gửi kèm hóa đơn — đúng thứ khách nhận được."}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {tone === "formal" ? "Trang trọng" : "Thân mật"}
              </span>
            </div>
            {!canEdit && !draft.notes.trim() ? (
              /* Hóa đơn sinh từ mốc thu tiền đi thẳng, không qua bước soạn thư. Nói thẳng ra
                 chỗ này, thay vì để một ô trống mà người đọc phải tự đoán là mất nội dung hay
                 vốn không có.  #Huynh */
              <div className="flex min-h-[440px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Hóa đơn này gửi đi không kèm nội dung riêng.
                </p>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  Khách vẫn nhận đủ thư hóa đơn (hạng mục, số tiền, hạn thanh toán). Muốn kèm
                  lời nhắn riêng thì tạo hóa đơn nháp từ tab Tài liệu rồi soạn trước khi gửi.
                </p>
              </div>
            ) : (
              <textarea
                value={draft.notes}
                disabled={!canEdit}
                onChange={(event) => updateDraft("notes", event.target.value)}
                className="min-h-[440px] flex-1 resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm leading-7 outline-none focus:border-primary disabled:opacity-70"
              />
            )}
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-6 py-4">
          <div className="text-xs text-muted-foreground">
            {invoice?.status && invoice.status !== "draft" ? "Hóa đơn đã gửi nên không thể chỉnh sửa nội dung." : "Bản nháp có thể chỉnh sửa hoặc xóa trước khi gửi."}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {invoice?.status === "draft" && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Xóa nháp
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
              Đóng
            </button>
            {mode === "create" && (
              <button
                type="button"
                disabled={isLoading || subtotal <= 0}
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Tạo hóa đơn
              </button>
            )}
            {mode === "edit" && invoice?.status === "draft" && (
              <button
                type="button"
                disabled={isLoading || subtotal <= 0}
                onClick={handleUpdate}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Lưu nháp
              </button>
            )}
            {/* Nút CHÍNH của cửa sổ này: xem lại xong thì gửi. Trước đây bấm "Tạo & gửi hóa
                đơn" ở bảng việc là thư bay đi ngay, freelancer không được đọc một chữ nào
                trong thứ mang tên mình gửi cho khách.  #Huynh */}
            {mode === "edit" && invoice?.status === "draft" && onSaveAndSend && (
              <button
                type="button"
                disabled={isLoading || subtotal <= 0}
                onClick={() => {
                  if (!validateInvoiceDraft()) return;
                  onSaveAndSend(invoice.id, buildPayload());
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> Lưu & gửi cho khách
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={createConfirmOpen}
        onOpenChange={setCreateConfirmOpen}
        title="Tạo hóa đơn này?"
        description={`Hệ thống sẽ tạo hóa đơn nháp trị giá ${formatVND(total)} cho khách "${client.name}". Bạn vẫn có thể chỉnh sửa trước khi gửi.`}
        confirmLabel="Tạo hóa đơn"
        cancelLabel="Kiểm tra lại"
        isLoading={isLoading}
        onConfirm={() => {
          onCreate(buildPayload());
          setCreateConfirmOpen(false);
        }}
      />
      {invoice && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Xóa bản nháp này?"
          description={`Bạn có chắc chắn muốn xóa bản nháp ${invoice.invoice_number}? Bản nháp chưa gửi cho khách nên xóa đi không ảnh hưởng gì tới hồ sơ thu tiền.`}
          confirmLabel="Xóa"
          cancelLabel="Giữ lại"
          tone="danger"
          isLoading={isLoading}
          onConfirm={() => {
            onDelete(invoice);
            setDeleteConfirmOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Nút tải PDF cho báo giá / hợp đồng. Gọi endpoint render PDF ở backend, nhận blob rồi
 * kích hoạt tải xuống — để freelancer gửi thẳng cho khách. Tự quản trạng thái đang tải.  #Huynh
 */
function DownloadPdfButton({
  fetchPdf,
  filename,
}: {
  fetchPdf: () => Promise<Blob>;
  filename: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Tải PDF thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Tải PDF
    </button>
  );
}

/**
 * Màu badge trạng thái cho báo giá / hợp đồng / hoá đơn.
 *
 * Trước đây CẢ BA đều dùng chung một sắc xám `bg-secondary`, nên "Khách chấp nhận" trông y
 * hệt "Khách từ chối" — hai kết cục trái ngược mà phải đọc chữ mới phân biệt được. Trên màn
 * hình chi tiết deal, người dùng liếc chứ không đọc.
 *
 * Chia theo Ý NGHĨA chứ không theo từng trạng thái, để ba loại tài liệu nói cùng một ngôn
 * ngữ màu: xong xuôi thì xanh lá, hỏng thì đỏ, đang chờ ai đó thì xanh dương, hết hạn/dở
 * dang thì hổ phách, còn chưa có gì xảy ra thì xám.  #Huynh
 */
type StatusBadge = { label: string; cls: string };

/** Chưa có gì xảy ra (bản nháp, đã huỷ, đã thay thế). */
const NEUTRAL_BADGE = "bg-secondary text-muted-foreground";
/** Đang chờ phía bên kia (đã gửi, chờ ký). */
const WAITING_BADGE = "bg-primary/10 text-primary";
/** Kết cục tốt (khách chấp nhận, đã thanh toán, hợp đồng hiệu lực). */
const GOOD_BADGE = "bg-success/10 text-success";
/** Kết cục xấu (khách từ chối, quá hạn, chấm dứt). */
const BAD_BADGE = "bg-destructive/10 text-destructive";
/** Hết hạn hoặc dở dang — chưa hỏng hẳn nhưng cần để mắt.
 *
 * Bốn màu kia là design token nên tự hợp với nền; riêng amber là màu Tailwind trần, phải
 * kèm `dark:` cho đủ tương phản — bám theo mẫu sẵn có ở `DealDetailModal.tsx`.  #Huynh */
const STALE_BADGE = "bg-amber-500/10 text-amber-600 dark:text-amber-400";

export function DocumentsTab({
  attachments,
  onViewAttachment,
  proposals,
  contracts,
  invoices,
  onAddAttachment,
  onDeleteAttachment,
  onViewInvoice,
  onVoidInvoice,
  onSendInvoice,
  onRecordInvoicePayment,
  onProposalDecision,
  proposalDecisionLoading,
  onViewProposal,
  onEditProposal,
  onDeleteProposal,
  onSendContract,
  onSignContract,
  onViewContract,
  contractActionLoading,
  pendingInvoiceId,
  savedQualifications: savedQualificationItems,
  onViewQualification,
}: {
  savedQualifications: DealQualification[];
  onViewQualification: (row: DealQualification) => void;
  attachments: DealAttachment[];
  proposals: Array<{ id: string; status: string; version_number: number; created_at: string; content?: ProposalContentDTO }>;
  contracts: Array<{
    id: string;
    status: string;
    version_number: number;
    created_at: string;
    share_token?: string | null;
    signed_by_freelancer_at?: string | null;
  }>;
  invoices: InvoiceResponse[];
  onAddAttachment: (file: File) => void;
  onDeleteAttachment: (attachment: DealAttachment) => void;
  onViewAttachment: (attachment: DealAttachment) => void;
  onViewInvoice: (invoice: InvoiceResponse) => void;
  onVoidInvoice: (invoice: InvoiceResponse) => void;
  onSendInvoice: (invoiceId: string) => void;
  onRecordInvoicePayment: (invoice: InvoiceResponse) => void;
  onProposalDecision: (proposalId: string, status: ProposalDecisionStatus) => void;
  proposalDecisionLoading: boolean;
  onViewProposal: (proposalId: string) => void;
  onEditProposal: (proposalId: string) => void;
  onDeleteProposal: (proposalId: string) => void;
  onSendContract: (contractId: string) => void;
  onSignContract: (contract: { id: string; share_token?: string | null; signed_by_freelancer_at?: string | null }) => void;
  onViewContract: (contractId: string) => void;
  contractActionLoading: boolean;
  /** Hoá đơn đang được xử lý — chỉ hàng của nó bị khoá, các hàng khác vẫn bấm được. */
  pendingInvoiceId: string | null;
}) {
  const proposalStatusLabel: Record<string, StatusBadge> = {
    draft: { label: "Bản nháp", cls: NEUTRAL_BADGE },
    sent: { label: "Đã gửi khách", cls: WAITING_BADGE },
    accepted: { label: "Khách chấp nhận", cls: GOOD_BADGE },
    rejected: { label: "Khách từ chối", cls: BAD_BADGE },
    expired: { label: "Hết hiệu lực", cls: STALE_BADGE },
    superseded: { label: "Đã thay thế", cls: NEUTRAL_BADGE },
  };

  const contractStatusLabel: Record<string, StatusBadge> = {
    draft: { label: "Bản nháp", cls: NEUTRAL_BADGE },
    pending_signatures: { label: "Chờ ký", cls: WAITING_BADGE },
    active: { label: "Đang hiệu lực", cls: GOOD_BADGE },
    completed: { label: "Hoàn thành", cls: GOOD_BADGE },
    terminated: { label: "Đã chấm dứt", cls: BAD_BADGE },
    expired: { label: "Hết hiệu lực", cls: STALE_BADGE },
  };

  const invoiceStatusLabel: Record<string, StatusBadge> = {
    draft: { label: "Bản nháp", cls: NEUTRAL_BADGE },
    sent: { label: "Đã gửi", cls: WAITING_BADGE },
    partially_paid: { label: "Thanh toán một phần", cls: STALE_BADGE },
    paid: { label: "Đã thanh toán", cls: GOOD_BADGE },
    overdue: { label: "Quá hạn", cls: BAD_BADGE },
    void: { label: "Đã hủy", cls: NEUTRAL_BADGE },
    cancelled: { label: "Đã hủy", cls: NEUTRAL_BADGE },
  };

  // Bản báo giá ĐANG DÙNG. Backend trả về mới-nhất-trước, nhưng "mới nhất" KHÔNG phải
  // "đang dùng": gửi cho khách xong rồi bấm "Tạo lại" là đẻ ra một bản nháp mới hơn, trong
  // khi thứ khách đang CẦM vẫn là bản đã gửi.  #Huynh
  const current =
    proposals.find((p) => p.status === "accepted") ??
    proposals.find((p) => p.status === "sent") ??
    proposals[0];
  const currentProposals = current ? [current] : [];

  return (
    <>
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Paperclip className="h-4 w-4" /> Tài liệu giao dịch
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lưu ảnh/PDF chứng từ, biên nhận hoặc ghi chú thanh toán để dễ đối soát sau này.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> Thêm file
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(event) => {
                // Upload THẲNG, không qua bước điền tiêu đề/ghi chú: backend chỉ lưu tên
                // file thật, hai trường kia trước đây chỉ nằm trong localStorage.  #Huynh
                const file = event.target.files?.[0];
                if (file) onAddAttachment(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {invoices.map((invoice, index) => {
        const total = Number(invoice.total ?? 0);
        const paid = Number(invoice.amount_paid ?? 0);
        const remaining = Math.max(total - paid, 0);
        // Chỉ khoá hàng đang có việc chạy. Các hàng khác vẫn bấm được — chúng độc lập nhau.
        const rowBusy = pendingInvoiceId === invoice.id;
        const canSendInvoice = invoice.status === "draft";
        const canRecordPayment = remaining > 0 && !["draft", "void", "cancelled"].includes(invoice.status);
        const canVoidInvoice = !["draft", "paid", "void", "cancelled"].includes(invoice.status) && paid <= 0;
        const displayTitle = getInvoiceDisplayTitle(invoice, index);

        return (
          <div key={`invoice-${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{displayTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {/* MÃ HÓA ĐƠN đứng đầu dòng: "Thanh toán đợt 1" là cái tên dễ đọc, nhưng thứ
                    tra cứu được — trong hộp thư đã gửi, trong sổ sách, khi khách hỏi lại — là
                    mã này. Không hiện thì freelancer phải mở từng hóa đơn ra dò.  #Huynh */}
                <span className="font-mono">{invoice.invoice_number}</span> · Hạn thanh toán{" "}
                {formatDate(invoice.due_date)} · Tổng {formatVND(total)}
                {/* CHỈ nói "còn bao nhiêu" khi thu dở dang. Thu đủ rồi mà vẫn in "Đã thu X"
                    thì cùng một tin nhắc lại ba lần trên một hàng (nhãn + dòng này + số tổng
                    trùng nhau), còn chưa thu đồng nào thì "Đã thu 0 đ" chẳng thêm gì so với
                    nhãn "Đã gửi" ngay bên cạnh.  #Huynh */}
                {paid > 0 && remaining > 0 && <> · còn {formatVND(remaining)}</>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* MỘT nhãn trạng thái, không phải hai. Trước đây hóa đơn đã thu đủ đeo cùng
                  lúc "Đã thanh toán" và "Đã thanh toán đủ" — hai nhãn xanh cạnh nhau nói y hệt
                  một điều, và người đọc phải dừng lại tự hỏi hai cái đó khác nhau chỗ nào.
                  Dấu tích gộp thẳng vào nhãn sẵn có.  #Huynh */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold",
                  invoiceStatusLabel[invoice.status]?.cls ?? NEUTRAL_BADGE
                )}
              >
                {invoice.status === "paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {invoiceStatusLabel[invoice.status]?.label ?? invoice.status}
              </span>
              <button
                type="button"
                onClick={() => onViewInvoice(invoice)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                {/* Icon đi theo nhãn: nháp thì đây là nút SỬA, còn lại là nút XEM. Trước đây
                    nhãn đổi mà icon đứng yên nên hai hành động khác hẳn nhau trông như một. */}
                {invoice.status === "draft" ? (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Xem
                  </>
                )}
              </button>
              {canSendInvoice && (
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onSendInvoice(invoice.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Gửi hóa đơn
                </button>
              )}
              {canRecordPayment && (
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onRecordInvoicePayment(invoice)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ghi nhận thanh toán
                </button>
              )}
              {canVoidInvoice && (
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onVoidInvoice(invoice)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Hủy hóa đơn
                </button>
              )}
            </div>
          </div>
        );
      })}

      {attachments.map((item) => (
        <div key={`attachment-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{item.filename}</span>
              {/* PDF scan là ẢNH — không có chữ để bóc. Phải nói rõ, đừng để người dùng
                  upload xong tưởng AI đã đọc rồi ngồi đợi điểm cải thiện. */}
              {item.ai_readable ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" /> AI đọc được
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  AI không đọc được
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {formatFileSize(item.size_bytes)} · {formatDate(item.created_at)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Xem NGAY trong app. .docx/.xlsx thì trình duyệt không render được nên chỉ
                còn đường tải về.  #Huynh */}
            {isViewableInApp(item.content_type) && (
              <button
                type="button"
                onClick={() => onViewAttachment(item)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                <Eye className="h-3.5 w-3.5" /> Xem
              </button>
            )}
            {/* Nhãn theo ĐÚNG loại file, để hàng này đọc giống các hàng báo giá/hợp đồng bên
                dưới ("Xem" + "Tải PDF") mà không nói sai. Ô đính kèm nhận cả .png/.docx/.xlsx
                — gọi tất cả là "Tải PDF" thì khách gửi ảnh chụp màn hình sẽ thấy một cái nút
                hứa sai.  #Huynh */}
            <button
              type="button"
              onClick={() => downloadDealAttachment(item.id, item.filename)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <FileText className="h-3.5 w-3.5" />
              {item.content_type === "application/pdf" ? "Tải PDF" : "Tải về"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteAttachment(item)}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Xoá file"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Bản đánh giá KHÔNG liệt kê ở đây nữa — tab "Lịch sử" đã có, kèm nút Xem. Hai chỗ
          kể cùng một chuyện là bắt người dùng đọc hai lần rồi tự hỏi có khác gì nhau không.
          "Tài liệu" để dành cho thứ trao đổi với khách: file, báo giá, hợp đồng, hoá đơn.
          #Huynh */}

      {/* CHỈ hiện bản báo giá ĐANG DÙNG. Các bản trước đã có ở tab "Lịch sử" — liệt kê cả
          ở đây là kể cùng một chuyện hai chỗ, và tab này phình ra sau vài lần "Tạo lại".
          "Tài liệu" để dành cho thứ ĐANG trao đổi với khách.
          "Đang dùng" = đã chấp nhận > đã gửi > bản nháp mới nhất. KHÔNG phải "bản mới
          nhất": gửi cho khách xong mà bấm "Tạo lại" thì thứ khách đang CẦM vẫn là bản đã
          gửi, không phải bản nháp vừa đẻ ra.  #Huynh */}
      {currentProposals.map((item) => (
        <div key={`proposal-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Báo giá lần {item.version_number}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {item.content?.title || "Báo giá cho yêu cầu hiện tại"} · {formatDate(item.created_at)}
            </div>
            {/* Mốc thanh toán — khi chốt báo giá, mỗi mốc thành 1 task "Thu tiền:" ở tab
                Công việc để freelancer theo dõi thu tiền theo đợt.  #Huynh */}
            {item.content?.payment_milestones && item.content.payment_milestones.length > 0 && (
              <div className="mt-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mốc thanh toán
                </div>
                <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                  {item.content.payment_milestones.map((milestone, index) => (
                    <li key={`${item.id}-milestone-${index}`} className="flex gap-1.5">
                      <span className="text-primary">•</span>
                      <span>
                        <span className="font-medium text-foreground">{milestone.label}</span>
                        {milestone.percent != null
                          ? ` — ${milestone.percent}%`
                          : milestone.amount
                            ? ` — ${milestone.amount}`
                            : ""}
                        {milestone.due ? ` · ${milestone.due}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-1 text-xs font-semibold",
                proposalStatusLabel[item.status]?.cls ?? NEUTRAL_BADGE
              )}
            >
              {proposalStatusLabel[item.status]?.label ?? item.status}
            </span>
            {/* BẢN NHÁP KHÔNG CÓ NÚT "XEM NỘI DUNG" RIÊNG.
                Trước đây draft có hai cửa cho một việc: "Xem nội dung" mở bản CHỈ ĐỌC, "Soạn
                & gửi" mở modal sửa được. Bấm nhầm cửa thứ nhất là ngồi nhìn tờ báo giá mà
                không sửa được chữ nào — trong khi modal soạn thảo hiện ĐÚNG tờ đó (cùng
                `getProposalPreview` do server dựng), lại còn sửa được giá/mốc và gửi.  #Huynh */}
            {item.status !== "draft" && (
              <button
                type="button"
                onClick={() => onViewProposal(item.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                <Eye className="h-3.5 w-3.5" /> Xem
              </button>
            )}
            <DownloadPdfButton
              fetchPdf={() => downloadProposalPdf(item.id)}
              filename={`bao-gia-lan-${item.version_number}.pdf`}
            />
            {item.status === "draft" && (
              <>
                {/* Một cửa duy nhất cho bản nháp: xem, sửa giá/mốc/nội dung, rồi gửi — tất cả
                    trong modal soạn thảo (backend chặn gửi khi chưa chốt giá và khi tổng mốc
                    thanh toán ≠ 100%, nên bước gửi buộc phải qua đó).  #Huynh */}
                <button
                  type="button"
                  onClick={() => onEditProposal(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Pencil className="h-3.5 w-3.5" /> Mở &amp; chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProposal(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá
                </button>
              </>
            )}
            {item.status === "sent" && (
              <>
                <button
                  type="button"
                  disabled={proposalDecisionLoading}
                  onClick={() => onProposalDecision(item.id, "accepted")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Khách chấp nhận
                </button>
                <button
                  type="button"
                  disabled={proposalDecisionLoading}
                  onClick={() => onProposalDecision(item.id, "rejected")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Từ chối
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {contracts.map((item) => (
        <div key={`contract-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Hợp đồng lần {item.version_number}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.created_at)}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-1 text-xs font-semibold",
                contractStatusLabel[item.status]?.cls ?? NEUTRAL_BADGE
              )}
            >
              {contractStatusLabel[item.status]?.label ?? item.status}
            </span>
            <button
              type="button"
              onClick={() => onViewContract(item.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <Eye className="h-3.5 w-3.5" /> Xem
            </button>
            <DownloadPdfButton
              fetchPdf={() => downloadContractPdf(item.id)}
              filename={`hop-dong-lan-${item.version_number}.pdf`}
            />
            {item.status === "draft" && (
              <button
                type="button"
                disabled={contractActionLoading}
                onClick={() => onSendContract(item.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Gửi cho khách ký
              </button>
            )}
            {item.status === "pending_signatures" && (
              <button
                type="button"
                disabled={contractActionLoading}
                onClick={() => onSignContract(item)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Ghi nhận: khách đã ký
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Bản đánh giá ĐÃ CHỐT — chỉ những bản freelancer bấm "Lưu & chuyển sang Đã đánh
          giá", lọc bằng `saved_at`. Mọi lần chấm (kể cả chấm thử rồi bỏ) vẫn nằm nguyên ở
          tab Lịch sử; nếu kể hết ở đây thì chấm nghịch mấy lần là đẻ ra mấy "tài liệu", và
          tài liệu mất nghĩa.  #Huynh */}
      {savedQualificationItems.map((item) => (
        <div
          key={`qualification-${item.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold">Kết quả đánh giá AI — {item.score}/100</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Chốt ngày {formatDate(item.saved_at as string)} · chấm lúc{" "}
              {formatDate(item.generated_at)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Nhãn lấy từ `qualificationUi` chứ không tự khai tại chỗ.
                Trước đây đây là bộ nhãn THỨ BA của cùng một thang điểm ("Tiềm năng cao /
                Trung bình / Cần hỏi thêm"), nên một deal hiện HOT ở Kanban mà "Tiềm năng
                cao" ở tab này — người dùng không biết có phải cùng một thứ không.  #Huynh */}
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-xs font-semibold",
                LEVEL_UI[item.level].badgeClass
              )}
            >
              {LEVEL_UI[item.level].label}
            </span>
            <button
              type="button"
              onClick={() => onViewQualification(item)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <Eye className="h-3.5 w-3.5" /> Xem
            </button>
          </div>
        </div>
      ))}

      {attachments.length +
        proposals.length +
        contracts.length +
        invoices.length +
        savedQualificationItems.length ===
        0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có tài liệu nào cho deal này.
        </div>
      )}
    </div>
    </>
  );
}

function formatDate(value: string): string {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateForVietnameseInput(value: string): string {
  if (!value) return "";
  const parsed = parseVietnameseDateInput(value);
  return parsed ? formatDate(parsed) : value;
}

function parseVietnameseDateInput(value: string): string | null {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function parseMoneyInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

type ProposalViewContent = {
  rendered_html?: string;
  html?: string;
  project_overview?: string;
  executive_summary?: string;
  scope_of_work?: string | string[];
  deliverables?: string[];
  timeline?: string | ProposalContentDTO["timeline"];
  pricing?: string | ProposalContentDTO["pricing"];
  payment_terms?: string;
  terms?: ProposalContentDTO["terms"];
  assumptions?: string;
  notes?: string;
};

/**
 * Xem lại một bản đánh giá cũ — VÀ chốt được nó.
 *
 * Luồng bị thiếu trước đây: freelancer chấm xong quên bấm Lưu rồi dọn mất tác vụ ở Task
 * Center. Vào tab Lịch sử mở lại bản đó thì chỉ xem được rồi đóng, không có đường chốt.
 * Muốn chuyển deal sang "Đã đánh giá" là phải chấm lại — tốn một lượt AI cho một kết quả
 * đã nằm sẵn trong database.
 *
 * Nút chốt CHỈ hiện khi deal còn ở "Deal mới" và bản này chưa từng được chốt. Deal đã đi
 * qua giai đoạn đó rồi thì chốt thêm một bản cũ chẳng để làm gì.  #Huynh
 */
function QualificationViewModal({
  document,
  deal,
  onClose,
}: {
  document: DealQualification;
  deal: Deal;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const saveQualification = useSaveDealQualification();
  const transitionStage = useTransitionDealStage();
  const [warnOpen, setWarnOpen] = useState(false);

  const view = toQualificationView(document);
  const canSave = deal.stage === "new_lead" && !document.saved_at;
  const saving = saveQualification.isPending || transitionStage.isPending;

  function commitSave(gapAcknowledged: boolean) {
    const stamp = () =>
      saveQualification.mutate(
        { dealId: deal.id, qualificationId: document.id, gapAcknowledged },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: dealQualificationKeys.forDeal(deal.id) });
            setWarnOpen(false);
            toast.success("Đã chốt bản đánh giá này và chuyển deal sang Đã đánh giá.");
            onClose();
          },
          onError: (err) =>
            toast.error(getApiErrorMessage(err, "Không chốt được bản đánh giá này.")),
        }
      );

    // Đổi giai đoạn TRƯỚC rồi mới đóng dấu — cùng thứ tự với nút Lưu ở panel đánh giá, để
    // hai đường vào cho ra đúng một kết quả.
    transitionStage.mutate({ id: deal.id, stage: "qualified" }, { onSuccess: stamp });
  }

  function handleSave() {
    // Cùng luật cảnh báo với panel đánh giá. Không có nó thì đây thành cửa sau để chốt một
    // bản thiếu điểm mà không bị hỏi gì.
    if (view.gaps && saveWarningLevel(view.score, view.gaps.lost_points) !== "none") {
      setWarnOpen(true);
      return;
    }
    commitSave(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      {/* Rộng bằng panel đánh giá (max-w-6xl): CÙNG một nội dung thì phải hiện y như nhau.
          Để max-w-2xl thì bảng chấm điểm hai cột bị bóp lại còn một hai từ mỗi dòng. */}
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Nội dung đánh giá AI</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Đã lưu ngày {formatDate(document.generated_at)}</p>
          </div>
          <WindowControlButton icon={X} label="Đóng" onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* DÙNG CHUNG bộ mã hiển thị với panel lúc vừa chấm xong. Trước đây chỗ này tự
              vẽ lấy, nên mở lại bản đã lưu là thấy giao diện CŨ: chỉ có điểm, kết luận và
              vài dòng tín hiệu — không bảng phân rã, không khả năng chốt, không cờ đỏ.
              Hai bản vẽ riêng thì kiểu gì cũng có ngày lệch nhau.  #Huynh */}
          {/* Dựng view bằng ĐÚNG hàm mà bản vừa chấm xong dùng — hai nơi vẽ riêng thì kiểu
              gì cũng có ngày lệch nhau.  #Huynh */}
          <QualificationResultView view={view} />

          {!document.breakdown?.length && (
            <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Bản đánh giá này được lưu trước khi có bảng phân rã điểm. Chạy "Đánh giá lại" để có
              đầy đủ căn cứ chấm điểm.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
              !canSave && "w-full"
            )}
          >
            Đóng
          </button>
          {canSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Chốt bản này &amp; chuyển sang Đã đánh giá
            </button>
          )}
        </div>
      </div>

      {view.gaps && (
        <SaveQualificationDialog
          open={warnOpen}
          onOpenChange={setWarnOpen}
          score={view.score}
          gaps={view.gaps}
          isSaving={saving}
          onConfirm={() => commitSave(true)}
        />
      )}
    </div>
  );
}

function ProposalViewModal({
  proposalId,
  deal,
  onClose,
}: {
  proposalId: string;
  deal: Deal | null;
  onClose: () => void;
}) {
  const { data: proposal, isLoading } = useProposal(proposalId);
  const raw = proposal?.content as unknown as ProposalViewContent | undefined;

  // Dùng ĐÚNG bản server render như modal soạn thảo (getProposalPreview → iframe), để
  // "Xem nội dung" trông y HỆT lúc vừa gen AI và y hệt PDF khách nhận.  #Huynh
  const previewQuery = useQuery({
    queryKey: ["proposal-preview", proposalId],
    queryFn: () => getProposalPreview(proposalId),
    enabled: !!proposalId,
  });

  // Dựng HTML bằng ĐÚNG hàm mà modal soạn thảo dùng, nên hai màn không thể hiện ra
  // khác nhau nữa. Trước đây màn này tự in ra từng mục thô, còn modal dựng bản đẹp
  // — cùng một báo giá mà trông như hai thứ khác nhau.
  const renderedHtml =
    proposal?.content && deal ? proposalToHtml(proposal.content, deal) : undefined;

  const toList = (v: string | string[] | undefined): string[] =>
    !v ? [] : Array.isArray(v) ? v : [v];
  const timelineText =
    typeof raw?.timeline === "string"
      ? raw.timeline
      : raw?.timeline?.start_date || raw?.timeline?.end_date
        ? `Từ ${raw.timeline.start_date ?? "?"} đến ${raw.timeline.end_date ?? "?"}.`
        : raw?.timeline?.milestones?.map((item) => item.title).filter(Boolean).join("; ");
  const pricingText =
    typeof raw?.pricing === "string"
      ? raw.pricing
      : raw?.pricing?.line_items && raw.pricing.line_items.length > 0
        ? raw.pricing.line_items
            .map((item) => `${item.description}: ${formatVND(item.amount)}`)
            .join("\n")
        : raw?.pricing?.total
          ? `Tổng báo giá: ${formatVND(raw.pricing.total)}`
          : undefined;

  const sections: Array<{ label: string; text?: string; list?: string[] }> = [
    { label: "Tổng quan dự án", text: raw?.project_overview || raw?.executive_summary },
    { label: "Phạm vi công việc", list: toList(raw?.scope_of_work) },
    { label: "Kết quả bàn giao", list: raw?.deliverables },
    { label: "Tiến độ", text: timelineText },
    { label: "Chi phí", text: pricingText },
    { label: "Điều khoản thanh toán", text: raw?.payment_terms || raw?.terms?.payment_terms },
    { label: "Chính sách chỉnh sửa", text: raw?.terms?.revision_policy },
    { label: "Quyền sử dụng", text: raw?.terms?.ip_ownership },
    { label: "Ghi chú", text: raw?.assumptions || raw?.notes },
  ].filter((s) => s.text || (s.list && s.list.length > 0));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
          previewQuery.data ? "h-[85vh]" : "max-h-[90vh]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Nội dung báo giá</h2>
            </div>
            {proposal && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                v{proposal.version_number} · {proposal.status} · {formatDate(proposal.created_at)}
              </p>
            )}
          </div>
          <WindowControlButton icon={X} label="Đóng" onClick={onClose} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
          {previewQuery.isLoading || isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải nội dung...
            </div>
          ) : previewQuery.data ? (
            <iframe
              title="Nội dung báo giá"
              srcDoc={previewQuery.data}
              // `sandbox` KHÔNG kèm `allow-scripts`: tờ giấy là HTML/CSS thuần (hai template
              // Jinja không có thẻ <script> nào), nên chặn script trong khung là miễn phí. Giữ
              // `allow-same-origin` để trang cha còn chạm được `contentDocument` cho sửa tại chỗ.
              sandbox="allow-same-origin"
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : renderedHtml ? (
            <div
              className="prose prose-sm max-w-none overflow-y-auto rounded-lg border border-border p-4 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : sections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Báo giá này chưa có nội dung chi tiết.
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto">
              {sections.map((s) => (
                <div key={s.label}>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  {s.list && s.list.length > 0 ? (
                    <ul className="space-y-1 pl-4 text-sm leading-relaxed text-foreground/85">
                      {s.list.map((item, i) => (
                        <li key={i} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{s.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function ContractViewModal({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const { data: contract, isLoading } = useContract(contractId);
  const sendContract = useSendContract();
  const c = contract?.content;

  // Bản nháp thì cho sửa NGAY trong tờ giấy (bấm vào điều khoản rồi gõ, tự lưu); gửi/ký rồi
  // thì khóa. Xem useContractInlineEditor.  #Huynh
  const editable = contract?.status === "draft";

  // Dùng ĐÚNG bản server render (getContractPreview → iframe), để "Xem nội dung" trông
  // y HỆT tờ hợp đồng khách nhận/ký — thay cho kiểu đổ từng trường thô trước đây, sơ sài
  // đến mức nhìn như lừa đảo. Cùng khuôn với ProposalViewModal.  #Huynh
  const previewQuery = useQuery({
    queryKey: ["contract-preview", contractId, editable],
    queryFn: () => getContractPreview(contractId, editable),
    enabled: !!contractId && !!contract,
  });

  const { iframeRef } = useContractInlineEditor(contract, previewQuery.data);

  function handleSend() {
    sendContract.mutate(contractId, {
      onSuccess: () => {
        toast.success("Đã gửi hợp đồng cho khách ký.");
        onClose();
      },
      onError: () => toast.error("Gửi hợp đồng thất bại. Vui lòng thử lại."),
    });
  }

  const rows: Array<{ label: string; value?: string | null }> = [
    { label: "Phạm vi công việc", value: c?.scope_of_work },
    { label: "Điều khoản thanh toán", value: c?.payment_terms },
    { label: "Chính sách chỉnh sửa", value: c?.revision_policy },
    { label: "Sở hữu trí tuệ", value: c?.ip_ownership },
    { label: "Điều khoản chấm dứt", value: c?.termination_clause },
    { label: "Luật áp dụng", value: c?.governing_law },
    { label: "Điều khoản bổ sung", value: c?.custom_clauses },
  ].filter((r) => r.value);

  // BẢN NHÁP thì luôn nhúng iframe, kể cả khi chưa có điều nào được điền.
  //
  // Trước đây điều kiện là `rows.length > 0`, nên hợp đồng nháp rỗng không được mount và màn
  // hình trả lời thẳng: "Hãy dùng Tạo Hợp Đồng AI". Tức là chính người KHÔNG dùng được AI bị
  // chặn ở đúng chỗ họ cần đi qua — mà tờ giấy ở chế độ sửa giờ đã render sẵn ô rỗng cho từng
  // điều, bấm vào là gõ được.
  //
  // Bản đã gửi/ký thì giữ nguyên luật cũ: rỗng thì không có gì đáng xem.  #Huynh
  const showPreview = !!previewQuery.data && (editable || rows.length > 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
          showPreview ? "max-w-4xl h-[85vh]" : "max-w-2xl max-h-[90vh]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-bold">Nội dung hợp đồng</h2>
            {contract && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Lần {contract.version_number} · {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status} · tạo{" "}
                {formatDate(contract.created_at)}
                {editable && showPreview && (
                  <span className="ml-1 text-primary">· Bấm vào nội dung để sửa, tự lưu</span>
                )}
              </p>
            )}
          </div>
          <WindowControlButton icon={X} label="Đóng" onClick={onClose} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
          {previewQuery.isLoading || isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải nội dung...
            </div>
          ) : showPreview ? (
            <iframe
              ref={iframeRef}
              title="Nội dung hợp đồng"
              srcDoc={previewQuery.data}
              // `sandbox` KHÔNG kèm `allow-scripts`: tờ giấy là HTML/CSS thuần (hai template
              // Jinja không có thẻ <script> nào), nên chặn script trong khung là miễn phí. Giữ
              // `allow-same-origin` để trang cha còn chạm được `contentDocument` cho sửa tại chỗ.
              sandbox="allow-same-origin"
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nội dung hợp đồng chưa được điền. Hãy dùng "Tạo Hợp Đồng AI" để tạo nội dung tự động.
                </div>
              ) : (
                <>
                  {c?.parties && (
                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bên cung cấp</div>
                        <div className="font-medium">{c.parties.freelancer?.name ?? "Freelancer"}</div>
                        {c.parties.freelancer?.business_name && (
                          <div className="text-xs text-muted-foreground">{c.parties.freelancer.business_name}</div>
                        )}
                        {c.parties.freelancer?.email && <div className="text-xs text-muted-foreground">{c.parties.freelancer.email}</div>}
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khách hàng</div>
                        <div className="font-medium">{c.parties.client?.name ?? "Khách hàng"}</div>
                        {c.parties.client?.email && <div className="text-xs text-muted-foreground">{c.parties.client.email}</div>}
                      </div>
                    </div>
                  )}
                  {rows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{row.value}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          {contract?.status === "draft" ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                Đóng
              </button>
              <button
                onClick={handleSend}
                disabled={sendContract.isPending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendContract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendContract.isPending ? "Đang gửi..." : "Gửi cho khách ký"}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
