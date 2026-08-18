import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { Deal, LeadScore, Stage } from "@/features/deals/types";
import { formatVND } from "@/utils/format";

// ---------------------------------------------------------------------------
// Backend response shapes
// ---------------------------------------------------------------------------

type ApiDealResponse = {
  id: string;
  client_id: string;
  client_name?: string;
  title: string;
  stage: Stage;
  source: string | null;
  estimated_value: number | null;
  actual_value: number | null;
  currency: string;
  notes: string | null;
  desired_timeline?: string | null;
  /** Ngân sách KHÁCH nêu (được chấm điểm) — khác `estimated_value` là freelancer tự ước. */
  client_budget?: string | null;
  project_type?: string | null;
  service_category?: string | null;
  pricing_tier?: string | null;
  ai_qualification_score?: number | null;
  ai_qualification_recommendation?: string | null;
  created_at: string;
  updated_at: string;
  /** Ngày deal vào giai đoạn cuối. Backend vẫn trả sẵn, FE trước đây chưa khai. */
  closed_at?: string | null;
};

type ClientHint = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type PaginatedEnvelope<T> = {
  data: T[];
  pagination?: { total: number; page: number; page_size: number; total_pages: number };
};

type ApiIntakeResponse = {
  /** Phiếu thuộc deal nào. Null với phiếu cũ (tạo trước khi backend có cột này). */
  deal_id?: string | null;
  id: string;
  owner_user_id: string;
  client_id: string;
  inquiry_text: string | null;
  estimated_budget: string | null;
  desired_timeline: string | null;
  source: string | null;
  submitted_at: string;
  created_at: string;
};

export type DealPayload = {
  client_id: string;
  title: string;
  stage?: Stage;
  estimated_value?: number;
  actual_value?: number;
  notes?: string;
  /** Mốc thời gian KHÁCH nêu — vào khối chấm điểm của tiêu chí "Thời gian". */
  desired_timeline?: string;
  /** Ngân sách KHÁCH nêu — vào khối chấm điểm của tiêu chí "Ngân sách". */
  client_budget?: string;
  source?: string;
  project_type?: string | null;
  service_category?: string | null;
  pricing_tier?: string | null;
};

export type DealIntake = {
  id: string;
  ownerUserId: string;
  clientId: string;
  /** Phiếu thuộc deal nào. Null với phiếu cũ. */
  dealId: string | null;
  inquiryText: string;
  estimatedBudget: string;
  desiredTimeline: string;
  source: string | null;
  submittedAt: string;
  createdAt: string;
};

