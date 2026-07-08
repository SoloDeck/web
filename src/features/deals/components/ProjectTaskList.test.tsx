import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectTaskPanel } from "./ProjectTaskList";
import type { ProjectTask } from "@/features/deals/types";

function makeTask(overrides: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "task-1",
    title: "Trao đổi yêu cầu với khách hàng",
    note: "",
    status: "todo",
    dueDate: "2026-06-25",
    completed: false,
    createdAt: "2026-06-21T14:05:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function TaskHarness({ initialTasks = [] }: { initialTasks?: ProjectTask[] }) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  return (
    <ProjectTaskPanel
      tasks={tasks}
      onAddTask={(title, note) =>
        setTasks((current) => [
          ...current,
          makeTask({
            id: `task-${current.length + 1}`,
            title,
            note,
            createdAt: "2026-06-22T08:00:00.000Z",
          }),
        ])
      }
      onUpdateTask={(taskId, patch) =>
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
        )
      }
      onDeleteTask={(taskId) =>
        setTasks((current) => current.filter((task) => task.id !== taskId))
      }
      onToggleTask={(taskId, completed) =>
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed,
                  status: completed ? "done" : "todo",
                  completedAt: completed ? "2026-06-22T09:00:00.000Z" : null,
                }
              : task
          )
        )
      }
    />
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("<ProjectTaskPanel />", () => {
  it("shows the empty state and adds a task inline", async () => {
    const user = userEvent.setup();
    render(<TaskHarness />);

    expect(screen.getByText("Chưa có công việc nào")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Thêm công việc đầu tiên/i }));
    await user.type(screen.getByPlaceholderText("Tên công việc"), "Chuẩn bị báo giá");
    await user.type(screen.getByPlaceholderText("Ghi chú"), "Gửi bản nháp cho khách");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    expect(screen.getByText("Chuẩn bị báo giá")).toBeInTheDocument();
    expect(screen.getByText("Gửi bản nháp cho khách")).toBeInTheDocument();
    expect(screen.getByText("0/1 · 0% hoàn thành")).toBeInTheDocument();
  });

  it("checks and unchecks a task while updating progress", async () => {
    const user = userEvent.setup();
    render(<TaskHarness initialTasks={[makeTask()]} />);

    const checkbox = screen.getByRole("checkbox", { name: /Đánh dấu/ });
    await user.click(checkbox);

    expect(screen.getByText("1/1 · 100% hoàn thành")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Hoàn thành")).toBeInTheDocument();

    await user.click(checkbox);
    expect(screen.getByText("0/1 · 0% hoàn thành")).toBeInTheDocument();
    expect(screen.getByText("Chưa làm")).toBeInTheDocument();
  });

  it("groups tasks by phase and collapses a phase", async () => {
    const user = userEvent.setup();
    render(
      <TaskHarness
        initialTasks={[
          makeTask({ id: "task-design", title: "Thiết kế wireframe" }),
          makeTask({ id: "task-dev", title: "Cài đặt backend" }),
        ]}
      />
    );

    expect(screen.getByText("GIAI ĐOẠN 1: THIẾT KẾ")).toBeInTheDocument();
    expect(screen.getByText("GIAI ĐOẠN 2: PHÁT TRIỂN")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Đóng GIAI ĐOẠN 1/ }));
    expect(screen.queryByText("Thiết kế wireframe")).not.toBeInTheDocument();
    expect(screen.getByText("Cài đặt backend")).toBeInTheDocument();
  });

  it("edits a task inline and asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    render(<TaskHarness initialTasks={[makeTask()]} />);

    await user.click(screen.getByRole("button", { name: /Sửa Trao đổi/ }));
    const editInput = screen.getByRole("textbox", { name: "Sửa tên công việc" });
    await user.clear(editInput);
    await user.type(editInput, "Chốt phạm vi dự án");
    await user.type(screen.getByRole("textbox", { name: "Sửa ghi chú công việc" }), "Ghi chú mới");
    await user.click(screen.getByRole("button", { name: "Lưu công việc" }));

    expect(screen.getByText("Chốt phạm vi dự án")).toBeInTheDocument();
    expect(screen.getByText("Ghi chú mới")).toBeInTheDocument();

    // Xóa cần xác nhận qua hộp thoại. Lần 1: mở hộp thoại rồi "Giữ lại" → công việc vẫn còn.
    await user.click(screen.getByRole("button", { name: /Xóa Chốt phạm vi/ }));
    await user.click(await screen.findByRole("button", { name: "Giữ lại" }));
    expect(screen.getByText("Chốt phạm vi dự án")).toBeInTheDocument();

    // Lần 2: mở hộp thoại rồi bấm "Xóa công việc" → công việc biến mất.
    await user.click(screen.getByRole("button", { name: /Xóa Chốt phạm vi/ }));
    await user.click(await screen.findByRole("button", { name: "Xóa công việc" }));
    expect(screen.queryByText("Chốt phạm vi dự án")).not.toBeInTheDocument();
  });
});
