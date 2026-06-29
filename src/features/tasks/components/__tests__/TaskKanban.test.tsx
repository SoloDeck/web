import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TaskKanban } from "@/features/tasks/components/TaskKanban"

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  closestCorners: () => [],
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useSensor: () => undefined,
  useSensors: () => [],
}))

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}))

vi.mock("@/features/tasks/hooks/useTasks", () => ({
  useTasks: () => ({ data: [], isLoading: false, isError: false }),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTaskStatus: () => ({ mutate: vi.fn() }),
  useUpdateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useAddChecklistItem: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleChecklistItem: () => ({ mutate: vi.fn() }),
}))

describe("<TaskKanban />", () => {
  it("renders four status columns", () => {
    render(<TaskKanban entityType="projects" entityId="p1" />)

    expect(screen.getByText("Cần làm")).toBeInTheDocument()
    expect(screen.getByText("Đang làm")).toBeInTheDocument()
    expect(screen.getByText("Chờ duyệt")).toBeInTheDocument()
    expect(screen.getByText("Hoàn tất")).toBeInTheDocument()
  })
})
