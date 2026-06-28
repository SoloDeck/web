import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteDeal,
  getDeal,
  getDealsByClient,
  getDeals,
  updateDeal,
  updateDealStage,
  type DealPayload,
} from "@/services/dealsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { Stage } from "@/features/deals/types";

export const dealKeys = {
  all: ["deals"] as const,
  detail: (dealId: string) => ["deals", "detail", dealId] as const,
  byClient: (clientId: string) => ["deals", "client", clientId] as const,
};

/**
 * Loads the pipeline via React Query and seeds the Zustand board store with
 * the result. Components read the live, drag-and-drop-mutable list from
 * `useDealStore`; this hook owns the server fetch, caching and load/error state.
 */
export function useDeals() {
  const query = useQuery({ queryKey: dealKeys.all, queryFn: getDeals });
  const hydrate = useDealStore((s) => s.hydrate);
  const deals = useDealStore((s) => s.deals);

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data, hydrate]);

  return {
    deals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/** GET /deals/{id} — dùng cho full-page detail, kể cả khi user refresh URL. */
export function useDeal(dealId: string | undefined) {
  const updateStoredDeal = useDealStore((s) => s.updateDeal);
  const query = useQuery({
    queryKey: dealKeys.detail(dealId ?? ""),
    queryFn: () => getDeal(dealId!),
    enabled: Boolean(dealId),
  });

  useEffect(() => {
    if (query.data) updateStoredDeal(query.data);
  }, [query.data, updateStoredDeal]);

  return query;
}

/** Danh sách dự án theo khách hàng; đang dùng fallback FE cho đến khi BE có API filter client_id. */
export function useClientDeals(clientId: string | undefined) {
  return useQuery({
    queryKey: dealKeys.byClient(clientId ?? ""),
    queryFn: () => getDealsByClient(clientId!),
    enabled: Boolean(clientId),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  const updateStoredDeal = useDealStore((s) => s.updateDeal);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DealPayload }) =>
      updateDeal(id, payload),
    onSuccess: (deal) => {
      const existing = useDealStore.getState().deals.find((item) => item.id === deal.id);
      // PATCH /deals trả dữ liệu dự án, chưa chắc kèm contact khách hàng; giữ phần client đã hydrate.
      updateStoredDeal({
        ...deal,
        client: existing?.client ?? deal.client,
        clientEmail: existing?.clientEmail ?? deal.clientEmail,
        clientPhone: existing?.clientPhone ?? deal.clientPhone,
        contact: existing?.contact ?? deal.contact,
      });
      qc.invalidateQueries({ queryKey: dealKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.detail(deal.id) });
      toast.success("Đã cập nhật dự án.");
    },
    onError: () => {
      toast.error("Không thể cập nhật dự án. Vui lòng thử lại.");
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  const removeDeal = useDealStore((s) => s.removeDeal);
  return useMutation({
    mutationFn: (dealId: string) => deleteDeal(dealId),
    onSuccess: (_, dealId) => {
      removeDeal(dealId);
      qc.invalidateQueries({ queryKey: dealKeys.all });
      toast.success("Đã loại bỏ dự án.");
    },
    onError: () => {
      toast.error("Không thể loại bỏ dự án. Vui lòng thử lại.");
    },
  });
}

export function useTransitionDealStage() {
  const qc = useQueryClient();
  const moveToStage = useDealStore((s) => s.moveToStage);
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => updateDealStage(id, stage),
    onSuccess: (deal, { id, stage }) => {
      // API trả deal nhưng chưa kèm client, giữ optimistic stage để không mất tên KH.
      moveToStage(id, stage);
      qc.invalidateQueries({ queryKey: dealKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.detail(deal.id) });
      toast.success("Đã cập nhật giai đoạn dự án.");
    },
    onError: () => {
      toast.error("Không thể cập nhật giai đoạn dự án.");
    },
  });
}
