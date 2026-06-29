import { beforeEach, describe, expect, it, vi } from "vitest"
import axiosClient from "@/configs/axios"
import { listTasks } from "@/features/tasks/api/tasksService"
import type { TaskResponse } from "@/features/tasks/types"

vi.mock("@/configs/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const task: TaskResponse = {
  id: "t1",
  entity_type: "project",
  entity_id: "x",
  title: "Thiết kế giao diện",
  description: null,
  priority: "medium",
  status: "todo",
  deadline: null,
  checklist_items: [],
  created_at: "2026-06-28T00:00:00Z",
  updated_at: "2026-06-28T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: [task] } })
})

describe("tasksService polymorphic routes", () => {
  it("lists project tasks from /projects/{id}/tasks", async () => {
    await expect(listTasks("projects", "x")).resolves.toEqual([task])

    expect(axiosClient.get).toHaveBeenCalledWith("/projects/x/tasks", { params: {} })
  })

  it("lists deal tasks from /deals/{id}/tasks", async () => {
    await expect(listTasks("deals", "y")).resolves.toEqual([task])

    expect(axiosClient.get).toHaveBeenCalledWith("/deals/y/tasks", { params: {} })
  })
})
