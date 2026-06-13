/**
 * clientsService.ts
 * Giao tiếp với backend API cho module Khách hàng.
 * Base: GET|POST|PATCH|DELETE /clients, GET|POST /clients/{id}/comm-logs
 */

import axiosClient from "@/configs/axios";

// ── Types khớp với ClientResponse của backend ─────────────────────────────────

export type ClientType   = "individual" | "company";
export type ClientStatus = "prospect" | "active" | "inactive" | "archived";

/** Khớp với ClientResponse schema của backend. */
export type ClientRecord = {
  id:             string;
  owner_user_id:  string;
  type:           ClientType;
  name:           string;
  email:          string | null;
  phone:          string | null;
  status:         ClientStatus;
  notes:          string | null;
  description:    string | null;
  created_at:     string;
  updated_at:     string;
};

/** Lịch sử liên hệ — CommLogResponse của backend. */
export type CommLog = {
  id:                string;
  client_id:         string;
  channel:           string;   // Zalo | Email | Facebook | Điện thoại | Gặp mặt | ...
  summary:           string;
  communicated_at:   string;   // ISO datetime
  created_at:        string;
};

// ── Client API ────────────────────────────────────────────────────────────────

/**
 * GET /clients?name=...&email=...&status=...
 * Backend hỗ trợ lọc server-side theo name (partial), email (partial), status.
 */
export async function getClients(params?: {
  name?:   string;
  email?:  string;
  status?: string;
}): Promise<ClientRecord[]> {
  const { data } = await axiosClient.get<{ data: ClientRecord[] }>("/clients", { params });
  return data.data ?? [];
}

/** GET /clients/{id} — lấy chi tiết một khách hàng. */
export async function getClient(id: string): Promise<ClientRecord> {
  const { data } = await axiosClient.get<{ data: ClientRecord }>(`/clients/${id}`);
  return data.data;
}

/** POST /clients — tạo khách hàng mới. */
export async function createClient(payload: {
  name:         string;
  phone?:       string;
  email?:       string;
  type?:        ClientType;
  status?:      ClientStatus;
  notes?:       string;
  description?: string;
  website?:     string;
  linkedin_url?: string;
  address_city?: string;
  address_country?: string;
}): Promise<ClientRecord> {
  const { data } = await axiosClient.post<{ data: ClientRecord }>("/clients", payload);
  return data.data;
}

/** PATCH /clients/{id} — cập nhật thông tin khách hàng. */
export async function updateClient(
  id:      string,
  payload: Partial<Omit<ClientRecord, "id" | "owner_user_id" | "created_at" | "updated_at">>,
): Promise<ClientRecord> {
  const { data } = await axiosClient.patch<{ data: ClientRecord }>(`/clients/${id}`, payload);
  return data.data;
}

/** DELETE /clients/{id} — xoá khách hàng. */
export async function deleteClient(id: string): Promise<void> {
  await axiosClient.delete(`/clients/${id}`);
}

// ── Comm-log API ──────────────────────────────────────────────────────────────

/** GET /clients/{id}/comm-logs — lấy lịch sử liên hệ của một khách hàng. */
export async function getCommLogs(clientId: string): Promise<CommLog[]> {
  const { data } = await axiosClient.get<{ data: CommLog[] }>(`/clients/${clientId}/comm-logs`);
  return data.data ?? [];
}

/** POST /clients/{id}/comm-logs — ghi nhận một lần liên hệ mới. */
export async function addCommLog(
  clientId: string,
  payload: {
    channel:          string;
    summary:          string;
    communicated_at:  string; // ISO datetime
  },
): Promise<CommLog> {
  const { data } = await axiosClient.post<{ data: CommLog }>(
    `/clients/${clientId}/comm-logs`,
    payload,
  );
  return data.data;
}
