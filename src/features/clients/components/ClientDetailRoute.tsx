import { getRouteApi } from "@tanstack/react-router";

import { ClientDetailPage } from "@/features/clients/components/ClientDetailPage";

/** Cầu nối giữa route `/clients/$clientId` và màn chi tiết khách hàng — cùng lý do với
 *  `DealDetailRoute`: `lazyRouteComponent` cần component không tham số.  #Huynh */
const route = getRouteApi("/clients/$clientId");

export function ClientDetailRoute() {
  const { clientId } = route.useParams();
  return <ClientDetailPage clientId={clientId} />;
}
