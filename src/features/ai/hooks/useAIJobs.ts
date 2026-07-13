import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelAiJob,
  createAiJob,
  getAiJob,
  isTerminal,
  listAiJobs,
  type AiJob,
  type AiJobEntityType,
  type AiJobType,
  type CreateAiJobPayload,
} from "@/services/aiJobsService";

const POLL_INTERVAL_MS = 2_000;

export const aiJobKeys = {
  all: ["ai-jobs"] as const,
  detail: (jobId: string) => ["ai-jobs", "detail", jobId] as const,
  byEntity: (entityType: AiJobEntityType, entityId: string) =>
    ["ai-jobs", "by-entity", entityType, entityId] as const,
};

/** POST /ai/jobs — trả về job_id ngay, worker chạy nền. */
export function useCreateAiJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAiJobPayload) => createAiJob(payload),
    onSuccess: (job) => {
      qc.setQueryData(aiJobKeys.detail(job.id), job);
      qc.invalidateQueries({ queryKey: aiJobKeys.byEntity(job.entity_type, job.entity_id) });
    },
  });
}

/**
 * Poll một job cho tới khi nó kết thúc.
 *
 * `refetchInterval` trả về `false` khi status là terminal → React Query tự dừng
 * poll. Không cần setInterval hay cleanup thủ công, và không bị rò rỉ timer khi
 * component unmount giữa chừng.
 */
export function useAiJob(jobId: string | undefined) {
  return useQuery({
    queryKey: aiJobKeys.detail(jobId ?? ""),
    queryFn: () => getAiJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const job = query.state.data as AiJob | undefined;
      if (!job) return POLL_INTERVAL_MS;
      return isTerminal(job.status) ? false : POLL_INTERVAL_MS;
    },
    // Job chạy nền — vẫn phải poll kể cả khi user chuyển sang tab khác, không thì
    // quay lại sẽ thấy trạng thái cũ mèm.
    refetchIntervalInBackground: true,
  });
}

/**
 * Job mới nhất của một entity — đây là thứ giúp job SỐNG SÓT QUA F5.
 *
 * Mở lại trang deal sau khi reload, FE hỏi BE "deal này có job nào không?" thay vì
 * dựa vào state trong bộ nhớ (vốn đã bay sạch).
 */
export function useLatestAiJobForEntity(
  entityType: AiJobEntityType,
  entityId: string | undefined,
  type?: AiJobType
) {
  return useQuery({
    queryKey: aiJobKeys.byEntity(entityType, entityId ?? ""),
    queryFn: async () => {
      const jobs = await listAiJobs({ entity_type: entityType, entity_id: entityId! });
      const filtered = type ? jobs.filter((j) => j.type === type) : jobs;
      // BE trả mới nhất trước; vẫn sắp lại cho chắc, không phụ thuộc thứ tự của BE.
      return (
        [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
      );
    },
    enabled: Boolean(entityId),
  });
}

/**
 * Mọi job CHƯA kết thúc của người dùng — đây là thứ làm job SỐNG SÓT QUA F5.
 *
 * Reload xong, state trong bộ nhớ bay sạch và không panel nào còn mở, nên không
 * có gì tự hỏi lại backend. Task Center dùng query này để dựng lại danh sách job
 * đang chạy, rồi tiếp tục poll như chưa hề reload.
 */
export function useRecentAiJobs(enabled = true) {
  return useQuery({
    queryKey: [...aiJobKeys.all, "recent"],
    queryFn: () => listAiJobs({ page_size: 20 }),
    enabled,
    // Lấy cả job đã kết thúc, không chỉ job đang chạy: nếu chỉ lấy job đang chạy
    // thì lúc job xong nó biến mất khỏi danh sách và ta không bao giờ biết nó
    // thành công hay thất bại.
    //
    // CHỈ poll khi còn job chưa xong. Trước đây tôi để poll mãi mãi 2 giây một lần
    // kể cả lúc không có job nào — mở Network là thấy `jobs?page_size=20` gọi liên
    // tục, tốn băng thông và pin vô ích.
    refetchInterval: (query) => {
      const jobs = query.state.data as AiJob[] | undefined;
      if (!jobs) return POLL_INTERVAL_MS;
      return jobs.some((j) => !isTerminal(j.status)) ? POLL_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Các job AI đã chạy cho một deal — dùng để xem lại kết quả cũ.
 *
 * Kết quả AI nằm trên backend (cột `result` của job), nên F5 hay đổi máy vẫn xem
 * lại được. Trước đây kết quả chỉ sống trong bộ nhớ của trình duyệt: reload xong
 * là mất, không có cách nào mò lại.
 */
export function useAiJobsForEntity(
  entityType: AiJobEntityType,
  entityId: string | undefined,
  type?: AiJobType
) {
  return useQuery({
    queryKey: aiJobKeys.byEntity(entityType, entityId ?? ""),
    queryFn: async () => {
      const jobs = await listAiJobs({ entity_type: entityType, entity_id: entityId! });
      const filtered = type ? jobs.filter((j) => j.type === type) : jobs;
      return [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    enabled: Boolean(entityId),
  });
}

/** POST /ai/jobs/{id}/cancel — best-effort, worker có thể vẫn đang chạy dở. */
export function useCancelAiJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelAiJob(jobId),
    onSuccess: (job) => {
      qc.setQueryData(aiJobKeys.detail(job.id), job);
      qc.invalidateQueries({ queryKey: aiJobKeys.byEntity(job.entity_type, job.entity_id) });
    },
  });
}
