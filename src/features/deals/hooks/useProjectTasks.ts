import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectByDeal,
  createProject,
  listProjectTasks,
  createProjectTask,
  updateTask,
  deleteTask,
} from "@/services/projectsService";

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
