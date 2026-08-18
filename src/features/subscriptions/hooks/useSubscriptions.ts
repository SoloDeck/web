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

/**
 * Gói hiện tại có dùng được AI không.
 *
 * `undefined` = CHƯA BIẾT (đang tải). Chỗ gọi phải coi đó là "chưa chặn gì" chứ không phải
 * "không được" — khoá nhầm tính năng của người đã trả tiền còn tệ hơn để họ ăn một lần 402.
 *
 * Không có gói nào (`isError`, thường là 404) thì trả `false`: đó đúng là bước chặn ĐẦU TIÊN
 * của `AiUsageService.consume()` bên backend — không subscription là 402 ngay.
 *
 * Ghép từ hai query đã có sẵn trong cache (trang Gói dịch vụ dùng chung), nên không đẻ thêm
 * request nào trong luồng soạn tài liệu.  #Huynh
 */
export function useCanUseAi(): boolean | undefined {
  const plans = usePlans();
  const mine = useMySubscription();

  if (mine.isError) return false;
  if (!plans.data || !mine.data) return undefined;
  return plans.data.find((plan) => plan.id === mine.data.plan_id)?.can_use_ai ?? false;
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
