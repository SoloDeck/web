import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, Loader2, Minus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { WindowControlButton } from "@/components/solodesk/WindowControlButton";
import type { Deal, LeadScore } from "@/features/deals/types";
import { useTransitionDealStage, useUpdateDeal } from "@/features/deals/hooks/useDeals";
import { useQueryClient } from "@tanstack/react-query";
import {
  dealQualificationKeys,
  scoreDelta,
  useDealQualifications,
  useSaveDealQualification,
} from "@/features/deals/hooks/useDealQualifications";
import type { DealPayload, QualificationScoreGaps } from "@/services/dealsService";
import { ClientFactsCard } from "@/features/ai/components/ClientFactsCard";
import { FillGapsDialog } from "@/features/ai/components/FillGapsDialog";
import type { FillField, FillGapsValues } from "@/features/ai/gapFillFields";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import { useCancelAiJob, useCreateAiJob, useAiJob } from "@/features/ai/hooks/useAIJobs";
import {
  getAiJobErrorAdvice,
  getAiJobErrorMessage,
  isTerminal,
} from "@/services/aiJobsService";
import {
  QualificationResultView,
  type QualificationView,
  type ScoreItem,
} from "@/features/ai/components/QualificationResult";
import { SaveQualificationDialog } from "@/features/ai/components/SaveQualificationDialog";
import { LEVEL_UI, saveWarningLevel } from "@/features/ai/qualificationUi";

type EvaluationResult = {
  level: LeadScore;
  score: number;
  label: string;
  rationale: string;
  signals: string[];
  recommendation: string;
  nextActions: string[];
  /** Điểm sẵn sàng báo giá được cộng từ 5 tiêu chí — người dùng đọc để tự kiểm chứng. */
  breakdown: ScoreItem[];
  /** Vì sao MẤT phần điểm còn lại — backend tra từ barem, không phải AI viết. */
  gaps: QualificationScoreGaps | null;
  redFlags: string[];
};

type ApiQualificationResult = {
  project_type?: string | null;
  budget_signal?: string | null;
  timeline_signal?: string | null;
  urgency_signal?: string | null;
  red_flags?: string[] | null;
  suggested_lead_score?: string | null;
  reasoning?: string | null;
  ai_qualification_score?: number | null;
  ai_qualification_recommendation?: string | null;
  // Ba trường dưới đây backend VẪN LUÔN trả về, nhưng trước giờ FE không khai nên
  // vứt đi hết rồi tự hardcode câu tiếng Việt chung chung. Giờ dùng đúng của AI.
  next_step?: string | null;
  suggested_actions?: string[] | null;
  detected_signals?: Array<{ text?: string | null; is_positive?: boolean | null }> | null;
  /** Bảng phân rã điểm: backend cộng tổng từ 5 tiêu chí do AI chấm. */
  score_breakdown?: ScoreItem[] | null;
  /** Phần MẤT điểm: backend tra bảng barem, kèm câu hỏi gửi khách cho từng tiêu chí. */
  score_gaps?: QualificationScoreGaps | null;
};

