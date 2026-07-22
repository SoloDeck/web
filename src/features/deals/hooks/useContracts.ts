import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  sendContract,
  signContract,
  recordClientSignature,
  generateContractContent,
  amendContract,
  terminateContract,
  listMilestones,
  addMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/services/contractsService";
import type { ContractContentDTO, ContractListFilters } from "@/services/contractsService";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const contractKeys = {
  all: ["contracts"] as const,
  list: (filters?: ContractListFilters) => ["contracts", "list", filters] as const,
  detail: (id: string) => ["contracts", "detail", id] as const,
  milestones: (contractId: string) => ["contracts", "milestones", contractId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch paginated contract list. Re-fetches whenever filters change. */
export function useContractList(filters?: ContractListFilters) {
  return useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: () => listContracts(filters),
  });
}

/** Fetch a single contract by ID. */
export function useContract(contractId: string | undefined) {
  return useQuery({
    queryKey: contractKeys.detail(contractId ?? ""),
    queryFn: () => getContract(contractId!),
    enabled: Boolean(contractId),
  });
}

/** Fetch payment milestones for a contract. */
export function useMilestones(contractId: string | undefined) {
  return useQuery({
    queryKey: contractKeys.milestones(contractId ?? ""),
    queryFn: () => listMilestones(contractId!),
    enabled: Boolean(contractId),
  });
}

// ---------------------------------------------------------------------------
// Mutations — contract lifecycle
// ---------------------------------------------------------------------------

/** Create a contract from an accepted proposal. */
export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Update content of a draft contract. */
export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: string;
      payload: {
        deal_id: string;
        proposal_id: string;
        client_id: string;
        content: ContractContentDTO;
      };
    }) => updateContract(contractId, payload),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Send contract for signatures — locks content, generates share link. */
export function useSendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => sendContract(contractId),
    onSuccess: (_, contractId) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Record freelancer signature on a contract. */
export function useSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => signContract(contractId),
    onSuccess: (_, contractId) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Freelancer ghi nhận khách đã ký (hợp đồng -> active). Xem recordClientSignature(). */
export function useRecordClientSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => recordClientSignature(contractId),
    onSuccess: (_, contractId) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
      // Deal cũng đổi theo: có hợp đồng active thì mới mở được bước "Đang triển khai".
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

/**
 * AI-fill content into an existing draft contract.
 * POST /contracts/{id}/generate — synchronous, no polling needed.
 */
export function useGenerateContractContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => generateContractContent(contractId),
    onSuccess: (_, contractId) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}


/** Create an amendment (new version) of an active contract. */
export function useAmendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: string;
      payload: { content?: ContractContentDTO; effective_date?: string; end_date?: string };
    }) => amendContract(contractId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Terminate a contract (terminal state — cannot be reversed). */
export function useTerminateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, reason }: { contractId: string; reason: string }) =>
      terminateContract(contractId, reason),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — milestones
// ---------------------------------------------------------------------------

/** Add a payment milestone to a draft contract. */
export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: string;
      payload: { description: string; amount: number; due_date?: string; sort_order?: number };
    }) => addMilestone(contractId, payload),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: contractKeys.milestones(contractId) });
      // Lịch thanh toán được in vào chính tờ hợp đồng (bản render), nên đổi mốc phải
      // làm bản xem trước vẽ lại — nếu không, iframe hiện bản cũ còn panel hiện bản mới,
      // lại lệch.  #Huynh
      qc.invalidateQueries({ queryKey: ["contract-preview", contractId] });
    },
  });
}

/** Update a payment milestone. */
export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      milestoneId,
      payload,
    }: {
      contractId: string;
      milestoneId: string;
      payload: { description?: string; amount?: number; due_date?: string; sort_order?: number };
    }) => updateMilestone(contractId, milestoneId, payload),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: contractKeys.milestones(contractId) });
      qc.invalidateQueries({ queryKey: ["contract-preview", contractId] });
    },
  });
}

/** Delete a payment milestone. */
export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      milestoneId,
    }: {
      contractId: string;
      milestoneId: string;
    }) => deleteMilestone(contractId, milestoneId),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: contractKeys.milestones(contractId) });
      qc.invalidateQueries({ queryKey: ["contract-preview", contractId] });
    },
  });
}
