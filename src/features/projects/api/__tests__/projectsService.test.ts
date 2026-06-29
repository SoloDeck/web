import { beforeEach, describe, expect, it, vi } from "vitest"
import axiosClient from "@/configs/axios"
import {
  createProject,
  getProject,
  listProjects,
} from "@/features/projects/api/projectsService"
import type { ProjectResponse } from "@/features/projects/types"

vi.mock("@/configs/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const project: ProjectResponse = {
  id: "p1",
  deal_id: "d1",
  owner_id: "u1",
  name: "Website",
  description: null,
  start_date: null,
  end_date: null,
  status: "active",
  task_count: 2,
  done_count: 1,
  created_at: "2026-06-28T00:00:00Z",
  updated_at: "2026-06-28T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("projectsService", () => {
  it("lists projects with params", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: [project] } })

    await expect(listProjects({ deal_id: "d1" })).resolves.toEqual([project])

    expect(axiosClient.get).toHaveBeenCalledWith("/projects", { params: { deal_id: "d1" } })
  })

  it("creates a project", async () => {
    vi.mocked(axiosClient.post).mockResolvedValue({ data: { data: project } })

    await expect(createProject({ deal_id: "d1", name: "Website" })).resolves.toEqual(project)

    expect(axiosClient.post).toHaveBeenCalledWith("/projects", { deal_id: "d1", name: "Website" })
  })

  it("gets a project by id", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: project } })

    await expect(getProject("p1")).resolves.toEqual(project)

    expect(axiosClient.get).toHaveBeenCalledWith("/projects/p1")
  })
})
