import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { DealDetailPage } from "@/features/deals/components/DealDetailPage";

/**
 * Cầu nối giữa route `/deals/$dealId` và màn chi tiết deal.
 *
 * Cần một component KHÔNG tham số thì `lazyRouteComponent` mới dựng được, mà `DealDetailPage`
 * lại nhận `dealId` qua prop (nó còn được dùng ở chỗ khác nên không đổi contract).
 *
 * `getRouteApi` chứ không phải `Route.useParams()`: import `Route` từ file route ở đây sẽ
 * dựng lại đúng cạnh phụ thuộc mà việc tách mã đang cắt.  #Huynh
 */
const route = getRouteApi("/deals/$dealId");

export function DealDetailRoute() {
  const { dealId } = route.useParams();
  const search = route.useSearch();
  const navigate = useNavigate();
  return (
    <DealDetailPage
      dealId={dealId}
      initialTab={search.tab}
      focusInvoiceId={search.invoice}
      focusReminderId={search.reminder}
      // Mở hoá đơn xong thì gỡ `?invoice=` khỏi URL (thay thế, không thêm lịch sử): để nguyên
      // thì mỗi lần tải lại trang cửa sổ hoá đơn lại bật lên dù người dùng đã đóng.
      onInvoiceFocusHandled={() =>
        navigate({
          to: "/deals/$dealId",
          params: { dealId },
          search: { tab: search.tab, reminder: search.reminder },
          replace: true,
        })
      }
    />
  );
}
