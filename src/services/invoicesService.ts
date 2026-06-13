import axiosClient from "@/configs/axios";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type Invoice = {
  id: string;
  owner_user_id: string;
  client_id: string;
  deal_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getInvoices(params?: {
  status?: InvoiceStatus;
  invoice_number?: string;
}): Promise<Invoice[]> {
  const { data } = await axiosClient.get<{ data: Invoice[] }>("/invoices", { params });
  return data.data ?? [];
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await axiosClient.get<{ data: Invoice }>(`/invoices/${id}`);
  return data.data;
}

export type AnalyticsDashboard = {
  total_clients: number;
  active_deals: number;
  total_revenue: number;
  pending_invoices: number;
};

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  const { data } = await axiosClient.get<{ data: AnalyticsDashboard }>("/analytics/dashboard");
  return data.data;
}
