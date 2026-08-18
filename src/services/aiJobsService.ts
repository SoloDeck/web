import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// AI Jobs — hàng đợi tác vụ AI chạy nền (Celery) trên backend.
//
// Thay cho cách cũ: gọi AI đồng bộ rồi ngồi chờ. Giờ BE trả `job_id` ngay, FE
// poll cho tới khi job vào trạng thái kết thúc. Nhờ vậy job sống sót qua F5 và
// chạy nhiều job song song được — đúng NFR "không chặn ứng dụng chính".
//
// Cả 4 module AI của BE giờ đều chạy thật: lead_qualifier, proposal_generator,
// contract_generator, followup_generator. (Ghi chú cũ ở đây nói proposal 500 và
// contract còn là stub — đã sửa xong, không còn đúng nữa.)
// ---------------------------------------------------------------------------

export type AiJobType = "lead_qualifier" | "proposal_generator" | "contract_generator";
export type AiJobEntityType = "deal" | "contract";

/** queued → running → (succeeded | failed | cancelled). Ba trạng thái sau là kết thúc. */
export type AiJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export const TERMINAL_STATUSES: readonly AiJobStatus[] = ["succeeded", "failed", "cancelled"];

export function isTerminal(status: AiJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export type AiJob = {
  id: string;
  type: AiJobType;
  entity_type: AiJobEntityType;
  entity_id: string;
  status: AiJobStatus;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CreateAiJobPayload = {
  entity_id: string;
  type: AiJobType;
  entity_type: AiJobEntityType;
  /** Gửi kèm để bấm hai lần không tạo hai job. BE cũng tự trả lại job đang chạy nếu trùng entity + type. */
  idempotency_key?: string;
};

type PaginatedJobs = {
  data: AiJob[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

/** POST /ai/jobs — tạo job, BE đẩy sang Celery và trả job_id ngay lập tức. */
export async function createAiJob(payload: CreateAiJobPayload): Promise<AiJob> {
  const { data } = await axiosClient.post<ApiResponse<AiJob>>("/ai/jobs", payload);
  return data.data;
}

/** GET /ai/jobs/{id} — dùng để poll trạng thái. */
export async function getAiJob(jobId: string): Promise<AiJob> {
  const { data } = await axiosClient.get<ApiResponse<AiJob>>(`/ai/jobs/${jobId}`);
  return data.data;
}

/** GET /ai/jobs?entity_id= — dùng để khôi phục job đang chạy sau khi F5. */
export async function listAiJobs(params: {
  entity_type?: AiJobEntityType;
  entity_id?: string;
  page_size?: number;
}): Promise<AiJob[]> {
  const { data } = await axiosClient.get<PaginatedJobs>("/ai/jobs", {
    params: { page_size: 20, ...params },
  });
  return data.data ?? [];
}

/**
 * POST /ai/jobs/{id}/cancel — huỷ job.
 *
 * Là "best-effort": nếu worker đang gọi LLM thì không kill được giữa chừng, BE
 * chỉ đánh dấu cờ rồi bỏ qua kết quả khi worker trả về. Nên UI đừng hứa "đã dừng
 * ngay lập tức".
 */
export async function cancelAiJob(jobId: string): Promise<AiJob> {
  const { data } = await axiosClient.post<ApiResponse<AiJob>>(`/ai/jobs/${jobId}/cancel`);
  return data.data;
}

/** Đọc thông điệp lỗi từ cột `error` (JSONB) của job. */
// Backend trả kèm `code` (ErrorCode) trong job.error. Dịch sang câu tiếng Việt rõ ràng —
// message thô của backend là tiếng Anh ("Your plan does not include AI features...") và
// lọt thẳng ra màn hình thì vừa lệch ngôn ngữ vừa khó hiểu.  #Huynh
// Đối chiếu với backend (src/modules/ai_jobs/application/errors.py) — trước đây hai dòng
// giữa bị ĐẢO nhau: hết lượt tháng thật ra là RATE_LIMITED (RateLimitError → 429), còn
// AI_QUOTA_EXCEEDED là AIGenerationError (mô hình sinh lỗi → 502). Dùng hết lượt mà màn
// hình bảo "hệ thống đang bận" thì người dùng cứ ngồi bấm lại mãi.  #Huynh
const AI_JOB_ERROR_MESSAGES: Record<string, string> = {
  SUBSCRIPTION_REQUIRED: "Gói của bạn chưa có tính năng AI. Hãy nâng cấp gói để dùng.",
  RATE_LIMITED: "Đã dùng hết lượt AI trong kỳ này. Vào mục Gói dịch vụ để xem hạn mức.",
  AI_QUOTA_EXCEEDED: "AI không sinh được kết quả cho lần chạy này.",
  // AI_PROVIDER_ERROR CỐ Ý không có ở đây: backend đã gửi sẵn câu tiếng Việt nói rõ nhà
  // cung cấp từ chối vì gì (hạn mức token, khoá sai, model bị gỡ...) kèm nguyên văn lỗi.
  // Ghi đè bằng một câu chung là ném đi đúng thứ cần đọc lúc demo.
};

export function getAiJobErrorMessage(job: AiJob | undefined): string | null {
  if (!job?.error) return null;
  const code = typeof job.error.code === "string" ? job.error.code : "";
  if (code && AI_JOB_ERROR_MESSAGES[code]) return AI_JOB_ERROR_MESSAGES[code];
  const msg = job.error.message ?? job.error.detail;
  return typeof msg === "string" && msg.trim() ? msg : "AI xử lý thất bại.";
}

/**
 * Lỗi này có đáng thử lại không? Backend đánh dấu `retryable`: true cho lỗi tạm (nhà cung
 * cấp AI bận, quá hạn mức token mỗi phút, mạng chập chờn), false cho lỗi phải đổi thứ gì đó
 * mới hết (gói không có AI, hết lượt tháng, khoá API sai, model bị gỡ).
 */
export function isAiJobErrorRetryable(job: AiJob | undefined): boolean {
  return job?.error?.retryable === true;
}

/**
 * Câu khuyên đi kèm thông báo lỗi: người dùng nên LÀM GÌ tiếp theo.
 *
 * Tách khỏi `getAiJobErrorMessage` vì hai câu trả lời hai câu hỏi khác nhau — "hỏng cái gì"
 * và "giờ làm sao". Trước đây màn hình chỉ có hai nhánh: thử lại được thì bảo thử lại, còn
 * lại thì bảo "bạn cần nâng cấp gói" — nên Groq chặn vì token cũng bị đổ tội cho gói dịch
 * vụ. Chọn câu theo MÃ LỖI, không theo mỗi cờ retryable.  #Huynh
 */
export function getAiJobErrorAdvice(job: AiJob | undefined): string {
  const code = typeof job?.error?.code === "string" ? job.error.code : "";

  if (code === "SUBSCRIPTION_REQUIRED") {
    return "Vào mục Gói dịch vụ để nâng cấp, hoặc nhờ quản trị viên kích hoạt gói có AI.";
  }
  if (code === "RATE_LIMITED") {
    return "Hạn mức làm mới vào kỳ sau. Cần dùng ngay thì nâng gói ở mục Gói dịch vụ.";
  }
  if (code === "AI_PROVIDER_ERROR") {
    return isAiJobErrorRetryable(job)
      ? 'Đây là lỗi phía nhà cung cấp AI, không phải gói của bạn. Chờ một lát rồi bấm "Đánh giá lại".'
      : "Đây là lỗi cấu hình dịch vụ AI, không phải gói của bạn. Hãy báo quản trị viên kiểm tra mục Cấu hình AI.";
  }
  if (isAiJobErrorRetryable(job)) {
    return 'Bạn thử bấm "Đánh giá lại" sau ít phút. Nếu vẫn lỗi, hãy báo cho quản trị viên.';
  }
  return "Hãy báo cho quản trị viên kèm nội dung lỗi ở trên để kiểm tra.";
}
