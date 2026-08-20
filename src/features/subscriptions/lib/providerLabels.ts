import type { PaymentProvider } from "@/services/subscriptionsService";

/**
 * Tên cổng để hiện ra màn hình.
 *
 * Gom một chỗ vì trước đây chữ "MoMo" nằm cứng ở SÁU chỗ trong `SubscriptionPage.tsx` —
 * từ câu chặn hạn mức tới câu báo lỗi tới chân trang. Thêm cổng thứ hai là mỗi chỗ đó
 * thành một lời nói dối: người trả bằng ZaloPay đọc thấy "đang xác nhận với MoMo".
 */
export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  momo: "MoMo",
  zalopay: "ZaloPay",
  sepay: "SePay",
};

/** Tên cổng của một đơn, an toàn khi chưa biết đơn nào. */
export function providerLabel(provider: PaymentProvider | undefined): string {
  return provider ? PROVIDER_LABEL[provider] : "cổng thanh toán";
}
