import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Types — mirror openapi.yaml schemas
// ---------------------------------------------------------------------------

export type ProposalStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "superseded";

export type ProposalTimelineMilestone = {
  title?: string;
  due_date?: string;
};

export type ProposalPricingLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export type ProposalContentDTO = {
  title?: string;
  executive_summary?: string;
  scope_of_work?: string;
  // FE lưu bản rich text đã chỉnh để nội dung gửi đi khớp với những gì Freelancer thấy trên màn hình.
  rendered_html?: string;
  html?: string;
  timeline?: {
    start_date?: string;
    end_date?: string;
    milestones?: ProposalTimelineMilestone[];
  };
  pricing?: {
    line_items?: ProposalPricingLineItem[];
    total?: number;
    currency?: string;
  };
  terms?: {
    payment_terms?: string;
    revision_policy?: string;
    ip_ownership?: string;
  };
  notes?: string;
};

export type ProposalResponse = {
  id: string;
  deal_id: string;
  owner_user_id: string;
  version_number: number;
  status: ProposalStatus;
  content: ProposalContentDTO;
  share_token: string | null;
  share_expires_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedProposals = {
  success: boolean;
  code: number;
  timestamp: string;
  data: ProposalResponse[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type ProposalListFilters = {
  deal_id?: string;
  status?: ProposalStatus;
  ai_generated?: boolean;
  from_date?: string;
  to_date?: string;
  sort_by?: "created_at" | "sent_at" | "version_number";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export type ProposalGenerationResponse = {
  proposal_id: string;
  content: ProposalContentDTO;
  generation_id: string;
};

export type AiProposalRequest = {
  deal_id: string;
  client_name: string;
  company_name?: string;
  project_type: string;
  project_description: string;
  estimated_scope?: string;
  budget?: string;
  urgency?: string;
  service_category: string;
  pricing_tier: string;
  freelancer_name: string;
};

export type ProposalDecisionStatus = "accepted" | "rejected" | "expired";

export type UpdateProposalPayload = {
  deal_id: string;
  content: ProposalContentDTO;
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /proposals — list proposals with optional filters. */
export async function listProposals(
  filters?: ProposalListFilters
): Promise<PaginatedProposals> {
  const { data } = await axiosClient.get<PaginatedProposals>("/proposals", {
    params: filters,
  });
  return data;
}

/** POST /proposals — create a proposal draft linked to a deal. */
export async function createProposal(payload: {
  deal_id: string;
  content?: ProposalContentDTO;
}): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    "/proposals",
    payload
  );
  return data.data;
}

/** GET /proposals/{id} — get proposal detail. */
export async function getProposal(proposalId: string): Promise<ProposalResponse> {
  const { data } = await axiosClient.get<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}`
  );
  return data.data;
}

/** PATCH /proposals/{id} — update proposal content (draft only). */
export async function updateProposal(
  proposalId: string,
  payload: UpdateProposalPayload
): Promise<ProposalResponse> {
  // Backend hiện validate deal_id khi PATCH dù openapi.yaml chưa khai báo field này trong UpdateProposalRequest.
  const { data } = await axiosClient.patch<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}`,
    payload
  );
  return data.data;
}

/** DELETE /proposals/{id} — delete a draft proposal. */
export async function deleteProposal(proposalId: string): Promise<void> {
  await axiosClient.delete(`/proposals/${proposalId}`);
}

/**
 * GET /proposals/{id}/pdf — BE render PDF (WeasyPrint) và trả file đính kèm.
 * Trả blob thay vì tự tải để component quyết định tên file và thời điểm tải.
 */
export async function getProposalPdf(proposalId: string): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>(`/proposals/${proposalId}/pdf`, {
    responseType: "blob",
  });
  return data;
}

/** Đẩy blob PDF xuống máy người dùng bằng một thẻ <a download> tạm. */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** POST /proposals/{id}/send — lock content and send share link to client. */
export async function sendProposal(proposalId: string): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}/send`
  );
  return data.data;
}

/** PATCH /proposals/{id}/status - Freelancer ghi nhận phản hồi của khách bên ngoài SoloDesk. */
export async function transitionProposalStatus(
  proposalId: string,
  status: ProposalDecisionStatus
): Promise<ProposalResponse> {
  const { data } = await axiosClient.patch<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}/status`,
    { status }
  );
  return data.data;
}

/**
 * POST /proposals/{id}/generate — AI-fill an existing draft proposal.
 * Synchronous — returns the updated proposal immediately. Requires AI subscription.
 */
export async function generateProposalContent(
  proposalId: string
): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}/generate`
  );
  return data.data;
}

/** POST /proposals/generate-from-deal/{dealId} - tạo draft báo giá AI trực tiếp từ Deal. */
export async function generateProposalFromDeal(dealId: string): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    `/proposals/generate-from-deal/${dealId}`
  );
  return data.data;
}

/**
 * POST /proposals/ai-generate — AI-generate and create a proposal for a deal.
 * Backend uses Gemini AI. Returns a full ProposalResponse (id + content).
 */
export async function aiGenerateProposal(
  payload: AiProposalRequest
): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    "/proposals/ai-generate",
    payload
  );
  return data.data;
}
