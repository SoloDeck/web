import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminPlan,
  createAdminTemplate,
  deleteAdminPlan,
  listAiCosts,
  listAuditLogs,
  listAdminPlans,
  listAdminTemplates,
  listAdminUsers,
  overrideSubscription,
  reinstateAdminUser,
  suspendAdminUser,
  updateAdminPlan,
  updateAdminTemplate,
  updateAdminUser,
  getAdminLLMProvider,
  updateAdminLLMProvider,
  type AdminUpdateLLMProviderPayload,
  type AdminPlanPayload,
  type AdminTemplateCreatePayload,
  type AdminTemplateFilter,
  type AdminTemplateUpdatePayload,
  type AdminUpdateUserPayload,
} from "@/services/adminService";
import { getApiErrorMessage } from "@/lib/api-error";

export const adminKeys = {
  users: ["admin", "users"] as const,
  plans: ["admin", "plans"] as const,
  aiCosts: ["admin", "ai-costs"] as const,
  auditLogs: ["admin", "audit-logs"] as const,
  templates: ["admin", "templates"] as const,
  aiProvider: ["admin", "ai-provider"] as const,
};

export function useAdminTemplates(filter: AdminTemplateFilter = {}) {
  return useQuery({
    queryKey: [...adminKeys.templates, filter] as const,
    queryFn: () => listAdminTemplates(filter),
  });
}

export function useCreateAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTemplateCreatePayload) => createAdminTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.templates });
      toast.success("Đã tạo mẫu mới.");
    },
    onError: () => toast.error("Không tạo được mẫu. Vui lòng kiểm tra dữ liệu và thử lại."),
  });
}

export function useUpdateAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminTemplateUpdatePayload }) =>
      updateAdminTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.templates });
      toast.success("Đã cập nhật mẫu.");
    },
    onError: () => toast.error("Không cập nhật được mẫu. Vui lòng thử lại."),
  });
}

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
    // Backend nói RÕ sai chỗ nào ("Giá gói phải là 0đ hoặc nằm trong khoảng 1.000đ –
    // 50.000.000đ… Giá vừa nhập: 200đ"). Câu chung "kiểm tra dữ liệu và thử lại" ném đi
    // đúng thông tin duy nhất giúp quản trị viên sửa được, và chỉ giữ lại phần vô ích.  #Huynh
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không thể tạo gói. Vui lòng kiểm tra dữ liệu và thử lại."));
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật gói. Vui lòng thử lại."));
    },
  });
}

export function useDeleteAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deleteAdminPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.plans });
      toast.success("Đã xoá gói dịch vụ.");
    },
    // Backend là nơi biết gói có ai dùng không, và nó trả về câu nói rõ phải làm gì thay
    // thế ("…đã có 3 lượt đăng ký, 5 giao dịch. Hãy NGỪNG BÁN gói này…"). Đó chính là câu
    // cần hiện — không được thay bằng một câu chung chung.  #Huynh
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không xoá được gói. Vui lòng thử lại."));
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

/**
 * Admin đổi ai provider và model. Trung
 */
export function useAdminLLMProvider() {
  return useQuery({
    queryKey: adminKeys.aiProvider,
    queryFn: getAdminLLMProvider,
  });
}

export function useUpdateAdminLLMProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminUpdateLLMProviderPayload) =>
      updateAdminLLMProvider(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.aiProvider,
      });

      toast.success("Đã cập nhật AI provider và model.");
    },

    onError: () => {
      toast.error(
        "Không thể cập nhật AI provider và model. Vui lòng thử lại.",
      );
    },
  });
}