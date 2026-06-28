import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listFreelancers } from "@/services/freelancersService";
import type { GetFreelancersParams } from "@/features/freelancers/types";

export function useFreelancers(params: GetFreelancersParams = {}) {
  const categoryIds = [...(params.categoryIds ?? [])].sort();
  const search = params.search?.trim() ?? "";

  return useQuery({
    queryKey: ["freelancers", { categoryIds, search }],
    queryFn: () => listFreelancers({ categoryIds, search }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
