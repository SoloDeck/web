export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type TaskOwner = 'project' | 'deal' | 'reminder'

export interface ChecklistItemResponse {
  id: string
  task_id: string
  text: string
  is_done: boolean
  position: number
}

export interface TaskResponse {
  id: string
  entity_type: TaskOwner
  entity_id: string
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  deadline: string | null
  checklist_items: ChecklistItemResponse[]
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  title: string
  description?: string | null
  priority?: Priority
  deadline?: string | null
}

export interface UpdateTaskRequest {
  title?: string
  description?: string | null
  priority?: Priority
  status?: TaskStatus
  deadline?: string | null
}

export interface CreateChecklistItemRequest {
  text: string
  position?: number
}

export interface UpdateChecklistItemRequest {
  text?: string
  is_done?: boolean
  position?: number
}