function mapApiQualification(data: ApiQualificationResult): EvaluationResult | null {
  // KHÔNG bịa điểm. Trước đây là `?? deal.aiQualificationScore ?? 50`: nếu backend trả về
  // kết quả thiếu điểm thì panel hiện "50" — một con số không ai chấm, đội lốt kết quả AI.
  // Rơi về điểm CŨ của deal cũng sai không kém: đây là kết quả của lần chạy MỚI.
  //
  // Backend luôn trả `ai_qualification_score`, nên nhánh này chỉ chạy khi hợp đồng API vỡ —
  // và lúc đó thà không hiện gì còn hơn hiện số bịa.  #Huynh
  const score = data.ai_qualification_score;
  if (typeof score !== "number") return null;

  const rawLevel = (data.suggested_lead_score ?? "").toLowerCase();
  const level: LeadScore =
    rawLevel === "hot" || score >= 75 ? "hot" : rawLevel === "cold" || score < 45 ? "cold" : "warm";

  // Gom tín hiệu backend thành danh sách ngắn để Freelancer dễ đọc.
  // detected_signals đã là câu tiếng Việt hoàn chỉnh do AI viết → dùng thẳng.
  // Không có thì mới ghép từ các trường lẻ.
  const aiSignals = (data.detected_signals ?? [])
    .map((signal) => signal?.text?.trim())
    .filter((text): text is string => Boolean(text));

  const signals = aiSignals.length
    ? [...aiSignals, ...(data.red_flags ?? []).map((flag) => `Lưu ý: ${flag}`)]
    : ([
        data.project_type ? `Loại dự án: ${data.project_type}` : null,
        data.budget_signal ? `Ngân sách: ${data.budget_signal}` : null,
        data.timeline_signal ? `Thời gian: ${data.timeline_signal}` : null,
        data.urgency_signal ? `Độ gấp: ${data.urgency_signal}` : null,
        ...(data.red_flags?.length ? data.red_flags.map((flag) => `Lưu ý: ${flag}`) : []),
      ].filter(Boolean) as string[]);

  return {
    level,
    score,
    label: LEVEL_UI[level].label,
    rationale: data.reasoning || "AI đã chấm điểm nhưng chưa đưa ra phần giải thích chi tiết.",
    signals: signals.length ? signals : ["AI chưa tìm thấy tín hiệu nào đáng chú ý ở deal này."],
    // next_step do AI viết, bám sát chính deal này — sát hơn hẳn câu chung chung theo
    // recommendation. Chỉ khi AI không trả mới rơi về câu mặc định.
    recommendation:
      data.next_step?.trim() ||
      (data.ai_qualification_recommendation === "pass"
        ? "Nên tiếp tục tư vấn và chuyển sang bước báo giá khi đã xác nhận phạm vi."
        : data.ai_qualification_recommendation === "reject"
          ? "Nên cân nhắc loại bỏ hoặc hỏi lại để tránh mất thời gian tư vấn sai nhu cầu."
          : "Nên hỏi thêm phạm vi, ngân sách và thời gian trước khi tạo báo giá."),
    breakdown: data.score_breakdown ?? [],
    gaps: data.score_gaps ?? null,
    redFlags: (data.red_flags ?? []).filter(Boolean),
    nextActions:
      data.suggested_actions?.length
        ? data.suggested_actions.filter(Boolean)
        : level === "hot"
          ? ["Nhắn Zalo hoặc email trong hôm nay", "Xác nhận phạm vi chính", "Tạo báo giá sau khi đủ thông tin"]
          : ["Hỏi thêm phạm vi công việc", "Xác nhận ngân sách và thời gian", "Cập nhật deal sau khi khách phản hồi"],
  };
}

function getErrorHint(error: unknown): string {
  const err = error as { code?: string; response?: { status?: number; data?: { message?: string; detail?: string } } };
  if (err.code === "ECONNABORTED") {
    return "Chờ quá lâu mà chưa có phản hồi. Bạn thử lại sau ít phút nhé.";
  }
  if (err.response?.status === 402) {
    return "Gói của bạn chưa có tính năng AI. Hãy nâng cấp để dùng.";
  }
  // 429 = hết hạn mức AI trong kỳ. Nói rõ, đừng để họ bấm lại mãi.  #Huynh
  if (err.response?.status === 429) {
    return "Đã dùng hết lượt AI trong kỳ này. Vào mục Gói dịch vụ để xem hạn mức và nâng cấp.";
  }
  if (err.response?.status) {
    const message = err.response.data?.message || err.response.data?.detail;
    return `Hệ thống báo lỗi ${err.response.status}${message ? `: ${message}` : "."}`;
  }
  return "Không kết nối được tới máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.";
}