export type DealQualificationResult = {
  project_type?: string | null;
  budget_signal?: string | null;
  timeline_signal?: string | null;
  urgency_signal?: string | null;
  red_flags?: string[] | null;
  suggested_lead_score?: string | null;
  reasoning?: string | null;
  ai_qualification_score?: number | null;
  ai_qualification_recommendation?: string | null;
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapSourceToChannel(source: string | null): Deal["channel"] {
  if (!source) return "Zalo";
  const s = source.toLowerCase();
  if (s.includes("email")) return "Email";
  if (s.includes("facebook") || s.includes("fb")) return "Facebook";
  return "Zalo";
}

function mapScore(score: number | null | undefined): LeadScore {
  if (typeof score !== "number") return "warm";
  if (score >= 75) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

export function mapDeal(d: ApiDealResponse, clientMap: Map<string, ClientHint>): Deal {
  const client = clientMap.get(d.client_id);
  const clientName = d.client_name ?? client?.name ?? "Khách hàng";
  const value = Number(d.estimated_value ?? d.actual_value ?? 0);

  let paymentStatus: Deal["paymentStatus"] = "Chưa thanh toán";
  if (d.stage === "completed_and_billed") paymentStatus = "Đã thanh toán";
  else if (d.actual_value && d.actual_value > 0) paymentStatus = "Đã đặt cọc";

  return {
    id: d.id,
    clientId: d.client_id,
    client: clientName,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    projectType: d.title,
    closedAt: d.closed_at ?? null,
    value,
    score: mapScore(d.ai_qualification_score),
    stage: d.stage,
    contact: client
      ? [client.phone, client.email].filter(Boolean).join(" · ") || client.name
      : clientName,
    channel: mapSourceToChannel(d.source),
    source: d.source,
    serviceCategory: d.service_category ?? null,
    pricingTier: d.pricing_tier ?? null,
    aiQualificationScore: d.ai_qualification_score ?? null,
    aiQualificationRecommendation: d.ai_qualification_recommendation ?? null,
    createdAt: d.created_at.split("T")[0],
    updatedAt: d.updated_at,
    notes: d.notes ?? "",
    desiredTimeline: d.desired_timeline ?? "",
    clientBudget: d.client_budget ?? "",
    paymentStatus,
    paymentMethod: "—",
    history: [],
    tasks: [],
  };
}

/**
 * Tìm phiếu tiếp nhận của ĐÚNG một deal.
 *
 * Bug cũ (`createLatestIntakeByClient`): ghép theo client_id, lấy phiếu MỚI NHẤT của
 * khách. Một khách gửi Biểu mẫu tiếp nhận hai lần cho hai dự án khác nhau → hai deal,
 * cùng một client → deal cũ hiện mô tả, ngân sách, deadline của dự án MỚI.
 *
 * Backend dính đúng bug này ở tầng sâu hơn: AI chấm điểm và soạn báo giá bằng brief của
 * dự án SAI. Đã sửa và giờ trả về `deal_id`.
 *
 * Phiếu cũ chưa có `deal_id` → vẫn rơi về ghép theo client như trước.  #Huynh
 */
function findIntakeForDeal(
  intakes: DealIntake[],
  dealId: string,
  clientId: string
): DealIntake | undefined {
  const byDeal = intakes.find((intake) => intake.dealId === dealId);
  if (byDeal) return byDeal;

  return intakes.find((intake) => intake.dealId == null && intake.clientId === clientId);
}

function mapDealIntake(intake: ApiIntakeResponse): DealIntake {
  return {
    id: intake.id,
    ownerUserId: intake.owner_user_id,
    clientId: intake.client_id,
    dealId: intake.deal_id ?? null,
    inquiryText: intake.inquiry_text ?? "",
    estimatedBudget: intake.estimated_budget ?? "",
    desiredTimeline: intake.desired_timeline ?? "",
    source: intake.source,
    submittedAt: intake.submitted_at,
    createdAt: intake.created_at,
  };
}

function parseBudgetToVnd(budget: string): number {
  const normalized = budget.trim().toLowerCase();
  if (!normalized) return 0;

  const matches = normalized.match(/\d+(?:[.,]\d+)*/g);
  if (!matches?.length) return 0;

  const hasMillionUnit = /triệu|trieu|\btr\b|\btrieu\b|\bm\b/.test(normalized);
  const hasBillionUnit = /tỷ|ty|\bb\b/.test(normalized);
  const hasThousandUnit = /nghìn|ngàn|nghin|ngan|\bk\b/.test(normalized);
  const multiplier = hasBillionUnit ? 1_000_000_000 : hasMillionUnit ? 1_000_000 : hasThousandUnit ? 1_000 : 1;

  const values = matches
    .map((token) => {
      const separator = token.includes(",") ? "," : token.includes(".") ? "." : "";
      const parts = separator ? token.split(separator) : [token];
      const looksDecimal = multiplier > 1 && parts.length === 2 && parts[1].length <= 2;
      const rawNumber = looksDecimal ? token.replace(",", ".") : token.replace(/[.,]/g, "");
      const number = Number(rawNumber);
      return Number.isFinite(number) ? number * multiplier : 0;
    })
    .filter((value) => value > 0);

  return values.length ? Math.round(Math.max(...values)) : 0;
}

function formatBudgetLabel(budget: string, parsedValue: number): string {
  const trimmed = budget.trim();
  const looksLikeRange = /-|–|—|đến|den|to/i.test(trimmed);
  return parsedValue > 0 && !looksLikeRange ? formatVND(parsedValue) : trimmed;
}

function applyIntakeFallback(deal: Deal, intake?: DealIntake): Deal {
  if (!intake) return deal;

  const budget = intake.estimatedBudget.trim();
  const parsedBudget = budget ? parseBudgetToVnd(budget) : 0;

  return {
    ...deal,
    // BE đang lưu ngân sách public intake ở bảng riêng; khi deal chưa có estimated_value thì FE bù vào để board không hiện 0đ.
    value: deal.value > 0 ? deal.value : parsedBudget || deal.value,
    budgetLabel: deal.value > 0 || !budget ? deal.budgetLabel : formatBudgetLabel(budget, parsedBudget),
    // Ngân sách/thời hạn khách tự điền ở biểu mẫu công khai CŨNG là lời khách, nên đổ vào
    // đúng hai ô lời khách. Cố ý KHÔNG nhét qua `budgetLabel`: nhãn đó còn nuôi bảng Kanban
    // và trang chi tiết, mà ở đó người ta cần con số freelancer chốt chứ không phải câu
    // khách nói.
    //
    // Thiếu bước này thì deal đến từ biểu mẫu công khai mà đã có estimated_value sẽ hiện
    // "Khách chưa nêu" ở màn chấm điểm — ngay cạnh dòng bảng chấm "Ngân sách 25/25" chấm
    // dựa trên chính câu khách viết trong biểu mẫu đó.  #Huynh
    clientBudget: deal.clientBudget?.trim() || budget || deal.clientBudget,
    desiredTimeline: deal.desiredTimeline?.trim() || intake.desiredTimeline.trim() || deal.desiredTimeline,
    notes: deal.notes.trim() || intake.inquiryText.trim() || deal.notes,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Số trang tối đa chịu tải cho một lần dựng bảng (100 bản ghi/trang).
 *
 * Backend chặn cứng `page_size <= 100`, mà bản trước gọi ĐÚNG MỘT lần với `page_size: 100` và
 * không hề phân trang — nên deal thứ 101 trở đi biến mất khỏi Kanban, im lặng, không báo gì.
 * Freelancer làm nhiều dự án mất dữ liệu khỏi màn hình TRƯỚC khi kịp thấy cột dài.
 *
 * Trần 10 trang là để một tài khoản hỏng dữ liệu không kéo hàng trăm request. Chạm trần thì
 * NÓI RA (xem `fetchAllDeals`), tuyệt đối không cắt im lặng thêm lần nữa.  #Huynh
 */
const MAX_DEAL_PAGES = 10;
const DEAL_PAGE_SIZE = 100;

/** Đã tải thiếu deal vì chạm trần — để giao diện nói cho người dùng biết thay vì giấu. */
export let dealsTruncated = false;

/** Tải HẾT các trang. Trang đầu cho biết tổng, các trang sau lấy song song. */
async function fetchAllDealPages(
  params: Record<string, unknown>
): Promise<ApiDealResponse[]> {
  const first = await axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", {
    params: { ...params, page: 1, page_size: DEAL_PAGE_SIZE },
  });
  const rows = first.data.data ?? [];
  const total = first.data.pagination?.total ?? rows.length;
  const totalPages = Math.ceil(total / DEAL_PAGE_SIZE);

  dealsTruncated = totalPages > MAX_DEAL_PAGES;
  const lastPage = Math.min(totalPages, MAX_DEAL_PAGES);
  if (lastPage <= 1) return rows;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", {
        params: { ...params, page: i + 2, page_size: DEAL_PAGE_SIZE },
      })
    )
  );
  return rest.reduce((acc, res) => acc.concat(res.data.data ?? []), rows);
}

