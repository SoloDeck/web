import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminPlan,
  listAiCosts,
  listAuditLogs,
  listAdminPlans,
  listAdminUsers,
  overrideSubscription,
  reinstateAdminUser,
  suspendAdminUser,
  updateAdminPlan,
  updateAdminUser,
  type AdminPlanPayload,
  type AdminUpdateUserPayload,
} from "@/services/adminService";

export const adminKeys = {
  users: ["admin", "users"] as const,
  plans: ["admin", "plans"] as const,
  aiCosts: ["admin", "ai-costs"] as const,
  auditLogs: ["admin", "audit-logs"] as const,
};

export function useAiCosts() {
  return useQuery({ queryKey: adminKeys.aiCosts, queryFn: listAiCosts });
}

export function useAuditLogs() {
  return useQuery({ queryKey: adminKeys.auditLogs, queryFn: listAuditLogs });
}

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

/**
 * Admin đổi gói cho một freelancer.
 *
 * Freelancer KHÔNG tự nâng cấp được — tự nâng cấp đòi cổng thanh toán thật, nằm ngoài
 * phạm vi đồ án. Admin thu tiền ngoài hệ thống rồi kích hoạt ở đây.  #Huynh
 */
export function useOverrideSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, planId }: { subscriptionId: string; planId: string }) =>
      overrideSubscription(subscriptionId, { plan_id: planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      toast.success("Đã đổi gói cho người dùng.");
    },
    onError: () => toast.error("Không đổi được gói. Vui lòng thử lại."),
  });
}

export function useSuspendAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => suspendAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      toast.success("Đã khoá tài khoản.");
    },
    onError: () => toast.error("Không khoá được tài khoản. Vui lòng thử lại."),
  });
}

export function useReinstateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => reinstateAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      toast.success("Đã mở khoá tài khoản.");
    },
    onError: () => toast.error("Không mở khoá được tài khoản. Vui lòng thử lại."),
  });
}
