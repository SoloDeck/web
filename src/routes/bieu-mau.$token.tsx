import { createFileRoute } from "@tanstack/react-router";
import { IntakeForm } from "@/features/intake/components/IntakeForm";

// Route public đúng với share_url backend trả về: /bieu-mau/{share_token}.
export const Route = createFileRoute("/bieu-mau/$token")({
  component: PublicIntakePage,
});

// eslint-disable-next-line react-refresh/only-export-components
function PublicIntakePage() {
  const { token } = Route.useParams();
  return <IntakeForm shareToken={token} />;
}