/** GET /deals — enriched với tên/liên hệ khách và dữ liệu bù từ phiếu intake. */
async function fetchDeals(params: Record<string, unknown>): Promise<Deal[]> {
  const [rows, clientsRes, intakes] = await Promise.all([
    fetchAllDealPages(params),
    axiosClient
      .get<PaginatedEnvelope<ClientHint>>("/clients", {
        params: { page_size: 100 },
      })
      .catch(() => ({ data: { data: [] as ClientHint[] } })),
    getDealIntakes().catch(() => [] as DealIntake[]),
  ]);

  const clientMap = new Map<string, ClientHint>(
    (clientsRes.data.data ?? []).map((c) => [c.id, c])
  );
  return rows.map((d) =>
    applyIntakeFallback(mapDeal(d, clientMap), findIntakeForDeal(intakes, d.id, d.client_id))
  );
}

/**
 * Deal cho bảng Kanban — TRỪ những dự án đã vào kho lưu trữ.
 *
 * `archived: false` là chỗ duy nhất truyền tham số này; mọi đường khác (nhất là hồ sơ khách
 * hàng) cố ý KHÔNG truyền, để vẫn thấy đủ lịch sử hợp tác.  #Huynh
 */
export async function getDeals(): Promise<Deal[]> {
  return fetchDeals({ archived: false });
}