export function AIPanel({
  open,
  deal,
  onClose,
  /**
   * Mở để XEM LẠI một job đã chạy, thay vì chạy job mới.
   *
   * Dùng khi bấm "Xem" ở tab Lịch sử: kết quả AI nằm trên backend nên xem lại được
   * kể cả sau khi F5 — trước đây reload là mất, không mò lại được.
   */
  viewJobId,
  /** Đổi mỗi lần người dùng bấm mở/Xem — dùng để bung lại panel đã thu nhỏ. */
  openNonce = 0,
}: {
  open: boolean;
  deal?: Deal | null;
  onClose: () => void;
  viewJobId?: string | null;
  openNonce?: number;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saveWarningOpen, setSaveWarningOpen] = useState(false);
  const [fillGapsOpen, setFillGapsOpen] = useState(false);
  /** Vừa bổ sung dữ liệu nhưng chưa chấm lại — điểm đang hiện là của dữ liệu cũ. */
  const [staleAfterFill, setStaleAfterFill] = useState(false);
  /**
   * Những ô đã bổ sung trong phiên này, để khung "Thông tin khách đã cho" gắn nhãn "vừa
   * thêm". CỐ Ý không xoá sau khi chấm lại: đó đúng là lúc người dùng cần đối chiếu "mình
   * thêm cái này nên điểm lên chừng này". Cộng dồn qua nhiều lần điền lẻ từng ô.
   */
  const [justAddedFields, setJustAddedFields] = useState<FillField[]>([]);
  /**
   * Nguyên văn phần mô tả vừa viết thêm. Phải giữ riêng: trên `deal.notes` nó đã bị trộn
   * vào đoạn mô tả cũ nên không tách ra được nữa, mà đây lại đúng là thứ người dùng muốn
   * nhìn lại để biết mình vừa thêm gì.
   */
  const [justAddedNotes, setJustAddedNotes] = useState("");
  const staleBannerRef = useRef<HTMLDivElement | null>(null);
  const [createError, setCreateError] = useState("");
  /** Job nào đã kéo lại lịch sử rồi — chặn refetch lặp trong effect đồng bộ trạng thái. */
  const historyRefreshedFor = useRef<string | null>(null);
  /**
   * Số lần người dùng CHỦ ĐỘNG chấm lại trong phiên panel này — đi vào `idempotency_key`.
   *
   * Là `ref` chứ không phải state, và CHỈ tăng trong `rerunQualification` (nút bấm), không
   * tăng trong `runQualification`. Nếu tăng ở trong đó thì hai lần bắn của StrictMode sẽ ra
   * hai khoá khác nhau → đẻ hai job → đốt hai lượt AI cho một cú bấm, đúng thứ khoá này
   * sinh ra để chặn.
   */
  const runSeq = useRef(0);

  // job_id THẬT do backend cấp (POST /ai/jobs), không còn là chuỗi tự chế.
  // Xem lại job cũ thì dùng thẳng viewJobId — SUY RA chứ không set state trong
  // effect (vừa gây render dây chuyền, vừa bị eslint chặn).
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const jobId = viewJobId ?? createdJobId;

  // Chạy job mới → thu nhỏ để người dùng làm việc khác. Xem lại job cũ → mở sẵn,
  // vì họ bấm "Xem" chính là để nhìn kết quả ngay.
  //
  // Lựa chọn thu nhỏ phải GẮN VỚI job đang xem, không được là một cờ boolean trần.
  // Bug cũ: bấm "Đánh giá Deal" -> runQualification() gọi setMinimized(true) -> cờ đó
  // DÍNH LUÔN. Sau đó bấm "Xem" chỉ đổi viewJobId, cờ vẫn true, nên panel mở ra mà
  // vẫn thu nhỏ — người dùng thấy như bấm không ăn gì.
  // Cờ thu nhỏ gắn với LẦN MỞ (openNonce), không phải một boolean trần.
  //
  // Thu nhỏ KHÔNG xoá panel khỏi store — người dùng phải mở lại được, vì có khi họ chỉ
  // muốn ẩn đi một lát rồi xem kỹ hơn. Nhưng nếu cờ này là boolean trần thì bấm "Xem"
  // lần nữa panel vẫn thấy cờ = true và cứ nằm im. Gắn theo openNonce thì mỗi lần bấm
  // "Xem" là một nonce mới → lựa chọn thu nhỏ cũ hết hiệu lực → panel bung ra.  #Huynh
  const [minimizedOverride, setMinimizedOverride] = useState<{
    nonce: number;
    value: boolean;
  } | null>(null);

  const minimized =
    minimizedOverride?.nonce === openNonce ? minimizedOverride.value : !viewJobId;

  const setMinimized = useCallback(
    (value: boolean) => setMinimizedOverride({ nonce: openNonce, value }),
    [openNonce]
  );

  const createJob = useCreateAiJob();
  const cancelJobApi = useCancelAiJob();
  const { data: job } = useAiJob(jobId ?? undefined);

  const transitionStage = useTransitionDealStage();
  const saveQualification = useSaveDealQualification();
  const updateDeal = useUpdateDeal();
  const qualificationHistory = useDealQualifications(deal?.id);
  const qc = useQueryClient();
  const upsertJob = useAIActivityStore((state) => state.upsertJob);
  const updateJob = useAIActivityStore((state) => state.updateJob);
  const removeJob = useAIActivityStore((state) => state.removeJob);

  // Kết quả và lỗi được SUY RA từ job, không lưu thành state riêng. Nhờ vậy sau khi
  // F5 và khôi phục lại job, màn hình tự hiện đúng — không cần đồng bộ tay.
  const result: EvaluationResult | null = useMemo(() => {
    if (!deal || job?.status !== "succeeded" || !job.result) return null;
    return mapApiQualification(job.result as ApiQualificationResult);
  }, [deal, job]);

  // Ngân sách theo LỜI KHÁCH để hiện ở dải đầu cửa sổ. Ưu tiên chữ khách nói qua ô bổ sung
  // (client_budget) vì đó là bản mới nhất và cũng chính là thứ AI đọc để chấm tiêu chí Ngân
  // sách; sau đó mới tới ngân sách khách tự điền ở biểu mẫu công khai (budgetLabel).
  // Rỗng => trả "" để chỗ hiển thị tự đổi sang trạng thái "Khách chưa nêu".
  const clientBudgetLabel = deal?.clientBudget?.trim() || deal?.budgetLabel?.trim() || "";

  const errorHint =
    createError || (job?.status === "failed" ? (getAiJobErrorMessage(job) ?? "") : "");
  // Người dùng nên làm gì tiếp. Job hỏng thì tra theo mã lỗi backend gửi về (getAiJobErrorAdvice
  // tự xét cả cờ retryable); còn lỗi ngay lúc tạo job (createError) hầu như là mạng, cứ
  // khuyên thử lại.
  const errorAdvice =
    job?.status === "failed"
      ? getAiJobErrorAdvice(job)
      : 'Bạn thử bấm "Đánh giá lại" sau ít phút. Nếu vẫn lỗi, hãy báo cho quản trị viên.';

  // Đang chạy = đang tạo job, hoặc job có rồi nhưng chưa vào trạng thái kết thúc.
  const isRunning = createJob.isPending || Boolean(job && !isTerminal(job.status));

  function runQualification(currentDeal: Deal) {
    setCreateError("");
    setCreatedJobId(null);
    setStaleAfterFill(false);
    setMinimized(true);

    createJob.mutate(
      {
        entity_id: currentDeal.id,
        type: "lead_qualifier",
        entity_type: "deal",
        // CHỐNG CHẤM ĐIỂM 2 LẦN CHO MỘT CÚ BẤM.
        //
        // Effect này gọi mutation, mà React StrictMode (dev) chạy effect HAI LẦN khi mount
        // → hai POST bay đi gần như đồng thời. Backend có chặn job trùng, nhưng bằng cách
        // "tìm job đang chạy rồi mới tạo" — kinh điển bị đua: cả hai cùng tìm, cùng không
        // thấy, cùng tạo. Kết quả: 2 job, 2 lần chấm, và ĐỐT 2 LƯỢT AI THẬT cho một cú bấm.
        //
        // `idempotency_key` đã có sẵn ở backend VÀ có ràng buộc UNIQUE dưới DB
        // (`uq_ai_jobs_owner_idempotency_key`) — chỉ là chưa ai gửi.
        //
        // Khoá gồm HAI phần. `openNonce` để hai lần bắn của StrictMode trong cùng một lần
        // mở panel gộp làm một. `runSeq` để mỗi lần người dùng CHỦ ĐỘNG chấm lại là một
        // khoá mới.
        //
        // Thiếu `runSeq` là hỏng nặng: `get_by_idempotency_key` ở backend không giới hạn
        // thời gian cũng không lọc trạng thái, nên nó trả về job CŨ ĐÃ XONG mãi mãi. Bấm
        // "Đánh giá lại" sẽ nhận lại y nguyên kết quả cũ — người dùng bổ sung ngân sách,
        // chấm lại, rồi vẫn thấy báo thiếu ngân sách.  #Huynh
        idempotency_key: `lead_qualifier:${currentDeal.id}:${openNonce}:${runSeq.current}`,
      },
      {
        onSuccess: (created) => {
          // BE tự trả lại job đang chạy nếu deal này đã có job cùng loại — nên gọi
          // lại sau F5 sẽ NHẬN LẠI ĐÚNG JOB CŨ thay vì đẻ thêm job mới.
          setCreatedJobId(created.id);
          upsertJob({
            id: created.id,
            kind: "deal_qualification",
            title: `Đánh giá ${currentDeal.projectType}`,
            description: "AI đang phân tích nhu cầu, ngân sách và tín hiệu từ deal.",
            entityLabel: currentDeal.client,
            entityId: currentDeal.id, // để Task Center điều hướng về đúng deal khi bấm "Xem"
            status: "running",
            remote: true, // job thật của BE → Task Center huỷ được bằng API
          });
          toast.info("AI đang đánh giá deal ở nền. Bạn có thể tiếp tục thao tác màn hình khác.");
        },
        onError: (error) => {
          const hint = getErrorHint(error);
          setCreateError(hint);
          toast.error("Không tạo được tác vụ AI. Vui lòng thử lại.");
        },
      }
    );
  }

  // Kéo dải báo vào tầm mắt. Đặt nó lên đầu thôi chưa đủ: lúc bấm "Bổ sung thông tin" người
  // dùng thường đang cuộn ở giữa bảng kết quả, hộp đóng lại là họ vẫn đứng nguyên chỗ cũ và
  // không thấy gì thay đổi.
  useEffect(() => {
    if (!staleAfterFill) return;
    staleBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [staleAfterFill]);

  /** Người dùng chủ động chấm lại — khoá mới để backend thật sự chạy lại, không trả job cũ. */
  function rerunQualification(currentDeal: Deal) {
    runSeq.current += 1;
    runQualification(currentDeal);
  }

  useEffect(() => {
    // Mở để XEM LẠI job cũ (viewJobId) → không chạy AI lại, tránh tốn quota và tránh
    // đè mất kết quả mà người dùng đang muốn xem. jobId và minimized đã được suy ra
    // từ viewJobId ở trên nên không cần set gì ở đây.
    if (!open || !deal || viewJobId) return;

    runQualification(deal);
    // Mutation object thay đổi theo render nên chỉ bám theo deal/open/viewJobId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open, viewJobId]);

  // Đồng bộ trạng thái job thật sang Task Center (store ngoài React) mỗi khi
  // backend báo job đổi trạng thái.
  useEffect(() => {
    if (!job || !deal) return;

    if (job.status === "succeeded" && result) {
      updateJob(job.id, {
        status: "success",
        description: `Đã có kết quả ${result.score}/100. Bấm Xem để kiểm tra và lưu đánh giá.`,
      });

      // Kéo lại lịch sử để so được với lần chấm trước. Backend đã ghi bản mới NGAY LÚC chấm,
      // nhưng cache của FE còn giữ danh sách cũ nên dải "27 → 72" sẽ không hiện.
      //
      // Chốt chặn theo job id: effect này chạy lại mỗi lần `job`/`result` đổi tham chiếu, gọi
      // vô điều kiện là bắn refetch lặp cho một job đã xong.
      if (historyRefreshedFor.current !== job.id) {
        historyRefreshedFor.current = job.id;
        qc.invalidateQueries({ queryKey: dealQualificationKeys.forDeal(deal.id) });
      }

      // KHÔNG ghi vào lịch sử localStorage nữa. Tab Lịch sử giờ đã liệt kê các lần
      // chấm điểm AI lấy thẳng từ backend (kèm nút Xem để mở lại kết quả), nên ghi
      // thêm ở đây là kể cùng một chuyện hai lần — người dùng thấy hai danh sách
      // trùng nhau.
    } else if (job.status === "failed") {
      updateJob(job.id, {
        status: "error",
        description: "Không thể đánh giá deal bằng AI.",
        error: getAiJobErrorMessage(job) ?? undefined,
      });
    } else if (job.status === "cancelled") {
      removeJob(job.id);
    }
  }, [job, deal, result, updateJob, removeJob, qc]);

  /**
   * Bấm "Lưu" -> hỏi trước nếu chưa đủ 100 điểm, chốt sau.
   *
   * Trước đây bấm là đóng dấu thẳng, kể cả deal 12/100: hệ thống biết rõ hồ sơ chưa đủ căn
   * cứ để báo giá mà không nói một câu nào.  #Huynh
   */
  function saveAndMoveNext() {
    if (!deal) return;
    if (!result) {
      toast.error("Chưa có kết quả đánh giá để lưu.");
      return;
    }

    if (result.gaps && saveWarningLevel(result.score, result.gaps.lost_points) !== "none") {
      setSaveWarningOpen(true);
      return;
    }

    commitSave(false);
  }

  function commitSave(gapAcknowledged: boolean) {
    if (!deal || !result) return;
    // Backend đã ghi bản chấm vào lịch sử NGAY LÚC chấm (`/deals/{id}/qualify` đẻ một dòng
    // `lead_scores` kèm bảng căn cứ), nên đóng panel giữa chừng không mất kết quả.
    //
    // Nhưng "đã chấm" KHÁC "đã chốt". Mọi lần chấm — kể cả chấm thử rồi bỏ — đều nằm ở tab
    // Lịch sử. Chỉ bản bấm nút này mới được đóng dấu `saved_at` và hiện ở tab Tài liệu.
    // Trước đây không có bước đóng dấu, nên câu thông báo hứa "đã lưu vào tab Tài liệu" mà
    // sang đó chẳng thấy gì — người dùng tưởng mất kết quả.  #Huynh
    const refreshHistory = () =>
      qc.invalidateQueries({ queryKey: dealQualificationKeys.forDeal(deal.id) });

    const done = () => {
      refreshHistory();
      setSaveWarningOpen(false);
      toast.success("Đã lưu vào tab Tài liệu.");
      if (jobId) removeJob(jobId);
      onClose();
    };

    const stamp = () =>
      saveQualification.mutate(
        { dealId: deal.id, gapAcknowledged },
        {
          onSuccess: done,
          onError: (err) => {
            // Nói ra vì sao, đừng nuốt: không đóng dấu được thì tab Tài liệu sẽ trống, mà
            // người dùng lại vừa đọc thông báo "đã lưu".
            console.error("[qualification] không đóng dấu được bản đánh giá", err);
            toast.error(
              getApiErrorMessage(err, "Không lưu được bản đánh giá. Vui lòng thử lại.")
            );
          },
        }
      );

    if (deal.stage !== "new_lead") {
      stamp();
      return;
    }
    transitionStage.mutate({ id: deal.id, stage: "qualified" }, { onSuccess: stamp });
  }

  /**
   * Lưu thông tin khách đã cho. CHỈ LƯU — không tự chấm lại (lý do ở `onSuccess` bên dưới).
   *
   * Ghi lại luôn những ô vừa lưu vào `justAddedFields` để khung "Thông tin khách đã cho"
   * bày ra được là người dùng vừa thêm cái gì; nếu không, họ chỉ thấy điểm nhảy mà không
   * biết nhờ dữ kiện nào.
   */
  function submitGapFill(values: FillGapsValues) {
    if (!deal) return;

    const payload: DealPayload = { client_id: deal.clientId, title: deal.projectType };
    if (values.client_budget) payload.client_budget = values.client_budget;
    if (values.desired_timeline) payload.desired_timeline = values.desired_timeline;
    if (values.notes_append) {
      // NỐI THÊM, không ghi đè: phần mô tả cũ cũng đang được chấm điểm, thay nó bằng vài
      // dòng mới là vừa bổ sung chỗ này vừa làm tụt điểm chỗ khác.
      payload.notes = [deal.notes.trim(), values.notes_append].filter(Boolean).join("\n");
    }

    updateDeal.mutate(
      { id: deal.id, payload },
      {
        onSuccess: () => {
          setFillGapsOpen(false);
          // CHỈ LƯU, KHÔNG tự chấm lại.
          //
          // Mỗi lần chấm là một lượt AI bị trừ khỏi hạn mức của freelancer và một lần tốn
          // tiền thật. Tự chạy sau một thao tác người dùng nghĩ là "lưu" thì họ điền lẻ ba
          // ô là mất ba lượt mà không ai báo trước — đó là kiểu bất ngờ làm mất niềm tin,
          // chứ không chỉ là chuyện tốn kém.
          //
          // Thay vào đó bật cờ báo điểm đã cũ; người dùng tự bấm "Chấm lại" khi đã điền
          // xong hết.  #Huynh
          setStaleAfterFill(true);

          // Gộp với lần bổ sung trước để điền lẻ từng ô vẫn giữ đủ dấu vết.
          //
          // Chỉ tính ô THỰC SỰ đổi giá trị: hộp bổ sung mở ra đã điền sẵn dữ liệu cũ, nên
          // người dùng chỉ sửa ô thời hạn rồi bấm Lưu là ô ngân sách cũng bị gửi kèm y
          // nguyên — đánh dấu "vừa thêm" cho nó là nói sai việc họ vừa làm.
          const added: FillField[] = [];
          if (values.client_budget && values.client_budget !== deal.clientBudget?.trim()) {
            added.push("client_budget");
          }
          if (values.desired_timeline && values.desired_timeline !== deal.desiredTimeline?.trim()) {
            added.push("desired_timeline");
          }
          if (values.notes_append) added.push("notes");
          setJustAddedFields((prev) => [...new Set([...prev, ...added])]);
          if (values.notes_append) {
            setJustAddedNotes((prev) =>
              [prev, values.notes_append].filter(Boolean).join("\n")
            );
          }
        },
      }
    );
  }

  function handleClose() {
    if (jobId) removeJob(jobId);
    onClose();
  }

  function confirmCancelAI() {
    if (!jobId) return;
    setCancelDialogOpen(false);
    setMinimized(true);

    // Huỷ THẬT ở backend, không chỉ giấu đi trên giao diện như trước.
    cancelJobApi.mutate(jobId, {
      onSuccess: () => {
        removeJob(jobId);
        // BE nói rõ: huỷ là best-effort. Worker đang gọi LLM thì không kill giữa
        // chừng được — nó chỉ kiểm tra cờ rồi bỏ qua kết quả. Đừng hứa "dừng ngay".
        toast.info("Đã yêu cầu hủy tác vụ AI. Kết quả (nếu có) sẽ bị bỏ qua.");
      },
      onError: () => {
        toast.error("Không hủy được tác vụ. Có thể nó vừa chạy xong.");
      },
    });
    onClose();
  }

  // Đổ về shape dùng chung với tab Tài liệu — MỘT bộ mã hiển thị duy nhất, nên bản vừa
  // chạy xong và bản lưu lại không thể vẽ ra hai kiểu khác nhau.  #Huynh
  const resultView: QualificationView | null = result
    ? {
        level: result.level,
        score: result.score,
        label: result.label,
        rationale: result.rationale,
        recommendation: result.recommendation,
        signals: result.signals,
        breakdown: result.breakdown,
        gaps: result.gaps,
        redFlags: result.redFlags,
      }
    : null;


  if (!open || !deal || minimized) return null;

  return (
    <>
      {/* Bấm ra ngoài panel = thu nhỏ, không phải đóng. Đóng hẳn thì mất kết quả đang
          xem; thu nhỏ giữ nguyên và vẫn mở lại được từ Task Center.  #Huynh */}
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in"
        onClick={() => setMinimized(true)}
      >
        <div
          /* max-w-6xl (1152px) chứ không phải 3xl: khung cũ 768px trên màn 1900px bỏ phí gần
             hai phần ba chiều ngang, mà nội dung thì xếp dọc dài lê thê. Rộng đủ cho hai cột
             nhưng vẫn chừa viền tối hai bên để biết đây là cửa sổ đè lên, không phải trang. */
          className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
        {/* z-20 là BẮT BUỘC: vòng tròn điểm dùng SVG có transform (-rotate-90), mà transform
            tạo stacking context mới nên nó được vẽ ĐÈ LÊN header sticky nếu header không
            có z-index. Cuộn xuống là thấy hai vòng tròn nổi lù lù trên tiêu đề.  #Huynh */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Đánh giá deal bằng AI</div>
              <div className="text-xs text-muted-foreground">Phân tích dữ liệu deal và lưu điểm đánh giá vào hệ thống</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isRunning && (
              <button
                type="button"
                onClick={() => setCancelDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                Hủy tác vụ
              </button>
            )}
            {/* Nút cửa sổ: CHỈ biểu tượng, y như Chrome/Cốc Cốc. Nhãn nằm ở tooltip +
              aria-label. Nút "Hủy tác vụ" ngay bên trái CỐ Ý giữ chữ — nó dừng tác vụ AI đang
              chạy (mất kết quả), để icon-only cạnh nút ✕ là hai nút trông giống nhau mà hậu
              quả khác hẳn.  #Huynh */}
            <WindowControlButton
              icon={Minus}
              label="Thu nhỏ"
              onClick={() => setMinimized(true)}
            />
            {/* Nhãn "Đóng" chứ không phải "Hủy": nút này đóng cửa sổ, không hủy gì cả — và khi
              AI đang chạy nó còn chỉ thu nhỏ. Khớp luôn với mọi modal khác. */}
            <WindowControlButton
              icon={X}
              label="Đóng"
              onClick={isRunning ? () => setMinimized(true) : handleClose}
            />
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Dải thông tin deal — gọn một dòng. Bỏ ô "Kênh": nó không liên quan gì tới
              việc chấm điểm, chỉ chiếm chỗ. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Deal đang đánh giá
              </div>
              <h2 className="mt-0.5 truncate text-base font-bold text-foreground">{deal.projectType}</h2>
              <div className="text-sm text-muted-foreground">{deal.client}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-medium text-muted-foreground">Ngân sách khách đưa</div>
              {/* Nhãn nói "khách đưa" thì chỉ được lấy LỜI KHÁCH, theo đúng thứ tự:
                  clientBudget (khách nói miệng, freelancer chép vào ô Bổ sung thông tin) →
                  budgetLabel (khách tự điền ở biểu mẫu công khai) → chưa có gì.

                  CỐ Ý không rơi về formatVND(deal.value). `value` là estimated_value —
                  con số freelancer TỰ ƯỚC, thứ mà backend xếp vào khối "KHÔNG PHẢI LỜI
                  KHÁCH — CẤM DÙNG ĐỂ CHẤM ĐIỂM". Deal tự tạo thì nó bằng 0, nên chỗ này
                  từng hiện "0 đ" cho mọi deal: bổ sung ngân sách xong nhìn lên vẫn thấy
                  "0 đ", tưởng bấm Lưu không ăn. Mà "0 đ" còn tệ hơn bỏ trống — trông như
                  khách bảo không trả đồng nào.  #Huynh */}
              {clientBudgetLabel ? (
                <div className="text-lg font-bold text-foreground">{clientBudgetLabel}</div>
              ) : (
                <div className="text-sm font-medium text-muted-foreground">Khách chưa nêu</div>
              )}
            </div>
          </div>

          {isRunning && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">AI đang đánh giá deal...</div>
                  <div className="text-sm text-muted-foreground">
                    Thường mất vài giây. Bạn có thể thu nhỏ và làm việc khác.
                  </div>
                </div>
              </div>
            </div>
          )}

          {errorHint && !isRunning && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="font-semibold text-destructive">Chưa đánh giá được deal</div>
              <p className="mt-1 text-muted-foreground">{errorHint}</p>
              {/* Câu khuyên chọn theo MÃ LỖI (xem getAiJobErrorAdvice). Bản cũ chỉ có hai
                  nhánh theo cờ retryable, nên mọi lỗi không-thử-lại-được đều bị kết luận là
                  "phải nâng gói" — kể cả khi nhà cung cấp AI chặn vì quá hạn mức token, và
                  gói của người dùng vốn đang là Agency.  #Huynh */}
              <p className="mt-2 text-xs text-muted-foreground">{errorAdvice}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Đã lưu dữ liệu mới nhưng CHƯA chấm lại — nói thẳng là con điểm đang hiện
                  không tính phần vừa thêm. Không tự chấm lại vì mỗi lần chấm trừ một lượt
                  AI của người dùng; để họ điền xong hết rồi bấm một lần.

                  Đặt TRÊN bảng kết quả, không phải dưới. Bản đầu tui để dưới cùng — sau cả
                  một khối kết quả dài — nên đóng hộp bổ sung xong là màn hình trông y như
                  cũ, phải cuộn tới đáy mới thấy. Phản hồi cho một thao tác phải hiện ở chỗ
                  mắt đang nhìn, và ngay cạnh con điểm mà nó nói là đã cũ.  #Huynh */}
              {staleAfterFill && !isRunning && (
                <div
                  ref={staleBannerRef}
                  className="rounded-xl border border-warm bg-warm/10 p-4"
                >
                  <div className="text-sm font-semibold">Đã lưu thông tin bổ sung</div>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    Điểm bên dưới vẫn là của lần chấm trước, chưa tính phần bạn vừa thêm. Bấm
                    <span className="font-semibold text-foreground"> Đánh giá lại </span>
                    ở cuối cửa sổ để cập nhật — sẽ dùng một lượt AI.
                  </p>
                </div>
              )}

              {/* Đặt NGAY TRÊN bảng chấm điểm, sát dải "63 → 73 +10": hai thứ này phải đọc
                  liền nhau mới thành một câu hoàn chỉnh — "thêm ngân sách 100 triệu" (khung
                  này) "nên điểm lên 10" (dải delta). Tách xa nhau thì người dùng thấy điểm
                  nhảy mà không biết nhờ đâu.  #Huynh */}
              <ClientFactsCard
                deal={deal}
                justAdded={justAddedFields}
                justAddedNotes={justAddedNotes}
                breakdown={result.breakdown}
                scoresAreStale={staleAfterFill}
                canEdit={(result.gaps?.gaps.length ?? 0) > 0}
                onEdit={() => setFillGapsOpen(true)}
              />

              <QualificationResultView
                view={resultView!}
                delta={scoreDelta(qualificationHistory.data, resultView!.score)}
                onFillGaps={() => setFillGapsOpen(true)}
              />

              {/* Nút hành động dính đáy — không phải cuộn hết trang mới bấm được. */}
              {/* CHỈ MỘT nút chấm lại trên cả màn hình, và nó ở đây.
                  Dải báo phía trên cố ý KHÔNG có nút riêng — hai nút cùng một việc thì người
                  dùng phải dừng lại nghĩ xem chúng có khác nhau không.

                  Đổi lại, khi dữ liệu đã đổi mà chưa chấm lại thì ĐẢO mức nhấn: "Đánh giá
                  lại" thành nút chính, nút Lưu lùi về phụ. Chốt một bản đánh giá đã lỗi thời
                  chính là thứ cần tránh, nên đừng để nó là nút nổi nhất.  #Huynh */}
              <div className="sticky bottom-0 z-20 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
                <button
                  type="button"
                  onClick={() => rerunQualification(deal)}
                  disabled={isRunning || transitionStage.isPending}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
                    staleAfterFill
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border hover:bg-secondary"
                  )}
                >
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Đánh giá lại
                </button>
                <button
                  type="button"
                  onClick={saveAndMoveNext}
                  disabled={isRunning || transitionStage.isPending}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
                    staleAfterFill
                      ? "border border-border hover:bg-secondary"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {transitionStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {deal.stage === "new_lead" ? "Lưu & chuyển sang Đã đánh giá" : "Lưu đánh giá"}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Hủy tác vụ AI?"
        description="SoloDesk sẽ ẩn tác vụ này và bỏ qua kết quả nếu backend trả về sau đó. Khi backend có API job thật, thao tác này sẽ gọi cancel job."
        confirmLabel="Hủy tác vụ"
        cancelLabel="Tiếp tục chờ"
        tone="danger"
        onConfirm={confirmCancelAI}
      />
      {result?.gaps && (
        <SaveQualificationDialog
          open={saveWarningOpen}
          onOpenChange={setSaveWarningOpen}
          score={result.score}
          gaps={result.gaps}
          isSaving={transitionStage.isPending || saveQualification.isPending}
          onConfirm={() => commitSave(true)}
        />
      )}
      {result?.gaps && (
        <FillGapsDialog
          // Mở lại là dựng lại form từ dữ liệu deal mới nhất, không giữ chữ gõ dở của lần
          // trước — lần trước người dùng đã bấm "Để sau", giữ lại là đoán hộ họ.
          key={`${deal.id}-${fillGapsOpen}`}
          open={fillGapsOpen}
          onOpenChange={setFillGapsOpen}
          deal={deal}
          gaps={result.gaps}
          isSaving={updateDeal.isPending}
          onSubmit={submitGapFill}
        />
      )}
    </>
  );
}


/** Khung thẻ chung — trước đây mỗi chỗ lặp lại một bản border/padding riêng. */
