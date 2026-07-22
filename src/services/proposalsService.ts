import axiosClient from "@/configs/axios";
import type { PricingDetail } from "@/features/deals/proposalHtml";
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

  /**
   * Khối định giá — PHẢI giữ lại khi lưu bản nháp.
   *
   * Trước đây `normalizeProposalContentForApi()` chuyển nội dung AI sang shape DTO này và
   * VỨT LUÔN `pricing_detail`. Ba hậu quả dây chuyền:
   *
   *   1. Mở lại báo giá -> không còn bảng định giá, không chỉnh được giá nữa.
   *   2. BE mất `pricing_detail` -> luật "chưa chốt giá thì không gửi" BỊ VÔ HIỆU. Tự tay
   *      chọc thủng chính cái luật mình vừa dựng.
   *   3. Bảng hạng mục và dòng "Tổng báo giá" lấy từ hai nguồn khác nhau -> CỘNG KHÔNG RA
   *      TỔNG (22 + 16,5 + 16,5 = 55 triệu, mà tổng ghi 49 triệu).
   *
   * `content` bên BE là JSONB tự do nên thêm trường này không đụng gì tới hợp đồng API.
   * #Huynh
   */
  pricing_detail?: PricingDetail | null;

  /**
   * Sản phẩm bàn giao và phạm vi KHÔNG bao gồm — cũng PHẢI giữ lại khi lưu, y hệt
   * `pricing_detail` ở trên.
   *
   * Cùng một lỗi, lặp lại lần hai: `normalizeProposalContentForApi()` chuyển nội dung AI
   * sang shape DTO này mà DTO không có chỗ chứa hai trường đó, nên chúng bị VỨT ÂM THẦM.
   * Hậu quả: AI soạn xong, mục "6. Sản Phẩm Bàn Giao" hiện đầy đủ; người dùng sửa MỘT chữ
   * rồi lưu -> mục đó RỖNG trong bản gửi khách. Không có gì báo, vì BE đọc
   * `content.get("deliverables")` và thiếu khoá thì trả về danh sách rỗng chứ không nổ.
   *
   * `content` bên BE là JSONB tự do nên thêm trường không đụng gì tới hợp đồng API.  #Huynh
   */
  deliverables?: string[];
  out_of_scope?: string[];

  /**
   * Hạn hiệu lực freelancer tự đặt, ISO "2026-08-31".
   *
   * Cùng một cái bẫy, lần thứ BA (sau `pricing_detail`, rồi `deliverables`): DTO liệt kê
   * từng khoá một, nên khoá nào không có tên ở đây là `normalizeProposalContentForApi()`
   * VỨT im lặng. TypeScript không cứu được vì hàm đó dựng một object literal đúng kiểu —
   * thiếu khoá không phải lỗi kiểu.  #Huynh
   */
  valid_until?: string;
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

/**
 * Hạn chờ RIÊNG cho các lệnh gọi AI. Mặc định của axios là 15s — hợp lý cho CRUD, nhưng quá
 * ngắn cho một lệnh gọi mô hình ngôn ngữ.
 *
 * Đo thật: bản thân lệnh gọi Groq chỉ mất ~1,4s. Nhưng SDK của Groq MẶC ĐỊNH tự thử lại 2
 * lần khi bị nghẽn (không ai đặt `max_retries`), mỗi lần có giãn cách — nên lúc Groq đông,
 * MỘT request hoàn toàn có thể vượt 15s.
 *
 * Vượt là axios ném lỗi KHÔNG có `status`. Mà điều kiện thử lại ở ProposalModal lại là
 * `!status || status >= 500` — nên nó tưởng hỏng và gọi lại, TRONG KHI server vẫn đang chạy
 * và sẽ chạy XONG: ghi tiền, trừ hạn mức, tạo hẳn một bản báo giá. Ta không bao giờ nghe
 * thấy kết quả đó, nên lại gọi tiếp. Kết quả: đợi mãi, hoá đơn nhân đôi, và "Tài liệu" cầm
 * hai bản báo giá — đúng lỗi đã bị báo.  #Huynh
 */
const AI_TIMEOUT_MS = 60_000;

/** POST /proposals/generate-from-deal/{dealId} - tạo draft báo giá AI trực tiếp từ Deal. */
export async function generateProposalFromDeal(dealId: string): Promise<ProposalResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProposalResponse>>(
    `/proposals/generate-from-deal/${dealId}`,
    undefined,
    { timeout: AI_TIMEOUT_MS }
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
    payload,
    { timeout: AI_TIMEOUT_MS }
  );
  return data.data;
}


/**
 * PATCH /proposals/{id}/price — freelancer CHỐT giá cuối cùng.
 *
 * Bộ định giá chỉ đề xuất một KHOẢNG. Con số gửi cho khách phải do con người quyết — đó là
 * ranh giới của cả tính năng: AI hỗ trợ, không thay mặt. Backend chặn gửi báo giá khi chưa
 * chốt (409).  #Huynh
 */
export async function setProposalPrice(
  proposalId: string,
  price: number
): Promise<ProposalResponse> {
  const { data } = await axiosClient.patch<ApiResponse<ProposalResponse>>(
    `/proposals/${proposalId}/price`,
    { price }
  );
  return data.data;
}


/**
 * GET /proposals/{id}/preview — HTML xem trước, CHÍNH XÁC bản PDF khách sẽ nhận.
 *
 * Frontend nhúng HTML này vào card (iframe) thay vì tự dựng lại bằng `backendContentToHtml`.
 * Cùng một template với PDF ở backend nên hai bên KHÔNG THỂ lệch — đó là gốc khiến bản trên
 * màn hình trước đây khác bản tải về, nhìn như lừa đảo.  #Huynh
 */
export async function getProposalPreview(proposalId: string): Promise<string> {
  const { data } = await axiosClient.get<ApiResponse<{ html: string }>>(
    `/proposals/${proposalId}/preview`
  );
  return data.data?.html ?? "";
}

/**
 * GET /proposals/{id}/pdf — tải PDF báo giá (render weasyprint) để gửi khách. Cùng document
 * với bản xem trước nên PDF = đúng thứ trên màn hình.  #Huynh
 */
export async function downloadProposalPdf(proposalId: string): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>(`/proposals/${proposalId}/pdf`, {
    responseType: "blob",
  });
  return data;
}
