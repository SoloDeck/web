import { createFileRoute } from "@tanstack/react-router";
import { FreelancerProfilePage } from "@/features/freelancers/components/FreelancerProfilePage";

// Route public: khách xem hồ sơ freelancer mà không cần đăng nhập.
export const Route = createFileRoute("/freelancer/$id")({
  component: PublicFreelancerProfile,
});

// eslint-disable-next-line react-refresh/only-export-components
function PublicFreelancerProfile() {
  const { id } = Route.useParams();
  return <FreelancerProfilePage id={id} />;
}
