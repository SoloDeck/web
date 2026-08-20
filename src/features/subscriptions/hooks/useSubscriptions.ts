import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forgetIntent } from "@/features/subscriptions/lib/intentStorage";
import { getApiErrorStatus } from "@/lib/api-error";
import { pollDeadline, pollIntervalMs } from "@/features/subscriptions/lib/pollPlan";
import {
  cancelPaymentIntent,
  createCheckout,
  getMySubscription,
  getPaymentIntent,
  listPlans,
  SETTLED_PAYMENT_STATUSES,
} from "@/services/subscriptionsService";
import type { PaymentIntentResponse } from "@/services/subscriptionsService";

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

/**
 * Mở một lần thanh toán. Chỗ gọi tự quyết định điều hướng hay mở màn chuyển khoản.
 *
 * `setQueryData` không phải tối ưu vặt: với cổng chuyển khoản, trang KHÔNG rời đi, nên nó
 * mở màn QR ngay lập tức trong khi `usePaymentIntent` còn chưa kịp gọi GET lần nào —
 * `data` là `undefined` và màn QR chớp một khung rỗng (không QR, không số tài khoản).
 *
 * Response của POST và của GET là **cùng một schema**, nên dùng luôn nó làm dữ liệu đầu
 * tiên cho query. Nhờ vậy đường "vừa tạo đơn" và đường "vừa F5" dùng chung đúng một mạch
 * code, chỉ khác ở chỗ ai nạp dữ liệu đầu.  #Huynh
 */
export function useCreateCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCheckout,
    onSuccess: (intent) => {
      qc.setQueryData(subscriptionKeys.intent(intent.id), intent);
    },
  });
}

/**
 * Huỷ một đơn còn treo.
 *
 * Cần thiết vì giờ có ba cổng: người dùng chọn chuyển khoản, đổi ý muốn trả bằng ví, mà
 * không có đường huỷ thì đơn cũ nằm lại trong sessionStorage và banner cứ báo "đang chờ
 * thanh toán" cho tới khi hết hạn.
 */
export function useCancelPaymentIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelPaymentIntent,
    onSuccess: (intent) => {
      qc.setQueryData(subscriptionKeys.intent(intent.id), intent);
      forgetIntent();
    },
  });
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
 * Có TRẦN thời gian, và trần đó KHÁC NHAU THEO CỔNG (xem `lib/pollPlan.ts`): cổng chuyển
 * hướng chỉ chờ hai phút vì tiền đã trả xong từ trước, còn chuyển khoản phải chờ tới lúc
 * đơn hết hạn — người dùng đang mở app ngân hàng, đăng nhập, nhập số, xác thực. Dùng chung
 * hai phút cho cả hai là mọi đơn chuyển khoản đều kết thúc bằng màn "hết giờ" sai sự thật.
 */
export function usePaymentIntent(intentId: string | null) {
  const qc = useQueryClient();
  // Lưu ID của intent đã hết giờ chứ không phải một cờ boolean: đổi sang intent khác là
  // đồng hồ tự tính lại, khỏi phải setState reset ngay trong effect.
  const [timedOutFor, setTimedOutFor] = useState<string | null>(null);
  // Mốc bắt đầu dò của ĐƠN NÀY. Giữ trong `ref` chứ không phải state, vì nó CHỈ được đọc
  // bên trong hẹn giờ dưới đây — ghi ref không kéo theo lượt render nào.
  //
  // Để nó là state thì kẹt giữa hai luật ngược nhau: gán trong render là gọi `Date.now()`
  // giữa render (không thuần khiết), còn gán trong effect là setState đồng bộ (render dây
  // chuyền). Ref thoát cả hai mà không phải tắt luật nào.
  const startedAtRef = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });

  const cached = qc.getQueryData<PaymentIntentResponse>(subscriptionKeys.intent(intentId ?? ""));
  // Bóc ra HAI TRƯỜNG chứ không để cả object vào dep: `data` đổi identity sau MỖI nhịp dò,
  // nên để nguyên object là dựng lại đồng hồ mỗi 3 giây và hạn không bao giờ tới. Hai
  // trường này thì bất biến trong đời một đơn, đổi đúng một lần lúc dữ liệu về.
  const provider = cached?.provider;
  const expiresAt = cached?.expires_at;

  useEffect(() => {
    if (!intentId) return;
    // Chỉ lấy mốc mới khi ĐỔI SANG ĐƠN KHÁC. Effect này còn chạy lại lúc dữ liệu đơn về,
    // mà lần đó phải giữ nguyên mốc cũ chứ không được tính lại từ đầu.
    if (startedAtRef.current.id !== intentId) {
      startedAtRef.current = { id: intentId, at: Date.now() };
    }
    const deadlineAt = pollDeadline(
      startedAtRef.current.at,
      provider && expiresAt ? { provider, expires_at: expiresAt } : undefined
    );
    // `Math.max(0, …)` chứ không rẽ nhánh gọi thẳng `setTimedOutFor`: hạn đã qua từ trước
    // (đơn khôi phục sau F5) vẫn phải đi qua một hẹn giờ 0ms. Gọi thẳng là setState đồng bộ
    // ngay trong effect, kéo theo một lượt render dây chuyền — và eslint chặn đúng chỗ đó.
    const timer = setTimeout(
      () => setTimedOutFor(intentId),
      Math.max(0, deadlineAt - Date.now())
    );
    return () => clearTimeout(timer);
  }, [intentId, provider, expiresAt]);

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
      // Thưa dần: chuyển khoản dò tới 30 phút, giữ nhịp 3 giây suốt là 600 lượt gọi cho
      // MỘT đơn. Phút đầu vẫn dày vì đó là lúc người dùng đang nhìn màn hình.
      // Đọc ref trong callback thì hợp lệ (không phải lúc render). `|| Date.now()` để phòng
      // lượt gọi nào rơi vào trước khi effect kịp đặt mốc: coi như vừa bắt đầu, tức nhịp dày
      // nhất — sai về phía an toàn.
      const batDau = startedAtRef.current.at || Date.now();
      return pollIntervalMs(Date.now() - batDau);
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
