import { useQuery } from "@tanstack/react-query";
import { listPlans, getMySubscription } from "@/services/subscriptionsService";

export const subscriptionKeys = {
  plans: ["subscriptions", "plans"] as const,
  mine: ["subscriptions", "me"] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: listPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: getMySubscription,
  });
}
