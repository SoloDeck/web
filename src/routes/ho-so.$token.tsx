import { createFileRoute } from "@tanstack/react-router";
import { PublicSharePage } from "@/features/intake/components/PublicSharePage";

// Trang công khai của freelancer. Ba đường dẫn (/ho-so, /bieu-mau, /intake) cùng render một
// trang: hồ sơ ở trên, biểu mẫu tiếp nhận ngay dưới.
export const Route = createFileRoute("/ho-so/$token")({
  component: PublicProfileRoute,
});

// eslint-disable-next-line react-refresh/only-export-components
function PublicProfileRoute() {
  const { token } = Route.useParams();
  return <PublicSharePage shareToken={token} />;
}
