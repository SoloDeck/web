import { getRouteApi } from "@tanstack/react-router";

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
  return <DealDetailPage dealId={dealId} />;
}
