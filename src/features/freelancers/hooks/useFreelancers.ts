import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getFreelancers } from "@/features/freelancers/services/mockFreelancersApi";
import type { GetFreelancersParams } from "@/features/freelancers/types";

export function useFreelancers(params: GetFreelancersParams = {}) {
  const categoryIds = [...(params.categoryIds ?? [])].sort();
  const search = params.search?.trim() ?? "";

  return useQuery({
    queryKey: ["freelancers", { categoryIds, search }],
    queryFn: () => getFreelancers({ categoryIds, search }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
