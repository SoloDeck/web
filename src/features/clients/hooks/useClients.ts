import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listClientCommLogs,
  type GetClientsParams,
  type ClientPayload,
} from "@/services/clientsService";

export function useClients(params: GetClientsParams = {}) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => getClients(params),
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: () => getClient(clientId!),
    enabled: Boolean(clientId),
  });
}

export function useClientCommLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ["clients", "comm-logs", clientId],
    queryFn: () => listClientCommLogs(clientId!),
    enabled: Boolean(clientId),
  });
}

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

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientPayload }) =>
      updateClient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Đã cập nhật thông tin khách hàng.");
    },
    onError: () => {
      toast.error("Không thể cập nhật khách hàng. Vui lòng thử lại.");
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Đã xóa khách hàng.");
    },
    onError: () => {
      toast.error("Không thể xóa khách hàng. Vui lòng thử lại.");
    },
  });
}
