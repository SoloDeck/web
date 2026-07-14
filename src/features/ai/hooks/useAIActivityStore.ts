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
  /** id của deal mà job này thuộc về — để mở lại đúng panel khi bấm "Xem". */
  entityId?: string;
  /** Kết quả job đã tạo ra (ví dụ proposal_id) — mở lại thì nạp bản này, không sinh bản mới. */
  resultId?: string;
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

/**
 * Panel AI nào đang mở, cho deal nào.
 *
 * Trước đây AIPanel và ProposalModal được mount NGAY TRONG trang chi tiết deal. Hậu quả:
 * đứng ở bảng Kanban bấm "Xem" trên thẻ job thì không có gì xảy ra — panel của deal đó
 * còn chưa được dựng. Tệ hơn, trang chi tiết mở panel theo `viewRequestId` mà KHÔNG xét
 * loại job, nên bấm "Tạo Báo Giá AI" lại bật ra cửa sổ "Đánh giá deal bằng AI".
 *
 * Giờ panel sống ở tầng gốc (__root) và được điều khiển qua store này, nên bấm ở đâu
 * cũng mở được.  #Huynh
 */
export type AIPanelRequest = {
  kind: AIJobKind;
  dealId: string;
  /** Có = mở để XEM LẠI job cũ. Không có = chạy job MỚI. */
  jobId?: string;
  /** Báo giá đã tạo sẵn — mở để xem thì nạp lại bản này, không sinh bản mới. */
  proposalId?: string;
  /**
   * Mốc thời điểm của LẦN MỞ này.
   *
   * Cần thiết vì thu nhỏ KHÔNG xoá panel khỏi store (người dùng phải mở lại được).
   * Bấm "Xem" lần nữa mà store set lại y nguyên giá trị cũ thì không có gì đổi, panel
   * vẫn giữ cờ thu nhỏ của nó → bấm hoài không lên. Đổi mốc này là báo cho panel biết
   * "đây là một lần mở MỚI, bung ra đi".  #Huynh
   */
  openedAt: number;
};

type AIActivityState = {
  jobs: AIJob[];
  viewRequestId: string | null;
  /** Panel đang mở (toàn cục). */
  panel: AIPanelRequest | null;
  cancelledJobIds: string[];
  dismissedJobIds: string[];
  upsertJob: (job: UpsertAIJobInput) => void;
  updateJob: (id: string, patch: Partial<Omit<AIJob, "id" | "createdAt">>) => void;
  removeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  clearFinished: () => void;
  requestView: (id: string) => void;
  consumeViewRequest: (id: string) => void;
  /** Mở panel AI (chạy job mới hoặc xem lại job cũ). `openedAt` do store tự đặt. */
  openPanel: (request: Omit<AIPanelRequest, "openedAt">) => void;
  closePanel: () => void;
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
  panel: null,
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
  // Bấm "Xem" trên thẻ job: tra ra job đó thuộc loại gì, của deal nào, rồi mở đúng
  // panel. Trước đây chỉ ghi một cái id rồi hy vọng có ai đó đang lắng nghe.
  requestView: (id) =>
    set((state) => {
      const job = state.jobs.find((item) => item.id === id);
      if (!job?.entityId) return { viewRequestId: id };

      return {
        viewRequestId: id,
        panel: {
          kind: job.kind,
          dealId: job.entityId,
          jobId: job.id,
          proposalId: job.resultId,
          openedAt: Date.now(),
        },
      };
    }),

  openPanel: (request) => set({ panel: { ...request, openedAt: Date.now() } }),
  closePanel: () => set({ panel: null, viewRequestId: null }),
  consumeViewRequest: (id) =>
    set((state) => ({
      viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
    })),
  isJobCancelled: (id) => get().cancelledJobIds.includes(id),
  isJobDismissed: (id) => get().dismissedJobIds.includes(id),
}));
