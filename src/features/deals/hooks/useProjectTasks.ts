import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectByDeal,
  createProject,
  listProjectTasks,
  createProjectTask,
  updateTask,
  deleteTask,
} from "@/services/projectsService";
import {
  createInvoiceForTask,
  recordInvoicePayment,
  sendInvoice,
  type PaymentPayload,
} from "@/services/invoicesService";
import { invoiceKeys } from "@/features/deals/hooks/useInvoices";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const projectTaskKeys = {
  all: (dealId: string) => ["project-tasks", dealId] as const,
};

// ---------------------------------------------------------------------------
// Main hook — get/create project for the deal, then fetch tasks under that project
// ---------------------------------------------------------------------------

/**
 * Requirement chính của SoloDesk là Deal -> Project -> Task.
 * Vì vậy tab Công việc luôn lấy project theo deal trước, rồi mới lấy task của project đó.
 */
export function useProjectTasks(dealId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: projectTaskKeys.all(dealId ?? ""),
    enabled: Boolean(dealId) && enabled,
    queryFn: async () => {
      let project = await getProjectByDeal(dealId!);
      if (!project) {
        // Nếu BE chưa auto tạo project cho deal này, FE tạo project đúng payload `name`.
        project = await createProject(dealId!, "Công việc dự án");
      }
      const taskData = await listProjectTasks(project.id);
      return { projectId: project.id, ...taskData };
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Add a new task to the deal's project. */
export function useAddTask(dealId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, note }: { title: string; note: string }) =>
      createProjectTask(projectId, title, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

/** Toggle task done/undone. */
export function useToggleTask(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, is_done }: { taskId: string; is_done: boolean }) =>
      updateTask(taskId, { status: is_done ? "done" : "todo" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

/** Update task title and/or note. */
export function useUpdateTask(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title, note }: { taskId: string; title?: string; note?: string }) =>
      updateTask(taskId, { title, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Hóa đơn của mốc "Thu tiền:"
// ---------------------------------------------------------------------------

/**
 * Sau mọi thao tác hóa đơn phải làm mới CẢ HAI danh sách.
 *
 * Cùng một hóa đơn hiện ở hai chỗ: hàng task trong tab Công việc, và dòng chứng từ trong tab
 * Tài liệu. Chỉ nạp lại một bên thì người dùng bấm gửi ở tab này rồi mở tab kia thấy vẫn "Bản
 * nháp" — tưởng bấm hụt nên bấm lại, mà bấm lại là gửi cho khách lá thư thứ hai.  #Huynh
 */
function useRefreshTaskAndInvoices(dealId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    qc.invalidateQueries({ queryKey: invoiceKeys.deal(dealId) });
  };
}

/** Xuất hóa đơn cho một mốc thu tiền. Số tiền do server tính, FE không gửi đồng nào. */
export function useCreateTaskInvoice(dealId: string) {
  const refresh = useRefreshTaskAndInvoices(dealId);
  return useMutation({
    mutationFn: (taskId: string) => createInvoiceForTask(taskId),
    onSuccess: refresh,
  });
}

/** Gửi hóa đơn cho khách qua email (thư đi thật, kèm mã QR đã gắn sẵn số tiền). */
export function useSendTaskInvoice(dealId: string) {
  const refresh = useRefreshTaskAndInvoices(dealId);
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(invoiceId),
    onSuccess: refresh,
  });
}

/**
 * Ghi nhận khách đã trả tiền cho hóa đơn của mốc này.
 *
 * Đây là mắt xích mà luồng cũ bỏ quên: tick task nghĩa là tiền đã về, nhưng nếu không ai cập
 * nhật `amount_paid` thì hóa đơn nằm mãi ở "đã gửi" và bảng doanh thu không bao giờ đúng.
 */
export function useRecordTaskPayment(dealId: string) {
  const refresh = useRefreshTaskAndInvoices(dealId);
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: PaymentPayload }) =>
      recordInvoicePayment(invoiceId, payload),
    onSuccess: refresh,
  });
}

/** Delete a task. */
export function useDeleteTask(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}
