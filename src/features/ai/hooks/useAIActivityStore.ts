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
};

type UpsertAIJobInput = Omit<AIJob, "createdAt" | "updatedAt"> & Partial<Pick<AIJob, "createdAt" | "updatedAt">>;

type AIActivityState = {
  jobs: AIJob[];
  viewRequestId: string | null;
  cancelledJobIds: string[];
  upsertJob: (job: UpsertAIJobInput) => void;
  updateJob: (id: string, patch: Partial<Omit<AIJob, "id" | "createdAt">>) => void;
  removeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  clearFinished: () => void;
  requestView: (id: string) => void;
  consumeViewRequest: (id: string) => void;
  isJobCancelled: (id: string) => boolean;
};

function nowIso() {
  return new Date().toISOString();
}

export const useAIActivityStore = create<AIActivityState>((set, get) => ({
  jobs: [],
  viewRequestId: null,
  cancelledJobIds: [],
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
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
    })),
  cancelJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
      cancelledJobIds: state.cancelledJobIds.includes(id)
        ? state.cancelledJobIds
        : [...state.cancelledJobIds, id].slice(-20),
    })),
  clearFinished: () =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.status === "running"),
    })),
  requestView: (id) => set({ viewRequestId: id }),
  consumeViewRequest: (id) =>
    set((state) => ({
      viewRequestId: state.viewRequestId === id ? null : state.viewRequestId,
    })),
  isJobCancelled: (id) => get().cancelledJobIds.includes(id),
}));
