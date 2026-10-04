import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dealKeys } from "@/features/deals/hooks/useDeals";
import { lamMoiSoLieuTien } from "@/features/revenue/hooks/useAnalytics";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listClientCommLogs,
  createClientCommLog,
  type GetClientsParams,
  type ClientPayload,
  type ClientCommLogPayload,
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

export function useCreateClientCommLog(clientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientCommLogPayload) =>
      createClientCommLog(clientId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", "comm-logs", clientId] });
      toast.success("Đã ghi nhận lịch sử tương tác.");
    },
    onError: () => {
      toast.error("Không thể lưu lịch sử tương tác. Vui lòng thử lại.");
    },
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

/**
 * `archiving` = lần lưu này CHUYỂN khách sang Lưu trữ (chưa lưu trữ từ trước). Backend khi đó tự đưa
 * các dự án đang chạy của khách vào Kho lưu trữ (Không thành công) — nên danh sách dự án, kho, tỷ lệ
 * thắng và các số tiền đều đổi theo và phải được làm mới.  #Huynh
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ClientPayload;
      archiving?: boolean;
    }) => updateClient(id, payload),
    onSuccess: (_client, { archiving }) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (archiving) {
        queryClient.invalidateQueries({ queryKey: dealKeys.all });
        lamMoiSoLieuTien(queryClient);
        toast.success(
          "Đã lưu trữ khách hàng. Các dự án đang chạy của khách đã chuyển vào Kho lưu trữ."
        );
        return;
      }
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
