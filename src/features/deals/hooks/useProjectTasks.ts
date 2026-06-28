import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectByDeal,
  createProject,
  listTasks,
  createTask,
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
// Main hook — get-or-create project, then fetch tasks
// ---------------------------------------------------------------------------

/**
 * Loads (or auto-creates) the project for a deal, then fetches its tasks.
 * Returns tasks ready to pass to ProjectTaskPanel, plus the projectId for mutations.
 */
export function useProjectTasks(dealId: string | undefined) {
  return useQuery({
    queryKey: projectTaskKeys.all(dealId ?? ""),
    enabled: Boolean(dealId),
    queryFn: async () => {
      let project = await getProjectByDeal(dealId!);
      if (!project) {
        project = await createProject(dealId!, "Công việc dự án");
      }
      const taskData = await listTasks(project.id);
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
      createTask(projectId, title, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

/** Toggle task done/undone. */
export function useToggleTask(dealId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, is_done }: { taskId: string; is_done: boolean }) =>
      updateTask(projectId, taskId, { is_done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

/** Update task title and/or note. */
export function useUpdateTask(dealId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title, note }: { taskId: string; title?: string; note?: string }) =>
      updateTask(projectId, taskId, { title, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}

/** Delete a task. */
export function useDeleteTask(dealId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(projectId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectTaskKeys.all(dealId) });
    },
  });
}
