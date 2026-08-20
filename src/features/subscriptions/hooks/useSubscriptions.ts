import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forgetIntent } from "@/features/subscriptions/lib/intentStorage";
import { getApiErrorStatus } from "@/lib/api-error";
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
 *
 * Có TRẦN thời gian: `SETTLED_PAYMENT_STATUSES` chỉ dừng vòng lặp khi backend thật sự chốt
 * trạng thái. Nếu IPN không bao giờ tới (MoMo im lặng, người dùng bỏ ngang, mạng đứt) thì
 * intent nằm mãi ở `pending` và trang hỏi lại 3 giây một lần cho tới khi tab bị đóng. Sau
 * `MAX_POLL_MS` thì ngừng hỏi và trả `pollTimedOut` để chỗ gọi nói cho người dùng biết,
 * thay vì quay spinner vô hạn.
 */
const MAX_POLL_MS = 2 * 60 * 1000;

export function usePaymentIntent(intentId: string | null) {
  const qc = useQueryClient();
  // Lưu ID của intent đã hết giờ chứ không phải một cờ boolean: đổi sang intent khác là
  // đồng hồ tự tính lại, khỏi phải setState reset ngay trong effect.
  const [timedOutFor, setTimedOutFor] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId) return;
    const timer = setTimeout(() => setTimedOutFor(intentId), MAX_POLL_MS);
    return () => clearTimeout(timer);
  }, [intentId]);

  const timedOut = intentId !== null && timedOutFor === intentId;

  const query = useQuery({
    queryKey: subscriptionKeys.intent(intentId ?? ""),
    queryFn: async () => {
      const intent = await getPaymentIntent(intentId!);
      if (intent.status === "succeeded") {
        qc.invalidateQueries({ queryKey: subscriptionKeys.mine });
      }
      return intent;
    },
    enabled: Boolean(intentId),
    // CỐ Ý không đặt `retry` ở đây. Đặt là đè lên `retry: 1` của app (configs/query-client.ts)
    // cho riêng một query — vừa lệch với phần còn lại, vừa thành hai nguồn sự thật khi ai đó
    // sửa cấu hình chung. Một lần thử lại thừa cho 404 là cái giá rẻ hơn nhiều.
    refetchInterval: (query) => {
      // Hỏng thì DỪNG. Bản trước chỉ xét `data`, mà lúc lỗi thì `data` là `undefined` nên
      // nhánh này rơi thẳng xuống `return 3000` — trang dò một mã đơn chết suốt 2 phút,
      // trong khi khối hiển thị trạng thái bọc trong `{intent && ...}` nên KHÔNG hiện gì.
      // Người dùng nhìn một màn hình đứng yên, không biết có chuyện gì đang xảy ra.
      if (query.state.status === "error") return false;
      const data = query.state.data;
      if (data && SETTLED_PAYMENT_STATUSES.includes(data.status)) return false;
      if (timedOut) return false;
      return 3000;
    },
  });

  const settled = query.data ? SETTLED_PAYMENT_STATUSES.includes(query.data.status) : false;

  // Mã đơn tra không ra thì QUÊN nó đi, bằng không nó nằm lại sessionStorage và mọi lần mở
  // trang sau đó trong cùng tab lại kẹt y như vậy cho tới khi hết TTL 15 phút.
  //
  // Ca thật gặp phải: mở trang bằng link có sẵn `?intent=` của một tài khoản khác. Trang dò
  // mãi, 404 mãi, và không bao giờ nhìn thấy giao dịch THẬT mà người dùng vừa tạo.  #Huynh
  const unresolvable = getApiErrorStatus(query.error) === 404;
  useEffect(() => {
    if (unresolvable) forgetIntent();
  }, [unresolvable]);

  return { ...query, pollTimedOut: timedOut && !settled, intentUnresolvable: unresolvable };
}
