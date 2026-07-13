import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProposals,
  getProposal,
  createProposal,
  updateProposal,
  deleteProposal,
  sendProposal,
  transitionProposalStatus,
  generateProposalContent,
  generateProposalFromDeal,
  aiGenerateProposal,
  getProposalPdf,
  saveBlobAsFile,
} from "@/services/proposalsService";
import type { AiProposalRequest, ProposalDecisionStatus, ProposalListFilters, UpdateProposalPayload } from "@/services/proposalsService";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const proposalKeys = {
  all: ["proposals"] as const,
  list: (filters?: ProposalListFilters) => ["proposals", "list", filters] as const,
  detail: (id: string) => ["proposals", "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch paginated proposal list. Re-fetches whenever filters change. */
export function useProposalList(filters?: ProposalListFilters) {
  return useQuery({
    queryKey: proposalKeys.list(filters),
    queryFn: () => listProposals(filters),
  });
}

/** Fetch a single proposal by ID. */
export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: proposalKeys.detail(proposalId ?? ""),
    queryFn: () => getProposal(proposalId!),
    enabled: Boolean(proposalId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new proposal draft for a deal. */
export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/** Update content of a draft proposal. */
export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, payload }: { proposalId: string; payload: UpdateProposalPayload }) =>
      updateProposal(proposalId, payload),
    onSuccess: (_, { proposalId }) => {
      qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/** Delete a draft proposal. */
export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => deleteProposal(proposalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/** Tải báo giá dạng PDF do backend render. */
export function useDownloadProposalPdf() {
  return useMutation({
    mutationFn: async ({ proposalId, filename }: { proposalId: string; filename: string }) => {
      const blob = await getProposalPdf(proposalId);
      saveBlobAsFile(blob, filename);
    },
  });
}

/** Send proposal to client — locks content, generates share link. */
export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => sendProposal(proposalId),
    onSuccess: (_, proposalId) => {
      qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/** Freelancer ghi nhận khách đã chấp nhận/từ chối báo giá ở ngoài SoloDesk. */
export function useTransitionProposalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, status }: { proposalId: string; status: ProposalDecisionStatus }) =>
      transitionProposalStatus(proposalId, status),
    onSuccess: (_, { proposalId }) => {
      qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/**
 * AI-fill content into an existing draft proposal.
 * POST /proposals/{id}/generate — synchronous, no polling needed.
 */
export function useGenerateProposalContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => generateProposalContent(proposalId),
    onSuccess: (_, proposalId) => {
      qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/**
 * POST /proposals/generate-from-deal/{dealId} — để backend tự lấy Deal/Client/Profile.
 * Cách này bám nghiệp vụ hơn việc FE tự ráp payload AI.
 */
export function useGenerateProposalFromDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => generateProposalFromDeal(dealId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

/**
 * POST /proposals/ai-generate — AI-generate and create a proposal.
 * Returns ProposalResponse (id + content). Synchronous, no polling needed.
 */
export function useAiGenerateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AiProposalRequest) => aiGenerateProposal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}
