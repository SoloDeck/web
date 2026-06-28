import axiosClient from "@/configs/axios"
import type {
  ChecklistItemResponse,
  CreateChecklistItemRequest,
  CreateTaskRequest,
  TaskResponse,
  UpdateChecklistItemRequest,
  UpdateTaskRequest,
} from "@/features/tasks/types"

export type TaskEntityType = "projects" | "deals" | "reminders"

export type GetTasksParams = {
  status?: TaskResponse["status"]
  priority?: TaskResponse["priority"]
}

function entityTasksPath(entityType: TaskEntityType, entityId: string) {
  return `/${entityType}/${entityId}/tasks`
}

export async function listTasks(
  entityType: TaskEntityType,
  entityId: string,
  params: GetTasksParams = {}
): Promise<TaskResponse[]> {
  const { data } = await axiosClient.get<{ data: TaskResponse[] }>(
    entityTasksPath(entityType, entityId),
    { params }
  )
  return data.data ?? []
}

export async function createTask(
  entityType: TaskEntityType,
  entityId: string,
  body: CreateTaskRequest
): Promise<TaskResponse> {
  const { data } = await axiosClient.post<{ data: TaskResponse }>(
    entityTasksPath(entityType, entityId),
    body
  )
  return data.data
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  const { data } = await axiosClient.get<{ data: TaskResponse }>(`/tasks/${taskId}`)
  return data.data
}

export async function updateTask(taskId: string, body: UpdateTaskRequest): Promise<TaskResponse> {
  const { data } = await axiosClient.patch<{ data: TaskResponse }>(`/tasks/${taskId}`, body)
  return data.data
}

export async function deleteTask(taskId: string): Promise<void> {
  await axiosClient.delete(`/tasks/${taskId}`)
}

export async function addChecklistItem(
  taskId: string,
  body: CreateChecklistItemRequest
): Promise<ChecklistItemResponse> {
  const { data } = await axiosClient.post<{ data: ChecklistItemResponse }>(
    `/tasks/${taskId}/checklist-items`,
    body
  )
  return data.data
}

export async function updateChecklistItem(
  taskId: string,
  itemId: string,
  body: UpdateChecklistItemRequest
): Promise<ChecklistItemResponse> {
  const { data } = await axiosClient.patch<{ data: ChecklistItemResponse }>(
    `/tasks/${taskId}/checklist-items/${itemId}`,
    body
  )
  return data.data
}

export async function deleteChecklistItem(taskId: string, itemId: string): Promise<void> {
  await axiosClient.delete(`/tasks/${taskId}/checklist-items/${itemId}`)
}
