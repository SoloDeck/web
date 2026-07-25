import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { TermTemplateOption } from "@/services/proposalsService";

/** GET /contracts/term-templates — mẫu điều khoản hợp đồng theo nghề của freelancer. */
export async function listContractTermTemplates(): Promise<TermTemplateOption[]> {
  const { data } = await axiosClient.get<ApiResponse<TermTemplateOption[]>>(
    "/contracts/term-templates"
  );
  return data.data ?? [];
}

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

/** POST /contracts — create a contract draft. */
export async function createContract(payload: {
  deal_id: string;
  client_id: string;
  proposal_id?: string;
  content: ContractContentDTO;
  effective_date?: string;
  end_date?: string;
}): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    "/contracts",
    payload
  );
  return data.data;
}

/**
 * GET /contracts/{id}/preview — HTML xem trước, CHÍNH XÁC bản hợp đồng khách sẽ nhận/ký.
 *
 * Frontend nhúng HTML này vào iframe thay vì tự đổ từng trường thô. Cùng một template với
 * bản PDF ở backend nên hai bên KHÔNG THỂ lệch — đó là gốc khiến tờ hợp đồng trên màn hình
 * trước đây trông sơ sài, không giống hợp đồng thật. Cùng khuôn với getProposalPreview.  #Huynh
 */
export async function getContractPreview(
  contractId: string,
  /** Bản nháp truyền true: render thêm ô rỗng cho điều khoản chưa có, để sửa tại chỗ. */
  editable = false
): Promise<string> {
  const { data } = await axiosClient.get<ApiResponse<{ html: string }>>(
    `/contracts/${contractId}/preview`,
    { params: editable ? { editable: true } : undefined }
  );
  return data.data?.html ?? "";
}

/**
 * GET /contracts/{id}/pdf — tải PDF hợp đồng (render đồng bộ, weasyprint) để gửi khách.
 * Cùng document với bản xem trước nên PDF = đúng thứ trên màn hình.  #Huynh
 */
export async function downloadContractPdf(contractId: string): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>(`/contracts/${contractId}/pdf`, {
    responseType: "blob",
  });
  return data;
}

/** GET /contracts/{id} — get contract detail. */
export async function getContract(contractId: string): Promise<ContractResponse> {
  const { data } = await axiosClient.get<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}`
  );
  return data.data;
}

/**
 * PATCH /contracts/{id} — update contract content (draft only).
 *
 * Backend `ContractRequest` BẮT BUỘC cả deal_id/proposal_id/client_id (service chỉ dùng
 * `content`, nhưng schema vẫn đòi đủ) — thiếu là 422. Nên payload phải mang theo các id
 * lấy thẳng từ chính contract.  #Huynh
 */
export async function updateContract(
  contractId: string,
  payload: {
    deal_id: string;
    proposal_id: string;
    client_id: string;
    content: ContractContentDTO;
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
 * Freelancer GHI NHẬN rằng khách đã ký — hợp đồng chuyển sang `active`.
 *
 * Khách của freelancer KHÔNG có tài khoản SoloDesk, nên họ ký ngoài hệ thống (giấy, scan,
 * Zalo) và freelancer vào đánh dấu lại. SoloDesk là SỔ THEO DÕI, không phải nền tảng chữ
 * ký số — đừng gọi đây là "khách ký", nó không xác thực danh tính ai cả.
 *
 * Thay cho `signContractAsClient()` cũ gọi `/contracts/public/{token}/sign` — endpoint đó
 * KHÔNG TỒN TẠI trên backend (curl trả 404). Code chết, và là bẫy cho người sửa sau.  #Huynh
 */
export async function recordClientSignature(contractId: string): Promise<ContractResponse> {
  const { data } = await axiosClient.patch<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/status`,
    { status: "active" }
  );
  return data.data;
}

/**
 * POST /contracts/{id}/generate — AI-fill content into a draft contract.
 * Synchronous — returns updated contract immediately. Requires AI subscription.
 */
export async function generateContractContent(
  contractId: string,
  templateId?: string | null
): Promise<ContractResponse> {
  const { data } = await axiosClient.post<ApiResponse<ContractResponse>>(
    `/contracts/${contractId}/generate`,
    undefined,
    { params: templateId ? { template_id: templateId } : undefined }
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
