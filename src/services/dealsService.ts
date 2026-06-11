import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { Deal, Stage } from "@/features/deals/types";

// ---------------------------------------------------------------------------
// Backend response shapes
// ---------------------------------------------------------------------------

type ApiDealResponse = {
  id: string;
  client_id: string;
  client_name?: string; // denormalized — present in responses, absent in older payloads
  title: string;
  stage: Stage;
  source: string | null;
  estimated_value: number | null;
  actual_value: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ApiClientResponse = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
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

function mapDeal(d: ApiDealResponse, clientMap: Map<string, ApiClientResponse>): Deal {
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
    projectType: d.title,
    value,
    score: "warm", // not in API yet — tracked as "Đang phát triển"
    stage: d.stage,
    contact: client
      ? [client.name, client.phone].filter(Boolean).join(" - ")
      : clientName,
    channel: mapSourceToChannel(d.source),
    createdAt: d.created_at.split("T")[0],
    notes: d.notes ?? "",
    paymentStatus,
    paymentMethod: "—", // not in API yet — tracked as "Đang phát triển"
    history: [],        // not in API yet — tracked as "Đang phát triển"
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** GET /deals — fetches all user deals, enriched with client names. */
export async function getDeals(): Promise<Deal[]> {
  const [dealsRes, clientsRes] = await Promise.all([
    axiosClient.get<ApiResponse<ApiDealResponse[]>>("/deals"),
    axiosClient
      .get<ApiResponse<ApiClientResponse[]>>("/clients")
      .catch(() => ({ data: { data: [] as ApiClientResponse[] } })),
  ]);

  const clientMap = new Map<string, ApiClientResponse>(
    (clientsRes.data.data ?? []).map((c) => [c.id, c])
  );

  return dealsRes.data.data.map((d) => mapDeal(d, clientMap));
}

/** POST /deals/{id}/stage — transitions a deal to a new stage. */
export async function updateDealStage(id: string, stage: Stage): Promise<void> {
  await axiosClient.post(`/deals/${id}/stage`, { stage });
}


/** POST /deals — creates a new deal (UI coming soon). */
export async function createDeal(payload: {
  client_id: string;
  title: string;
  stage?: Stage;
  estimated_value?: number;
  notes?: string;
  source?: string;
}): Promise<Deal> {
  const { data } = await axiosClient.post<ApiResponse<ApiDealResponse>>("/deals", payload);
  return mapDeal(data.data, new Map());
}

/** DELETE /deals/{id} — soft-deletes a deal (UI coming soon). */
export async function deleteDeal(id: string): Promise<void> {
  await axiosClient.delete(`/deals/${id}`);
}