export type ArchivedDealsPage = {
  deals: Deal[];
  total: number;
  totalPages: number;
};

/**
 * GET /deals?archived=true — kho lưu trữ, PHÂN TRANG THẬT.
 *
 * Khác `getDeals()` ở chỗ KHÔNG tải hết: kho là thứ càng dùng lâu càng dài, tải hết là đúng
 * cái sai đang đi sửa. Sắp theo `closed_at` để "gần đây nhất" nghĩa là gần đây về NGÀY ĐÓNG,
 * không phải lần chạm cuối — sửa một chữ trong dự án cũ không được đẩy nó lên đầu kho.  #Huynh
 */
export async function getArchivedDeals(opts: {
  page: number;
  pageSize?: number;
  title?: string;
  clientId?: string;
}): Promise<ArchivedDealsPage> {
  const params: Record<string, unknown> = {
    archived: true,
    sort_by: "closed_at",
    page: opts.page,
    page_size: opts.pageSize ?? 10,
  };
  if (opts.title?.trim()) params.title = opts.title.trim();
  if (opts.clientId) params.client_id = opts.clientId;

  const [dealsRes, clientsRes] = await Promise.all([
    axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", { params }),
    axiosClient
      .get<PaginatedEnvelope<ClientHint>>("/clients", { params: { page_size: 100 } })
      .catch(() => ({ data: { data: [] as ClientHint[] } })),
  ]);

  const clientMap = new Map<string, ClientHint>(
    (clientsRes.data.data ?? []).map((c) => [c.id, c])
  );
  return {
    deals: (dealsRes.data.data ?? []).map((d) => mapDeal(d, clientMap)),
    total: dealsRes.data.pagination?.total ?? 0,
    totalPages: dealsRes.data.pagination?.total_pages ?? 1,
  };
}

/** Chỉ ĐẾM số dự án trong kho — cho dòng ở chân cột. Xin 1 bản ghi, đọc mỗi `total`. */
export async function countArchivedDeals(): Promise<number> {
  const res = await axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", {
    params: { archived: true, page_size: 1 },
  });
  return res.data.pagination?.total ?? 0;
}

/** GET /deals?client_id= — BE lọc sẵn theo khách, không cần tải hết deal rồi lọc ở FE nữa. */
export async function getDealsByClient(clientId: string): Promise<Deal[]> {
  return fetchDeals({ page_size: 100, client_id: clientId });
}

/** GET /deals/{id} — load detail trực tiếp để refresh route /deals/$dealId vẫn hoạt động. */
export async function getDeal(id: string): Promise<Deal> {
  const { data } = await axiosClient.get<ApiResponse<ApiDealResponse>>(`/deals/${id}`);
  const deal = data.data;
  const clientMap = new Map<string, ClientHint>();

  try {
    const clientRes = await axiosClient.get<ApiResponse<ClientHint>>(
      `/clients/${deal.client_id}`
    );
    clientMap.set(clientRes.data.data.id, clientRes.data.data);
  } catch {
    // BE detail vẫn đủ để render trang; client detail chỉ làm giàu contact.
  }

  const intakes = await getDealIntakes().catch(() => [] as DealIntake[]);
  return applyIntakeFallback(
    mapDeal(deal, clientMap),
    findIntakeForDeal(intakes, deal.id, deal.client_id)
  );
}

