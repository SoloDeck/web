import { create } from "zustand";

export type AIJobKind = "deal_qualification" | "proposal_generation" | "contract_generation";
export type AIJobStatus = "running" | "success" | "error";

export type AIJob = {
  id: string;
  kind: AIJobKind;
  title: string;
  description: string;
  status: AIJobStatus;
  entityLabel?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * `true` khi `id` là job_id THẬT của backend (`POST /ai/jobs`) → huỷ được bằng API.
   *
   * Còn để `false`/bỏ trống là job chỉ tồn tại trên giao diện (ví dụ báo giá: BE
   * đang hỏng nên FE vẫn tự chế id). Huỷ mấy cái đó chỉ có tác dụng ẩn khỏi màn
   * hình — gọi API sẽ 404.
   */
  remote?: boolean;
};

type UpsertAIJobInput = Omit<AIJob, "createdAt" | "updatedAt"> & Partial<Pick<AIJob, "createdAt" | "updatedAt">>;

type AIActivityState = {
  jobs: AIJob[];
  viewRequestId: string | null;
  cancelledJobIds: string[];
  dismissedJobIds: string[];
  upsertJob: (job: UpsertAIJobInput) => void;
  updateJob: (id: string, patch: Partial<Omit<AIJob, "id" | "createdAt">>) => void;
  removeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  clearFinished: () => void;
  requestView: (id: string) => void;
  consumeViewRequest: (id: string) => void;
  isJobCancelled: (id: string) => boolean;
  /** Job đã bị người dùng ẩn đi — đừng dựng lại sau F5. */
  isJobDismissed: (id: string) => boolean;
};

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Ghi nhớ những job người dùng đã ẩn đi.
//
// Phải BỀN (localStorage), không chỉ nằm trong bộ nhớ: trước đây bấm X ẩn thẻ job
// xong F5 là nó hiện lại — vì Task Center dựng lại job từ backend mà không biết
// người dùng đã dọn nó rồi. Rất khó chịu.
//
// Đây là trạng thái GIAO DIỆN ("có nên hiện thẻ này không"), khác hẳn `status` của
// backend (vòng đời job: queued → running → succeeded...). Không nhét chung được:
// một job vừa `succeeded` vừa "chưa xem" thì ghi vào một cột là gì? Nên nó thuộc về
// FE, và localStorage là đúng chỗ.
// ---------------------------------------------------------------------------
const DISMISSED_KEY = "solodesk.ai.dismissedJobs.v1";
const DISMISSED_LIMIT = 50;

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-DISMISSED_LIMIT)));
  } catch {
    /* trình duyệt chặn storage — cùng lắm là job hiện lại sau F5, không vỡ gì */
  }
}

export const useAIActivityStore = create<AIActivityState>((set, get) => ({
  jobs: [],
  viewRequestId: null,
  cancelledJobIds: [],
  dismissedJobIds: loadDismissed(),
  upsertJob: (job) =>
    set((state) => {
      const current = state.jobs.find((item) => item.id === job.id);
      const nextJob: AIJob = {
        ...current,
        ...job,
        createdAt: current?.createdAt ?? job.createdAt ?? nowIso(),
        updatedAt: job.updatedAt ?? nowIso(),
      };

      return {
        jobs: [nextJob, ...state.jobs.filter((item) => item.id !== job.id)].slice(0, 8),
        cancelledJobIds: state.cancelledJobIds.filter((id) => id !== job.id),
      };
    }),
  updateJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              ...patch,
              updatedAt: nowIso(),
            }
          : job
      ),
    })),
  removeJob: (id) =>
    set((state) => {
      // Ghi nhớ BỀN rằng job này đã bị ẩn, không thì F5 xong nó lại hiện lên.
      const dismissed = state.dismissedJobIds.includes(id)
        ? state.dismissedJobIds
        : [...state.dismissedJobIds, id].slice(-DISMISSED_LIMIT);
      saveDismissed(dismissed);

      return {
        jobs: state.jobs.filter((job) => job.id !== id),
        viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
        dismissedJobIds: dismissed,
      };
    }),
  cancelJob: (id) =>
    set((state) => {
      const dismissed = state.dismissedJobIds.includes(id)
        ? state.dismissedJobIds
        : [...state.dismissedJobIds, id].slice(-DISMISSED_LIMIT);
      saveDismissed(dismissed);

      return {
        jobs: state.jobs.filter((job) => job.id !== id),
        viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
        cancelledJobIds: state.cancelledJobIds.includes(id)
          ? state.cancelledJobIds
          : [...state.cancelledJobIds, id].slice(-20),
        dismissedJobIds: dismissed,
      };
    }),
  clearFinished: () =>
    set((state) => {
      const finished = state.jobs.filter((job) => job.status !== "running").map((j) => j.id);
      const dismissed = [...new Set([...state.dismissedJobIds, ...finished])].slice(
        -DISMISSED_LIMIT
      );
      saveDismissed(dismissed);

      return {
        jobs: state.jobs.filter((job) => job.status === "running"),
        dismissedJobIds: dismissed,
      };
    }),
  requestView: (id) => set({ viewRequestId: id }),
  consumeViewRequest: (id) =>
    set((state) => ({
      viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
    })),
  isJobCancelled: (id) => get().cancelledJobIds.includes(id),
  isJobDismissed: (id) => get().dismissedJobIds.includes(id),
}));
