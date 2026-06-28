import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { Deal, LeadScore, Stage } from "@/features/deals/types";

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

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /deals — fetches all user deals, enriched with client names/contact. */
export async function getDeals(): Promise<Deal[]> {
  const [dealsRes, clientsRes] = await Promise.all([
    axiosClient.get<PaginatedEnvelope<ApiDealResponse>>("/deals", {
      params: { page_size: 100 },
    }),
    axiosClient
      .get<PaginatedEnvelope<ClientHint>>("/clients", {
        params: { page_size: 100 },
      })
      .catch(() => ({ data: { data: [] as ClientHint[] } })),
  ]);

  const clientMap = new Map<string, ClientHint>(
    (clientsRes.data.data ?? []).map((c) => [c.id, c])
  );

  return (dealsRes.data.data ?? []).map((d) => mapDeal(d, clientMap));
}

/** GET /deals — BE chưa có filter theo client_id, nên FE tạm lọc local ở một nơi duy nhất. */
export async function getDealsByClient(clientId: string): Promise<Deal[]> {
  const deals = await getDeals();
  return deals.filter((deal) => deal.clientId === clientId);
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

  return mapDeal(deal, clientMap);
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
