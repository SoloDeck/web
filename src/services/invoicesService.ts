import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | string;

export type InvoiceResponse = {
  id: string;
  owner_user_id: string;
  client_id: string;
  contract_id: string | null;
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
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRecordResponse = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_note: string | null;
  created_at: string;
};

/** GET /invoices — BE chưa có filter deal_id nên FE sẽ lọc theo deal sau khi fetch. */
export async function listInvoices(): Promise<InvoiceResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<InvoiceResponse[]>>("/invoices");
  return data.data ?? [];
}

/** GET /invoices/{invoice_id}/payments — lịch sử thanh toán append-only. */
export async function listInvoicePayments(invoiceId: string): Promise<PaymentRecordResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<PaymentRecordResponse[]>>(
    `/invoices/${invoiceId}/payments`
  );
  return data.data ?? [];
}
