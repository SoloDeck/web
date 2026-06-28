import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { ClientDetailPage } from "@/features/clients/components/ClientDetailPage";

export const Route = createFileRoute("/clients/$clientId")({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
  },
  component: ClientDetailRoute,
});

function ClientDetailRoute() {
  const { clientId } = Route.useParams();
  return <ClientDetailPage clientId={clientId} />;
}
