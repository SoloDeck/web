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
  project_type?: string | null;
  service_category?: string | null;
  pricing_tier?: string | null;
  ai_qualification_score?: number | null;
  ai_qualification_recommendation?: string | null;
  created_at: string;
  updated_at: string;
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
  source?: string;
  project_type?: string | null;
  service_category?: string | null;
  pricing_tier?: string | null;
};

export type DealIntake = {
  id: string;
  ownerUserId: string;
  clientId: string;
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
    paymentStatus,
    paymentMethod: "—",
    history: [],
    tasks: [],
  };
}

function mapDealIntake(intake: ApiIntakeResponse): DealIntake {
  return {
    id: intake.id,
    ownerUserId: intake.owner_user_id,
    clientId: intake.client_id,
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

function createLatestIntakeByClient(intakes: DealIntake[]): Map<string, DealIntake> {
  const map = new Map<string, DealIntake>();
  for (const intake of intakes) {
    if (!map.has(intake.clientId)) map.set(intake.clientId, intake);
  }
  return map;
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
    notes: deal.notes.trim() || intake.inquiryText.trim() || deal.notes,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /deals — enriched với tên/liên hệ khách và dữ liệu bù từ phiếu intake. */
async function fetchDeals(params: Record<string, unknown>): Promise<Deal[]> {
  const [dealsRes, clientsRes, intakes] = await Promise.all([
    axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", { params }),
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
  const intakeByClient = createLatestIntakeByClient(intakes);

  return (dealsRes.data.data ?? []).map((d) =>
    applyIntakeFallback(mapDeal(d, clientMap), intakeByClient.get(d.client_id))
  );
}

/** GET /deals — toàn bộ deal của user (dùng cho Kanban). */
export async function getDeals(): Promise<Deal[]> {
  return fetchDeals({ page_size: 100 });
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
  return applyIntakeFallback(mapDeal(deal, clientMap), createLatestIntakeByClient(intakes).get(deal.client_id));
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
