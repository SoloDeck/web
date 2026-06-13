import axiosClient from "@/configs/axios";

export type ContractStatus =
  | "draft"
  | "pending_signatures"
  | "active"
  | "completed"
  | "terminated";

export type Contract = {
  id: string;
  deal_id: string;
  proposal_id: string;
  client_id: string;
  owner_user_id: string;
  version_number: number;
  status: ContractStatus;
  content: Record<string, unknown>;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

export async function getContracts(status?: ContractStatus): Promise<Contract[]> {
  const { data } = await axiosClient.get<{ data: Contract[] }>("/contracts", {
    params: status ? { status } : undefined,
  });
  return data.data ?? [];
}

export async function getContract(id: string): Promise<Contract> {
  const { data } = await axiosClient.get<{ data: Contract }>(`/contracts/${id}`);
  return data.data;
}
