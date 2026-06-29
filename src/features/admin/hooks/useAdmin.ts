import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminPlan,
  listAdminPlans,
  listAdminUsers,
  updateAdminPlan,
  updateAdminUser,
  type AdminPlanPayload,
  type AdminUpdateUserPayload,
} from "@/services/adminService";

export const adminKeys = {
  users: ["admin", "users"] as const,
  plans: ["admin", "plans"] as const,
};

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: listAdminUsers,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateUserPayload }) =>
      updateAdminUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      toast.success("Đã cập nhật tài khoản người dùng.");
    },
    onError: () => {
      toast.error("Không thể cập nhật tài khoản. Vui lòng thử lại.");
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: adminKeys.plans,
    queryFn: listAdminPlans,
  });
}

export function useCreateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminPlanPayload) => createAdminPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.plans });
      toast.success("Đã tạo gói dịch vụ mới.");
    },
    onError: () => {
      toast.error("Không thể tạo gói. Vui lòng kiểm tra dữ liệu và thử lại.");
    },
  });
}

export function useUpdateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminPlanPayload }) =>
      updateAdminPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.plans });
      toast.success("Đã cập nhật gói dịch vụ.");
    },
    onError: () => {
      toast.error("Không thể cập nhật gói. Vui lòng thử lại.");
    },
  });
}
