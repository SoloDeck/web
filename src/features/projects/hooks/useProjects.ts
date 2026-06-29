import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type GetProjectsParams,
} from "@/features/projects/api/projectsService"
import type { CreateProjectRequest, UpdateProjectRequest } from "@/features/projects/types"

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: GetProjectsParams) => [...projectKeys.lists(), params] as const,
  detail: (projectId: string) => [...projectKeys.all, "detail", projectId] as const,
}

export function useProjects(params: GetProjectsParams = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => listProjects(params),
  })
}

export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ""),
    queryFn: () => getProject(projectId ?? ""),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => createProject(body),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.setQueryData(projectKeys.detail(project.id), project)
    },
    onError: () => {
      toast.error("Không thể tạo dự án. Vui lòng thử lại.")
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: UpdateProjectRequest }) =>
      updateProject(projectId, body),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.setQueryData(projectKeys.detail(project.id), project)
    },
    onError: () => {
      toast.error("Không thể cập nhật dự án. Vui lòng thử lại.")
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
    onError: () => {
      toast.error("Không thể xoá dự án. Vui lòng thử lại.")
    },
  })
}
