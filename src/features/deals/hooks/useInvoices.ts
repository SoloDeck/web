import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invoiceSentMessage } from "@/features/deals/invoiceComposer";
import { lamMoiSoLieuTien } from "@/features/revenue/hooks/useAnalytics";
import { reminderKeys } from "@/features/reminders/hooks/useReminders";
import {
  createInvoice,
  deleteInvoice,
  listInvoicePayments,
  listInvoices,
  recordInvoicePayment,
  sendInvoice,
  updateInvoice,
  voidInvoice,
  type InvoicePayload,
  type InvoiceUpdatePayload,
  type PaymentPayload,
} from "@/services/invoicesService";

export const invoiceKeys = {
  all: ["invoices"] as const,
  deal: (dealId: string | undefined) => ["invoices", "deal", dealId] as const,
  payments: (invoiceId: string | undefined) => ["invoices", "payments", invoiceId] as const,
};

export function useDealInvoices(dealId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.deal(dealId),
    queryFn: () => listInvoices({ dealId }),
    enabled: Boolean(dealId),
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.payments(invoiceId),
    queryFn: () => listInvoicePayments(invoiceId!),
    enabled: Boolean(invoiceId),
  });
}

export function useCreateInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoicePayload) => createInvoice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
    },
  });
}

export function useUpdateInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: InvoiceUpdatePayload }) =>
      updateInvoice(invoiceId, payload),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
    },
  });
}

export function useDeleteInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
    },
  });
}

export function useSendInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(invoiceId),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
      // Gửi hóa đơn kèm đặt lời nhắc thanh toán: tab Nhắc nhở phải thấy ngay lời nhắc mới.
      qc.invalidateQueries({ queryKey: reminderKeys.all });
      // Báo kết quả ở ĐÂY chứ không ở từng nơi gọi: mọi đường gửi hóa đơn nói cùng một câu về lời
      // nhắc, và thư đã đi thì vẫn báo dù người dùng đóng cửa sổ trước khi server trả lời.
      toast.success(invoiceSentMessage(invoice.invoice_number, invoice.payment_reminder));
    },
  });
}

export function useVoidInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => voidInvoice(invoiceId),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
      qc.invalidateQueries({ queryKey: reminderKeys.all }); // lời nhắc đang chờ bị hủy theo
    },
  });
}

export function useRecordInvoicePayment(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: PaymentPayload }) =>
      recordInvoicePayment(invoiceId, payload),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      lamMoiSoLieuTien(qc);
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
      qc.invalidateQueries({ queryKey: reminderKeys.all }); // thu đủ thì lời nhắc bị hủy theo
    },
  });
}
