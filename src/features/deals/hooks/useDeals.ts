import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeals } from "@/services/dealsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";

/**
 * Loads the pipeline via React Query and seeds the Zustand board store with
 * the result. Components read the live, drag-and-drop-mutable list from
 * `useDealStore`; this hook owns the server fetch, caching and load/error state.
 */
export function useDeals() {
  const query = useQuery({ queryKey: ["deals"], queryFn: getDeals });
  const hydrate = useDealStore((s) => s.hydrate);
  const deals = useDealStore((s) => s.deals);

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data, hydrate]);

  return {
    deals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
