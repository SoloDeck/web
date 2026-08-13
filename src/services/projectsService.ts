import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { ProjectTask } from "@/features/deals/types";

// ---------------------------------------------------------------------------
// Backend response types
// ---------------------------------------------------------------------------

type ProjectResponse = {
  id: string;
  deal_id: string | null;
  owner_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  task_count: number;
  done_count: number;
  created_at: string;
  updated_at: string;
};

type TaskResponse = {
  id: string;
  entity_type: "project" | "deal" | "reminder";
  entity_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "review" | "done";
  deadline: string | null;
  checklist_items: unknown[];
  // Số tiền phải thu của task. KHÔNG NULL = đây là task THU TIỀN, sinh từ một hạng mục chi
  // phí của báo giá đã chốt. Đây là dấu nhận biết CHÍNH THỨC, thay cho việc dò tiền tố tên
  // `"Thu tiền:"` như trước — freelancer đổi tên task thì tiền vẫn còn nguyên.
  //
  // Chuỗi Decimal ("12000000.00") chứ không phải number, xem ghi chú ở `mapTask`.
  billing_amount: string | number | null;
  // Chỉ có với task thu tiền ĐÃ xuất hóa đơn. Backend trả sẵn để hàng task vẽ được nhãn
  // trạng thái mà không phải gọi thêm một vòng API cho từng dòng.
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total: string | number;
    amount_paid: string | number;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaginatedApiResponse<T> = {
  success: boolean;
  code: number;
  timestamp: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapTask(t: TaskResponse): ProjectTask {
  const completed = t.status === "done";
  return {
    id: t.id,
    title: t.title,
    note: t.description ?? "",
    status: completed ? "done" : "todo",
    completed,
    createdAt: t.created_at,
    completedAt: completed ? t.updated_at : null,
    dueDate: t.deadline,
    priority: t.priority,
    // `Number()` chứ không tin kiểu sẵn: backend trả tiền dạng CHUỖI Decimal ("10000000.00").
    // Đây đúng cái bẫy đã làm gói 0đ hiện nút mua hồi 30/07 — khai `number` rồi so sánh trực
    // tiếp thì luôn sai.  #Huynh
    //
    // `?? null` chứ KHÔNG `Number(x) || null`: hạng mục 0 đồng vẫn là task thu tiền, mà
    // `Number(0) || null` biến nó thành task thường — mất khỏi guard đóng dự án, im lặng.
    billingAmount: t.billing_amount === null || t.billing_amount === undefined
      ? null
      : Number(t.billing_amount),
    invoice: t.invoice
      ? {
          id: t.invoice.id,
          invoiceNumber: t.invoice.invoice_number,
          status: t.invoice.status,
          total: Number(t.invoice.total),
          amountPaid: Number(t.invoice.amount_paid),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Project service functions
// ---------------------------------------------------------------------------

/** GET /projects?deal_id=... — returns the first project for a deal, or null. */
export async function getProjectByDeal(dealId: string): Promise<ProjectResponse | null> {
  const { data } = await axiosClient.get<PaginatedApiResponse<ProjectResponse>>("/projects", {
    params: { deal_id: dealId },
  });
  return data.data?.[0] ?? null;
}

/** POST /projects — creates a project linked to a deal. */
export async function createProject(dealId: string, name: string): Promise<ProjectResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProjectResponse>>("/projects", {
    deal_id: dealId,
    name,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Task service functions
// ---------------------------------------------------------------------------

/** GET /projects/{id}/tasks — lấy task thuộc project của deal. */
export async function listProjectTasks(projectId: string): Promise<{
  tasks: ProjectTask[];
  total: number;
  done: number;
  percent: number;
}> {
  const { data } = await axiosClient.get<PaginatedApiResponse<TaskResponse>>(`/projects/${projectId}/tasks`, {
    params: { page_size: 100 },
  });
  const tasks = (data.data ?? []).map(mapTask);
  const total = data.pagination?.total ?? tasks.length;
  const done = tasks.filter((task) => task.completed).length;

  return {
    tasks,
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** POST /projects/{id}/tasks — tạo task thuộc project của deal. */
export async function createProjectTask(
  projectId: string,
  title: string,
  note?: string
): Promise<ProjectTask> {
  const { data } = await axiosClient.post<ApiResponse<TaskResponse>>(
    `/projects/${projectId}/tasks`,
    { title, description: note || undefined }
  );
  return mapTask(data.data);
}

/** PATCH /tasks/{taskId} — cập nhật task bằng endpoint direct của backend. */
export async function updateTask(
  taskId: string,
  payload: { title?: string; note?: string; status?: "todo" | "done" }
): Promise<ProjectTask> {
  const requestPayload = {
    title: payload.title,
    description: payload.note,
    status: payload.status,
  };
  const { data } = await axiosClient.patch<ApiResponse<TaskResponse>>(
    `/tasks/${taskId}`,
    requestPayload
  );
  return mapTask(data.data);
}

/** DELETE /tasks/{taskId} — xóa task bằng endpoint direct của backend. */
export async function deleteTask(taskId: string): Promise<void> {
  await axiosClient.delete(`/tasks/${taskId}`);
}
