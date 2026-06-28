import { useQuery } from "@tanstack/react-query";
import { listInvoicePayments, listInvoices } from "@/services/invoicesService";

export function useDealInvoices(dealId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "deal", dealId],
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
    queryKey: ["invoices", "payments", invoiceId],
    queryFn: () => listInvoicePayments(invoiceId!),
    enabled: Boolean(invoiceId),
  });
}
