import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DealDetailModal } from "@/features/deals/components/DealDetailModal";
import type { Deal, ProjectTask, Stage } from "@/features/deals/types";

/**
 * Cửa sổ deal thu nhỏ cũng dựng bảng công việc, nên cũng phải khóa khi deal đã "Hoàn thành" —
 * khóa ở trang chi tiết mà chừa cửa sổ này thì vẫn sửa được công việc của dự án đã đóng.
 */

const viec: ProjectTask = {
  id: "t1",
  title: "Viết tài liệu bàn giao",
  note: "",
  status: "done",
  dueDate: null,
  completed: true,
  createdAt: "2026-10-02T06:16:00Z",
  completedAt: "2026-10-03T05:03:00Z",
};

vi.mock("@/features/deals/hooks/useProjectTasks", () => ({
  useProjectTasks: () => ({ data: { tasks: [viec], projectId: "pr-1", total: 1 } }),
  useAddTask: () => ({ mutate: vi.fn() }),
  useToggleTask: () => ({ mutate: vi.fn() }),
  useUpdateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));

function dealAt(stage: Stage): Deal {
  return {
    id: "d1",
    clientId: "c1",
    client: "Hoa Huynh",
    projectType: "abc",
    value: 140_000_000,
    score: "hot",
    stage,
    contact: "0352015349",
    channel: "Zalo",
    createdAt: "2026-10-02T06:00:00Z",
    notes: "",
    paymentStatus: "Đã thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
  };
}

describe("cửa sổ deal: khóa công việc theo giai đoạn", () => {
  it("deal Hoàn thành: không thêm, sửa, xóa, tick được", () => {
    render(<DealDetailModal deal={dealAt("completed_and_billed")} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /thêm công việc/i })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Viết tài liệu bàn giao/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" })).toBeDisabled();
  });

  it("deal Đang triển khai: vẫn dùng bình thường", () => {
    render(<DealDetailModal deal={dealAt("active")} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /thêm công việc/i })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /Viết tài liệu bàn giao/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" })).toBeEnabled();
  });
});
