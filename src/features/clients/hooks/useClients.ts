import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getClients,
  createClient,
  type GetClientsParams,
} from "@/services/clientsService";

/** GET /clients — list with optional server-side filters (status/name/email). */
export function useClients(params: GetClientsParams = {}) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => getClients(params),
  });
}

/** POST /clients — creates a client and refreshes the cached list. */
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => {
      toast.error("Không thể tạo khách hàng. Vui lòng thử lại.");
    },
  });
}