/** GET /deals/intakes — BE lưu phiếu tiếp nhận riêng với deal, FE dùng để bổ sung mô tả/ngân sách khi deal chưa copy dữ liệu. */
export async function getDealIntakes(pageSize = 100): Promise<DealIntake[]> {
  const { data } = await axiosClient.get<PaginatedEnvelope<ApiIntakeResponse>>("/deals/intakes", {
    params: { page_size: pageSize },
  });
  return (data.data ?? []).map(mapDealIntake);
}

/** POST /deals/{id}/stage — transitions a deal to a new stage. */
export async function updateDealStage(id: string, stage: Stage): Promise<Deal> {
  const { data } = await axiosClient.post<ApiResponse<ApiDealResponse>>(
    `/deals/${id}/stage`,
    { stage }
  );
  return mapDeal(data.data, new Map());
}

/** POST /deals — creates a new deal. */
export async function createDeal(
  payload: DealPayload,
  clientHint?: ClientHint
): Promise<Deal> {
  const { data } = await axiosClient.post<ApiResponse<ApiDealResponse>>("/deals", payload);
  const clientMap = clientHint ? new Map([[clientHint.id, clientHint]]) : new Map();
  return mapDeal(data.data, clientMap);
}

/** PATCH /deals/{id} — updates deal fields. */
export async function updateDeal(id: string, payload: DealPayload): Promise<Deal> {
  const { data } = await axiosClient.patch<ApiResponse<ApiDealResponse>>(
    `/deals/${id}`,
    payload
  );
  return mapDeal(data.data, new Map());
}

/** DELETE /deals/{id} — soft-deletes a deal. */
export async function deleteDeal(id: string): Promise<void> {
  await axiosClient.delete(`/deals/${id}`);
}

