import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Types — mirror openapi.yaml schemas
// ---------------------------------------------------------------------------

export type ContractStatus =
  | "draft"
  | "pending_signatures"
  | "active"
  | "completed"
  | "terminated"
  | "expired";

export type ContractPartiesDTO = {
  freelancer?: {
    name?: string;
    email?: string;
    business_name?: string;
  };
  client?: {
    name?: string;
    email?: string;
    address?: string;
  };
};

export type ContractContentDTO = {
  parties?: ContractPartiesDTO;
  scope_of_work?: string;
  payment_terms?: string;
  revision_policy?: string;
  ip_ownership?: string;
  termination_clause?: string;
  governing_law?: string;
  custom_clauses?: string | null;
};

export type ContractResponse = {
  id: string;
  deal_id: string;
  proposal_id: string;
  client_id: string;
  owner_user_id: string;
  version_number: number;
  status: ContractStatus;
  content: ContractContentDTO;
  signed_by_freelancer_at: string | null;
  signed_by_client_at: string | null;
  effective_date: string | null;
  end_date: string | null;
  share_token: string | null;
  parent_contract_id: string | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedContracts = {
  success: boolean;
  code: number;
  timestamp: string;
  data: ContractResponse[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type ContractListFilters = {
  deal_id?: string;
  client_id?: string;
  status?: ContractStatus;
  from_date?: string;
  to_date?: string;
  sort_by?: "created_at" | "effective_date" | "end_date";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export type PaymentMilestoneResponse = {
  id: string;
  contract_id: string;
  description: string;
  amount: number;
  due_date: string | null;
  invoice_id: string | null;
  sort_order: number;
  created_at: string;
};

export type ContractGenerationResponse = {
  contract_id: string;
  content: ContractContentDTO;
  generation_id: string;
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /contracts — list contracts with optional filters. */
export async function listContracts(
  filters?: ContractListFilters
): Promise<PaginatedContracts> {
  const { data } = await axiosClient.get<PaginatedContracts>("/contracts", {
    params: filters,
  });
  return data;
}

/** POST /contracts — create a contract from an accepted proposal. */
export async function createContract(payload: {
  proposal_id: string;
  content?: ContractContentDTO;
  effective_date?: string;
  end_date?: string;
}): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    "/contracts",
    payload
  );
  return data.data;
}

/** GET /contracts/{id} — get contract detail. */
export async function getContract(contractId: string): Promise<ContractResponse> {
  const { data } = await axiosClient.get<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}`
  );
  return data.data;
}

/** PATCH /contracts/{id} — update contract content (draft only). */
export async function updateContract(
  contractId: string,
  payload: {
    content?: ContractContentDTO;
    effective_date?: string;
    end_date?: string;
  }
): Promise<ContractResponse> {
  const { data } = await axiosClient.patch<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}`,
    payload
  );
  return data.data;
}

/** POST /contracts/{id}/send — move to pending_signatures and generate share link. */
export async function sendContract(contractId: string): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/send`
  );
  return data.data;
}

/** POST /contracts/{id}/sign — record freelancer signature. */
export async function signContract(contractId: string): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/sign`
  );
  return data.data;
}

/**
 * POST /contracts/{id}/generate — AI-fill content into a draft contract.
 * Synchronous — returns updated contract immediately. Requires AI subscription.
 */
export async function generateContractContent(
  contractId: string
): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/generate`
  );
  return data.data;
}

/**
 * POST /ai/contracts/generate — AI-generate contract content.
 * Synchronous — returns generated content immediately. Requires AI subscription.
 */
export async function aiGenerateContract(payload: {
  contract_id: string;
  template_id?: string;
  language?: "vi" | "en";
}): Promise<ContractGenerationResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractGenerationResponse>>(
    "/ai/contracts/generate",
    { language: "vi", ...payload }
  );
  return data.data;
}

/** POST /contracts/{id}/amend — create an amendment (new version) of an active contract. */
export async function amendContract(
  contractId: string,
  payload: {
    content?: ContractContentDTO;
    effective_date?: string;
    end_date?: string;
  }
): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/amend`,
    payload
  );
  return data.data;
}

/** POST /contracts/{id}/terminate — terminate a contract (terminal state). */
export async function terminateContract(
  contractId: string,
  reason: string
): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/terminate`,
    { reason }
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

/** GET /contracts/{id}/milestones — list payment milestones. */
export async function listMilestones(
  contractId: string
): Promise<PaymentMilestoneResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<PaymentMilestoneResponse[]>>(
    `/contracts/${contractId}/milestones`
  );
  return data.data;
}

/** POST /contracts/{id}/milestones — add a milestone (draft contract only). */
export async function addMilestone(
  contractId: string,
  payload: {
    description: string;
    amount: number;
    due_date?: string;
    sort_order?: number;
  }
): Promise<PaymentMilestoneResponse> {
  const { data } = await axiosClient.post<ApiResponse<PaymentMilestoneResponse>>(
    `/contracts/${contractId}/milestones`,
    payload
  );
  return data.data;
}

/** PATCH /contracts/{id}/milestones/{milestone_id} — update a milestone. */
export async function updateMilestone(
  contractId: string,
  milestoneId: string,
  payload: {
    description?: string;
    amount?: number;
    due_date?: string;
    sort_order?: number;
  }
): Promise<PaymentMilestoneResponse> {
  const { data } = await axiosClient.patch<ApiResponse<PaymentMilestoneResponse>>(
    `/contracts/${contractId}/milestones/${milestoneId}`,
    payload
  );
  return data.data;
}

/** DELETE /contracts/{id}/milestones/{milestone_id} — delete a milestone. */
export async function deleteMilestone(
  contractId: string,
  milestoneId: string
): Promise<void> {
  await axiosClient.delete(
    `/contracts/${contractId}/milestones/${milestoneId}`
  );
}
