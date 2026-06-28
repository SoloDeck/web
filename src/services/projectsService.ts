import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { ProjectTask } from "@/features/deals/types";

// ---------------------------------------------------------------------------
// Backend response types
// ---------------------------------------------------------------------------

type ProjectResponse = {
  id: string;
  deal_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type TaskResponse = {
  id: string;
  project_id: string;
  title: string;
  note: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
};

type TaskListResponse = {
  tasks: TaskResponse[];
  total: number;
  done: number;
  percent: number;
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapTask(t: TaskResponse): ProjectTask {
  return {
    id: t.id,
    title: t.title,
    note: t.note ?? "",
    status: t.is_done ? "done" : "todo",
    completed: t.is_done,
    createdAt: t.created_at,
    completedAt: t.is_done ? t.updated_at : null,
    dueDate: null, // backend does not support dueDate
  };
}

// ---------------------------------------------------------------------------
// Project service functions
// ---------------------------------------------------------------------------

/** GET /projects?deal_id=... — returns the first project for a deal, or null. */
export async function getProjectByDeal(dealId: string): Promise<ProjectResponse | null> {
  const { data } = await axiosClient.get<ApiResponse<ProjectResponse[]>>("/projects", {
    params: { deal_id: dealId },
  });
  return data.data?.[0] ?? null;
}

/** POST /projects — creates a project linked to a deal. */
export async function createProject(dealId: string, title: string): Promise<ProjectResponse> {
  const { data } = await axiosClient.post<ApiResponse<ProjectResponse>>("/projects", {
    deal_id: dealId,
    title,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Task service functions
// ---------------------------------------------------------------------------

/** GET /projects/{id}/tasks — returns tasks with completion stats. */
export async function listTasks(projectId: string): Promise<{
  tasks: ProjectTask[];
  total: number;
  done: number;
  percent: number;
}> {
  const { data } = await axiosClient.get<ApiResponse<TaskListResponse>>(
    `/projects/${projectId}/tasks`
  );
  const raw = data.data;
  return {
    tasks: (raw.tasks ?? []).map(mapTask),
    total: raw.total,
    done: raw.done,
    percent: raw.percent,
  };
}

/** POST /projects/{id}/tasks — creates a new task. */
export async function createTask(
  projectId: string,
  title: string,
  note?: string
): Promise<ProjectTask> {
  const { data } = await axiosClient.post<ApiResponse<TaskResponse>>(
    `/projects/${projectId}/tasks`,
    { title, note: note || undefined }
  );
  return mapTask(data.data);
}

/** PATCH /projects/{id}/tasks/{taskId} — updates a task. */
export async function updateTask(
  projectId: string,
  taskId: string,
  payload: { title?: string; note?: string; is_done?: boolean }
): Promise<ProjectTask> {
  const { data } = await axiosClient.patch<ApiResponse<TaskResponse>>(
    `/projects/${projectId}/tasks/${taskId}`,
    payload
  );
  return mapTask(data.data);
}

/** DELETE /projects/{id}/tasks/{taskId} — deletes a task. */
export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await axiosClient.delete(`/projects/${projectId}/tasks/${taskId}`);
}
