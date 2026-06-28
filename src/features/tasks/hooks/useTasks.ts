import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  addChecklistItem,
  createTask,
  deleteTask,
  listTasks,
  updateChecklistItem,
  updateTask,
  type TaskEntityType,
} from "@/features/tasks/api/tasksService"
import type {
  CreateChecklistItemRequest,
  CreateTaskRequest,
  TaskResponse,
  UpdateTaskRequest,
} from "@/features/tasks/types"

export const taskKeys = {
  all: ["tasks"] as const,
  entity: (entityType: TaskEntityType, entityId: string) =>
    [...taskKeys.all, entityType, entityId] as const,
  detail: (taskId: string) => [...taskKeys.all, "detail", taskId] as const,
}

function invalidateTaskLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: taskKeys.all })
  queryClient.invalidateQueries({ queryKey: ["projects"] })
}

export function useTasks(entityType: TaskEntityType, entityId: string) {
  return useQuery({
    queryKey: taskKeys.entity(entityType, entityId),
    queryFn: () => listTasks(entityType, entityId),
    enabled: Boolean(entityId),
  })
}

export function useCreateTask(entityType: TaskEntityType, entityId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTaskRequest) => createTask(entityType, entityId, body),
    onSuccess: () => {
      invalidateTaskLists(queryClient)
    },
    onError: () => {
      toast.error("Không thể tạo công việc. Vui lòng thử lại.")
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: UpdateTaskRequest }) =>
      updateTask(taskId, body),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task)
      invalidateTaskLists(queryClient)
    },
    onError: () => {
      toast.error("Không thể cập nhật công việc. Vui lòng thử lại.")
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, status }: Pick<TaskResponse, "status"> & { taskId: string }) =>
      updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all })
      const snapshots = queryClient.getQueriesData<TaskResponse[]>({ queryKey: taskKeys.all })

      snapshots.forEach(([queryKey, tasks]) => {
        if (!tasks) return
        queryClient.setQueryData(
          queryKey,
          tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
        )
      })

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, tasks]) => {
        queryClient.setQueryData(queryKey, tasks)
      })
      toast.error("Không thể cập nhật trạng thái công việc. Đã hoàn tác.")
    },
    onSettled: () => {
      invalidateTaskLists(queryClient)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      invalidateTaskLists(queryClient)
    },
    onError: () => {
      toast.error("Không thể xoá công việc. Vui lòng thử lại.")
    },
  })
}

export function useAddChecklistItem(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateChecklistItemRequest) => addChecklistItem(taskId, body),
    onSuccess: () => {
      invalidateTaskLists(queryClient)
    },
    onError: () => {
      toast.error("Không thể thêm mục kiểm tra. Vui lòng thử lại.")
    },
  })
}

export function useToggleChecklistItem(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, is_done }: { itemId: string; is_done: boolean }) =>
      updateChecklistItem(taskId, itemId, { is_done }),
    onSuccess: () => {
      invalidateTaskLists(queryClient)
    },
    onError: () => {
      toast.error("Không thể cập nhật mục kiểm tra. Vui lòng thử lại.")
    },
  })
}
