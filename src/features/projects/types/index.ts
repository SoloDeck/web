export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

export interface ProjectResponse {
  id: string
  deal_id: string | null
  owner_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  task_count: number
  done_count: number
  created_at: string
  updated_at: string
}

export interface CreateProjectRequest {
  deal_id?: string | null
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
}

export interface UpdateProjectRequest {
  name?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: ProjectStatus
}
