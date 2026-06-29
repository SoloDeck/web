import axiosClient from "@/configs/axios"
import type {
  CreateProjectRequest,
  ProjectResponse,
  UpdateProjectRequest,
} from "@/features/projects/types"

export type GetProjectsParams = {
  deal_id?: string
  status?: ProjectResponse["status"]
}

export async function listProjects(params: GetProjectsParams = {}): Promise<ProjectResponse[]> {
  const { data } = await axiosClient.get<{ data: ProjectResponse[] }>("/projects", { params })
  return data.data ?? []
}

export async function createProject(body: CreateProjectRequest): Promise<ProjectResponse> {
  const { data } = await axiosClient.post<{ data: ProjectResponse }>("/projects", body)
  return data.data
}

export async function getProject(projectId: string): Promise<ProjectResponse> {
  const { data } = await axiosClient.get<{ data: ProjectResponse }>(`/projects/${projectId}`)
  return data.data
}

export async function updateProject(
  projectId: string,
  body: UpdateProjectRequest
): Promise<ProjectResponse> {
  const { data } = await axiosClient.patch<{ data: ProjectResponse }>(`/projects/${projectId}`, body)
  return data.data
}

export async function deleteProject(projectId: string): Promise<void> {
  await axiosClient.delete(`/projects/${projectId}`)
}
