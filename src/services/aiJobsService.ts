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
const AI_JOB_ERROR_MESSAGES: Record<string, string> = {
  SUBSCRIPTION_REQUIRED: "Gói của bạn chưa có tính năng AI. Hãy nâng cấp gói để dùng.",
  AI_QUOTA_EXCEEDED: "Đã dùng hết lượt AI trong kỳ này. Vào mục Gói đăng ký để xem hạn mức.",
  RATE_LIMITED: "Hệ thống AI đang bận. Bạn thử lại sau ít phút nhé.",
};

export function getAiJobErrorMessage(job: AiJob | undefined): string | null {
  if (!job?.error) return null;
  const code = typeof job.error.code === "string" ? job.error.code : "";
  if (code && AI_JOB_ERROR_MESSAGES[code]) return AI_JOB_ERROR_MESSAGES[code];
  const msg = job.error.message ?? job.error.detail;
  return typeof msg === "string" && msg.trim() ? msg : "AI xử lý thất bại.";
}

/**
 * Lỗi này có đáng thử lại không? Backend đánh dấu `retryable`: false cho lỗi do gói/hạn
 * mức (thử lại vô ích — phải nâng gói), true cho lỗi tạm (mạng, AI bận).
 */
export function isAiJobErrorRetryable(job: AiJob | undefined): boolean {
  return job?.error?.retryable === true;
}
