import { useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteDeal,
  getDeal,
  getDealIntakes,
  getDealsByClient,
  getDeals,
  qualifyDeal,
  updateDeal,
  updateDealStage,
  type DealPayload,
} from "@/services/dealsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { Stage } from "@/features/deals/types";
import {
  getDealHistories,
  getDealHistory,
  subscribeAllDealHistory,
  subscribeDealHistory,
} from "@/features/deals/dealHistoryStorage";

export const dealKeys = {
  all: ["deals"] as const,
  detail: (dealId: string) => ["deals", "detail", dealId] as const,
  byClient: (clientId: string) => ["deals", "client", clientId] as const,
  intakes: ["deals", "intakes"] as const,
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

const EMPTY_HISTORY: ReturnType<typeof getDealHistory> = [];

/** Lịch sử riêng của deal, lưu cục bộ tại trình duyệt vì BE chưa có API deal-activity. */
export function useDealHistory(dealId: string | undefined) {
  return useSyncExternalStore(
    (callback) => (dealId ? subscribeDealHistory(dealId, callback) : () => {}),
    () => (dealId ? getDealHistory(dealId) : EMPTY_HISTORY),
    () => EMPTY_HISTORY
  );
}

const EMPTY_HISTORIES: Record<string, ReturnType<typeof getDealHistory>> = {};

/**
 * Lịch sử của NHIỀU deal — dùng ở hồ sơ khách hàng, nơi một khách có nhiều dự án.
 *
 * `dealIds` phải ổn định giữa các lần render (bọc `useMemo` ở nơi gọi), nếu không mỗi render
 * lại dựng một mảng mới và `getSnapshot` phải tính lại từ đầu.
 */
export function useDealHistories(dealIds: string[]) {
  const key = dealIds.join("|");
  return useSyncExternalStore(
    subscribeAllDealHistory,
    () => (key ? getDealHistories(key.split("|")) : EMPTY_HISTORIES),
    () => EMPTY_HISTORIES
  );
}

/** Danh sách dự án theo khách hàng — BE lọc qua `GET /deals?client_id=`. */
export function useClientDeals(clientId: string | undefined) {
  return useQuery({
    queryKey: dealKeys.byClient(clientId ?? ""),
    queryFn: () => getDealsByClient(clientId!),
    enabled: Boolean(clientId),
  });
}

/** Danh sách phiếu tiếp nhận từ public form; dùng để bù mô tả/ngân sách cho deal tạo từ intake. */
export function useDealIntakes(enabled = true) {
  return useQuery({
    queryKey: dealKeys.intakes,
    queryFn: () => getDealIntakes(),
    enabled,
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

export function useQualifyDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => qualifyDeal(dealId),
    onSuccess: (_, dealId) => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
    },
  });
}
