import { createFileRoute } from "@tanstack/react-router";
import { PublicSharePage } from "@/features/intake/components/PublicSharePage";

// Public, unauthenticated route — no beforeLoad auth guard. The owner is
// resolved server-side from the share token in the path.
//
// Giữ lại vì link cũ dạng /intake/{token} đã được phát ra ngoài; render cùng trang với
// /ho-so và /bieu-mau.
export const Route = createFileRoute("/intake/$token")({
  component: IntakePage,
});

// eslint-disable-next-line react-refresh/only-export-components
function IntakePage() {
  const { token } = Route.useParams();
  return <PublicSharePage shareToken={token} />;
}
