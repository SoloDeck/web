import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCheckout,
  getMySubscription,
  getPaymentIntent,
  listPlans,
  SETTLED_PAYMENT_STATUSES,
} from "@/services/subscriptionsService";

export const subscriptionKeys = {
  plans: ["subscriptions", "plans"] as const,
  mine: ["subscriptions", "me"] as const,
  intent: (id: string) => ["payments", "intent", id] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: listPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: getMySubscription,
  });
}

/** Mở một lần thanh toán. Chỗ gọi tự quyết định điều hướng sang MoMo. */
export function useCreateCheckout() {
  return useMutation({ mutationFn: createCheckout });
}

/**
 * Theo dõi kết quả một lần thanh toán sau khi MoMo đá người dùng về.
 *
 * Hỏi lại mỗi 3 giây vì tiền vào qua IPN — một đường server-to-server chạy SONG SONG với
 * việc trình duyệt quay về, nên lúc trang mở lại thì backend có thể chưa kịp nhận. Tự
 * ngừng hỏi khi trạng thái đã chốt, để không quay vòng vô hạn trên một tab bị bỏ quên.
 *
 * Khi thành công thì làm mới luôn `subscriptions/me` — gói đã đổi, mọi chỗ khác trong app
 * (hạn mức AI, nhãn gói) phải thấy ngay.  #Huynh
 */
export function usePaymentIntent(intentId: string | null) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: subscriptionKeys.intent(intentId ?? ""),
    queryFn: async () => {
      const intent = await getPaymentIntent(intentId!);
      if (intent.status === "succeeded") {
        qc.invalidateQueries({ queryKey: subscriptionKeys.mine });
      }
      return intent;
    },
    enabled: Boolean(intentId),
    refetchInterval: (query) =>
      query.state.data && SETTLED_PAYMENT_STATUSES.includes(query.state.data.status)
        ? false
        : 3000,
  });
}