/** POST /deals/{id}/qualify - AI đánh giá deal theo DealId và lưu điểm vào backend. */
export async function qualifyDeal(id: string): Promise<DealQualificationResult> {
  const { data } = await axiosClient.post<ApiResponse<DealQualificationResult>>(
    `/deals/${id}/qualify`,
    undefined,
    // Endpoint AI có thể mất hơn 15 giây, nên tăng timeout riêng thay vì đổi toàn bộ axios client.
    { timeout: 65000 }
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Lịch sử chấm điểm — ĐỌC TỪ SERVER, không phải localStorage.
//
// Trước đây bảng "Căn cứ chấm điểm" chỉ nằm ở localStorage của trình duyệt: đổi máy hay xoá
// cache là deal vẫn hiện "78/100" nhưng mất sạch căn cứ — điểm rơi từ trên trời, đúng cái
// bệnh mà bảng căn cứ sinh ra để chữa. Đây là căn cứ ra quyết định tiền bạc, không phải
// tuỳ chọn giao diện.
//
// Mỗi lần chấm là một bản ghi RIÊNG (append-only): sửa deal rồi chấm lại thì bản cũ vẫn còn
// nguyên để đối chiếu.  #Huynh
// ---------------------------------------------------------------------------

export type QualificationScoreItem = {
  key?: string;
  label: string;
  points: number;
  max_points: number;
  reason?: string | null;
  impact?: "positive" | "neutral" | "negative" | null;
  evidence?: string | null;
};

/** Một nấc điểm CAO HƠN nấc hiện tại, kèm số điểm thu được nếu lên tới đó. */
export type QualificationGapStep = {
  points: number;
  gain: number;
  requirement: string;
};

/**
 * Vì sao MỘT tiêu chí mất điểm, và cần gì để lên.
 *
 * BE tra từ bảng barem (`RUBRIC_LEVELS`), KHÔNG phải chữ do AI viết — nên nội dung này luôn
 * có và luôn khớp với con số điểm bên cạnh. Đó cũng là lý do bản đánh giá cũ mở lại vẫn đầy
 * đủ: BE tính lại lúc đọc từ (tiêu chí, điểm).
 */
export type QualificationGap = {
  key: string;
  label: string;
  points: number;
  max_points: number;
  /** Câu hỏi gửi thẳng cho khách. AI viết cho bám dự án, hỏng thì BE rơi về câu mẫu. */
  ask: string | null;
  lost_points: number;
  current_state: string;
  steps: QualificationGapStep[];
  /** Ô trên form bổ sung nhanh vá được tiêu chí này: notes | client_budget | desired_timeline. */
  fill_field: string | null;
};

export type QualificationScoreGaps = {
  lost_points: number;
  /** Còn thiếu bao nhiêu điểm nữa mới đạt HOT (75). 0 = đã đạt. */
  points_to_hot: number;
  /** Tiêu chí thiết yếu (scope/budget/timeline) chưa đạt trần — còn cái nào thì chưa thể HOT. */
  essential_missing: string[];
  /** Sắp GIẢM DẦN theo `lost_points`: việc đáng làm nhất nằm đầu danh sách. */
  gaps: QualificationGap[];
};

export type DealQualification = {
  id: string;
  score: number;
  /** Suy từ điểm ở BE — dùng chung ngưỡng với bộ chấm điểm. */
  level: "hot" | "warm" | "cold";
  reasoning: string;
  generated_at: string;
  model_version: string;

  project_type: string | null;
  budget_signal: string | null;
  timeline_signal: string | null;
  urgency_signal: string | null;
  red_flags: string[] | null;

  /** Bản ghi CŨ (trước khi BE thêm cột) không có mấy trường này — phải chịu được `null`. */
  breakdown: QualificationScoreItem[] | null;
  /** BE tính lại từ `breakdown` mỗi lần đọc — bản ghi cũ cũng có, không cần lưu xuống DB. */
  score_gaps: QualificationScoreGaps | null;
  next_step: string | null;
  detected_signals: { text: string; is_positive: boolean }[] | null;
  prompt_version: string | null;
  /**
   * Lúc freelancer bấm "Lưu & chuyển sang Đã đánh giá". `null` = mới chấm, chưa chốt.
   *
   * Đây là thứ phân biệt hai tab: **Lịch sử** kể HẾT mọi lần chấm, **Tài liệu** chỉ kể bản
   * đã chốt. Lọc theo trường này chứ đừng đoán theo "bản mới nhất" — chấm thử rồi bỏ cũng
   * là một dòng mới nhất.
   */
  saved_at: string | null;
};

/** GET /deals/{id}/qualifications — lịch sử chấm điểm, mới nhất trước. */
export async function getDealQualifications(dealId: string): Promise<DealQualification[]> {
  const { data } = await axiosClient.get<ApiResponse<DealQualification[]>>(
    `/deals/${dealId}/qualifications`
  );
  return data.data ?? [];
}

/**
 * POST /deals/{id}/qualifications/save — chốt bản chấm mới nhất để nó vào tab Tài liệu.
 *
 * Không gửi id: bảng đánh giá luôn hiển thị lần chấm vừa xong, nên "chốt cái đang xem"
 * chính là "chốt bản mới nhất". Chưa chấm lần nào thì BE trả 404.
 *
 * `gapAcknowledged` = giao diện đã cảnh báo bản này chưa đủ 100 điểm và người dùng vẫn chọn
 * chốt. BE lưu lại để sau này nhìn một bản 27/100 đã chốt còn phân biệt được "hệ thống để
 * lọt" với "người dùng biết rõ và tự chịu trách nhiệm".
 */
export async function saveDealQualification(
  dealId: string,
  options: { gapAcknowledged?: boolean; qualificationId?: string } = {}
): Promise<DealQualification> {
  const { data } = await axiosClient.post<ApiResponse<DealQualification>>(
    `/deals/${dealId}/qualifications/save`,
    {
      gap_acknowledged: options.gapAcknowledged ?? false,
      // Bỏ trống thì BE chốt bản mới nhất. Chỉ gửi id khi chốt một bản CỤ THỂ mở lại từ tab
      // Lịch sử — lúc đó bản đang xem không còn là bản mới nhất.
      qualification_id: options.qualificationId ?? null,
    }
  );
  return data.data;
}
