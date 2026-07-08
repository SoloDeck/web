import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    queryFn: async () => {
      const invoices = await listInvoices();
      // BE hiện chưa expose query deal_id, nên lọc phía FE để giữ UI dùng API thật.
      return invoices.filter((invoice) => invoice.deal_id === dealId);
    },
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
    },
  });
}

export function useSendInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(invoiceId),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
    },
  });
}

export function useVoidInvoice(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => voidInvoice(invoiceId),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
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
      qc.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) });
    },
  });
}
