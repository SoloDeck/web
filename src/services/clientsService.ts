import axiosClient from "@/configs/axios";

export type ClientType = "individual" | "company";
export type ClientStatus = "prospect" | "active" | "inactive" | "archived";

export type ClientRecord = {
  id: string;
  type: ClientType;
  name: string;
  email: string | null;
  status: ClientStatus;
  notes: string | null;
  contact_info: {
    phone?: string;
    website?: string;
    linkedin_url?: string;
    address_city?: string;
    address_country?: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

// Backend currently returns plain list (no pagination, no search param).
// TODO (backend team): add ?search=, ?status=, ?page=, ?page_size= to GET /clients
export async function getClients(): Promise<ClientRecord[]> {
  const { data } = await axiosClient.get<{ data: ClientRecord[] }>("/clients");
  return data.data ?? [];
}

/** POST /clients — creates a new client. */
export async function createClient(payload: {
  name: string;
  phone?: string;
  email?: string;
  type?: ClientType;
  notes?: string;
}): Promise<ClientRecord> {
  const body: Record<string, unknown> = { name: payload.name };
  if (payload.email) body.email = payload.email;
  if (payload.type)  body.type  = payload.type;
  if (payload.notes) body.notes = payload.notes;
  if (payload.phone) body.contact_info = { phone: payload.phone };
  const { data } = await axiosClient.post<{ data: ClientRecord }>("/clients", body);
  return data.data;
}
