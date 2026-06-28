import axiosClient from "@/configs/axios";

export type ClientType = "individual" | "company";
export type ClientStatus = "prospect" | "active" | "inactive" | "archived";

export type ClientRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ClientType;
  status: ClientStatus;
  website: string | null;
  linkedin_url: string | null;
  address_city: string | null;
  address_country: string | null;
  notes: string | null;
  description: string | null;
  deal_count: number;
  created_at: string;
  updated_at: string;
};

export type ClientCommLog = {
  id: string;
  client_id: string;
  channel: string;
  summary: string;
  communicated_at: string;
  created_at: string;
};

export type ClientPayload = {
  name: string;
  email?: string | null;
  phone?: string | null;
  type?: ClientType;
  status?: ClientStatus;
  website?: string | null;
  linkedin_url?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  notes?: string | null;
  description?: string | null;
};

export type GetClientsParams = {
  status?: ClientStatus;
  name?: string;
  email?: string;
  page?: number;
  page_size?: number;
};

type PaginatedEnvelope<T> = {
  data: T[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

type ApiEnvelope<T> = { data: T };

export async function getClients(params: GetClientsParams = {}): Promise<ClientRecord[]> {
  const { data } = await axiosClient.get<PaginatedEnvelope<ClientRecord>>("/clients", {
    params: { page_size: 100, ...params },
  });
  return data.data ?? [];
}

export async function getClient(id: string): Promise<ClientRecord> {
  const { data } = await axiosClient.get<ApiEnvelope<ClientRecord>>(`/clients/${id}`);
  return data.data;
}

export async function createClient(payload: ClientPayload): Promise<ClientRecord> {
  const { data } = await axiosClient.post<ApiEnvelope<ClientRecord>>("/clients", payload);
  return data.data;
}

export async function updateClient(id: string, payload: ClientPayload): Promise<ClientRecord> {
  const { data } = await axiosClient.patch<ApiEnvelope<ClientRecord>>(`/clients/${id}`, payload);
  return data.data;
}

export async function deleteClient(id: string): Promise<void> {
  await axiosClient.delete(`/clients/${id}`);
}

export async function listClientCommLogs(clientId: string): Promise<ClientCommLog[]> {
  const { data } = await axiosClient.get<ApiEnvelope<ClientCommLog[]>>(
    `/clients/${clientId}/comm-logs`
  );
  return data.data ?? [];
}
