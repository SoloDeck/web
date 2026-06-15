import axiosClient from "@/configs/axios";

export type ClientType = "individual" | "company";
export type ClientStatus = "prospect" | "active" | "inactive" | "archived";

// Flat shape returned by GET /clients (matches backend ClientResponse).
// There is NO nested contact_info object and NO tags field.
export type ClientRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ClientType;
  status: ClientStatus;
  notes: string | null;
  description: string | null;
  deal_count: number;
  created_at: string;
  updated_at: string;
};

export type GetClientsParams = {
  status?: ClientStatus;
  name?: string;
  email?: string;
};

// Backend returns a plain list (NO server-side pagination). Filtering by
// ?status=, ?name=, ?email= is supported; pagination is done client-side.
export async function getClients(params: GetClientsParams = {}): Promise<ClientRecord[]> {
  const { data } = await axiosClient.get<{ data: ClientRecord[] }>("/clients", { params });
  return data.data ?? [];
}

/** POST /clients — creates a new client with flat fields. */
export async function createClient(payload: {
  name: string;
  email?: string;
  phone?: string;
  type?: ClientType;
  notes?: string;
}): Promise<ClientRecord> {
  const body: Record<string, unknown> = { name: payload.name };
  if (payload.email) body.email = payload.email;
  if (payload.phone) body.phone = payload.phone;
  if (payload.type) body.type = payload.type;
  if (payload.notes) body.notes = payload.notes;
  const { data } = await axiosClient.post<{ data: ClientRecord }>("/clients", body);
  return data.data;
}
