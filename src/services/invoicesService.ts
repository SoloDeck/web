import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "cancelled" | string;

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

export type InvoicePayload = {
  client_id: string;
  contract_id?: string | null;
  deal_id?: string | null;
  issue_date?: string;
  subtotal?: number;
  tax_rate?: number;
  currency?: string;
  due_date: string;
  notes?: string | null;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    sort_order?: number;
  }>;
};

export type InvoiceUpdatePayload = Pick<InvoicePayload, "due_date" | "subtotal" | "tax_rate" | "notes" | "line_items">;

export type PaymentPayload = {
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_note?: string | null;
};

/** POST /invoices — tạo hóa đơn gắn với deal/contract theo rule backend. */
export async function createInvoice(payload: InvoicePayload): Promise<InvoiceResponse> {
  const { data } = await axiosClient.post<ApiResponse<InvoiceResponse>>("/invoices", payload);
  return data.data;
}

/** GET /invoices — BE chưa có filter deal_id nên FE sẽ lọc theo deal sau khi fetch. */
export async function listInvoices(): Promise<InvoiceResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<InvoiceResponse[]>>("/invoices");
  return data.data ?? [];
}

/** PATCH /invoices/{invoice_id} — chỉ chỉnh được khi hóa đơn còn là bản nháp. */
export async function updateInvoice(invoiceId: string, payload: InvoiceUpdatePayload): Promise<InvoiceResponse> {
  const { data } = await axiosClient.patch<ApiResponse<InvoiceResponse>>(`/invoices/${invoiceId}`, payload);
  return data.data;
}

/** DELETE /invoices/{invoice_id} — dùng cho hóa đơn nháp tạo nhầm/chưa gửi. */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  await axiosClient.delete<ApiResponse<{ detail: string }>>(`/invoices/${invoiceId}`);
}

/**
 * POST /invoices/{invoice_id}/send — GỬI EMAIL cho khách rồi đánh dấu đã gửi.
 *
 * Trước đây endpoint này chỉ đổi trạng thái chứ không gửi gì, nên nút "Gửi cho khách" là một
 * lời nói dối. Nay thư đi thật, kèm chi tiết hóa đơn và mã QR VietQR đã gắn sẵn số tiền.
 * Gửi hỏng thì hóa đơn ở nguyên `draft` và trả 502 kèm lý do — đừng bắt lỗi rồi coi như xong.
 */
export async function sendInvoice(invoiceId: string): Promise<InvoiceResponse> {
  const { data } = await axiosClient.post<ApiResponse<InvoiceResponse>>(`/invoices/${invoiceId}/send`);
  return data.data;
}

/**
 * POST /tasks/{task_id}/invoice — xuất hóa đơn cho một mốc "Thu tiền:".
 *
 * KHÔNG gửi số tiền lên: server tự tính từ mốc thanh toán của báo giá đã chốt, dùng chung bộ
 * tính với bảng doanh thu. Hai chỗ cùng tính tiền là kiểu gì cũng có ngày lệch, mà lệch ở đây
 * nghĩa là hóa đơn gửi khách khác số liệu nội bộ.
 *
 * Task đã có hóa đơn thì server trả về CHÍNH hóa đơn đó, không đẻ cái thứ hai.  #Huynh
 */
export async function createInvoiceForTask(taskId: string): Promise<InvoiceResponse> {
  const { data } = await axiosClient.post<ApiResponse<InvoiceResponse>>(`/tasks/${taskId}/invoice`);
  return data.data;
}

/** POST /invoices/{invoice_id}/void — hủy hóa đơn đã gửi nhưng chưa có thanh toán. */
export async function voidInvoice(invoiceId: string): Promise<InvoiceResponse> {
  const { data } = await axiosClient.post<ApiResponse<InvoiceResponse>>(`/invoices/${invoiceId}/void`);
  return data.data;
}

/** POST /invoices/{invoice_id}/payments — ghi nhận một giao dịch thanh toán cho hóa đơn. */
export async function recordInvoicePayment(invoiceId: string, payload: PaymentPayload): Promise<InvoiceResponse> {
  const { data } = await axiosClient.post<ApiResponse<InvoiceResponse>>(`/invoices/${invoiceId}/payments`, payload);
  return data.data;
}

/** GET /invoices/{invoice_id}/payments — lịch sử thanh toán append-only. */
export async function listInvoicePayments(invoiceId: string): Promise<PaymentRecordResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<PaymentRecordResponse[]>>(
    `/invoices/${invoiceId}/payments`
  );
  return data.data ?? [];
}
