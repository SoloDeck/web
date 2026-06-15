import { createFileRoute } from "@tanstack/react-router";
import { IntakeForm } from "@/features/intake/components/IntakeForm";

// Public, unauthenticated route — no beforeLoad auth guard. The owner is
// resolved server-side from the share token in the path.
export const Route = createFileRoute("/intake/$token")({
  component: IntakePage,
});

// eslint-disable-next-line react-refresh/only-export-components
function IntakePage() {
  const { token } = Route.useParams();
  return <IntakeForm shareToken={token} />;
}
