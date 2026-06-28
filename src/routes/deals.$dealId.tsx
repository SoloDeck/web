import { createFileRoute, redirect } from "@tanstack/react-router";
import { DealDetailPage } from "@/features/deals/components/DealDetailPage";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/deals/$dealId")({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
  },
  component: DealDetailRoute,
});

function DealDetailRoute() {
  const { dealId } = Route.useParams();
  return <DealDetailPage dealId={dealId} />;
}
