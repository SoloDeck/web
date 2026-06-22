import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DealDetailModal } from "./DealDetailModal";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { Deal, ProjectTask } from "@/features/deals/types";

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

function makeDeal(tasks: ProjectTask[] = []): Deal {
  return {
    id: "deal-1",
    clientId: "client-1",
    client: "Khách hàng A",
    projectType: "Thiết kế website",
    value: 10_000_000,
    score: "warm",
    stage: "active",
    contact: "0900000000",
    channel: "Zalo",
    createdAt: "2026-06-20",
    notes: "",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [],
    tasks,
  };
}

function renderTaskList(tasks: ProjectTask[] = []) {
  const deal = makeDeal(tasks);
  const onClose = vi.fn();
  useDealStore.setState({ deals: [deal], hydrated: true });
  return {
    ...render(<DealDetailModal deal={deal} onClose={onClose} />),
    onClose,
  };
}

beforeEach(() => {
  useDealStore.setState({ deals: [], hydrated: false });
  vi.restoreAllMocks();
});

describe("<DealDetailModal /> task panel", () => {
  it("closes from the backdrop but stays open when either card is clicked", () => {
    const { onClose } = renderTaskList();
    const overlay = screen.getByRole("dialog").parentElement;

    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("region", { name: "Chi tiết Dự án" }));
    fireEvent.click(screen.getByRole("region", { name: "Công việc cần làm" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state and adds a task immediately", async () => {
    const user = userEvent.setup();
    renderTaskList();

    expect(screen.getByRole("region", { name: "Chi tiết Dự án" })).not.toContainElement(
      screen.getByRole("region", { name: "Công việc cần làm" }),
    );
    expect(screen.getByText("Chưa có công việc nào cho dự án này.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thêm/ })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Thêm công việc mới..."), "Chuẩn bị báo giá");
    fireEvent.change(screen.getByPlaceholderText("Ghi chú công việc (không bắt buộc)..."), {
      target: { value: "Dòng ghi chú thứ nhất\nDòng ghi chú thứ hai" },
    });
    await user.click(screen.getByRole("button", { name: /Thêm/ }));

    expect(screen.getByText("Chuẩn bị báo giá")).toBeInTheDocument();
    expect(screen.getByText("0/1 công việc đã hoàn thành")).toBeInTheDocument();
    const createdTask = useDealStore.getState().deals[0].tasks[0];
    expect(createdTask.createdAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(createdTask.createdAt))).toBe(false);
    expect(createdTask.completedAt).toBeNull();
    expect(createdTask.note).toBe("Dòng ghi chú thứ nhất\nDòng ghi chú thứ hai");
  });

  it("checks and unchecks a task while updating progress", async () => {
    const user = userEvent.setup();
    const task = makeTask();
    renderTaskList([task]);

    const checkbox = screen.getByRole("checkbox", { name: /Đánh dấu/ });
    await user.click(checkbox);

    expect(screen.getByText("1/1 công việc đã hoàn thành")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Hoàn thành")).toBeInTheDocument();
    expect(screen.getByText(/Xong lúc/)).toBeInTheDocument();
    expect(useDealStore.getState().deals[0].tasks[0].status).toBe("done");
    expect(useDealStore.getState().deals[0].tasks[0].completedAt).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hoàn thành 1" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText(task.title).closest("li")).toHaveClass("slide-in-from-top-1");

    await user.click(screen.getByRole("checkbox", { name: /Đánh dấu/ }));
    expect(screen.getByText("0/1 công việc đã hoàn thành")).toBeInTheDocument();
    expect(screen.getByText("Chưa làm")).toBeInTheDocument();
    expect(useDealStore.getState().deals[0].tasks[0].status).toBe("todo");
    expect(useDealStore.getState().deals[0].tasks[0].completedAt).toBeNull();
    expect(screen.getByText(task.title).closest("li")).toHaveClass("slide-in-from-bottom-1");
  });

  it("lists incomplete tasks first and collapses the completed group", async () => {
    const user = userEvent.setup();
    const incomplete = makeTask({ id: "task-todo", title: "Việc chưa hoàn thành" });
    const completed = makeTask({
      id: "task-done",
      title: "Việc đã hoàn thành",
      status: "done",
      completed: true,
      completedAt: "2026-06-21T14:10:00.000Z",
    });
    renderTaskList([completed, incomplete]);

    const incompleteText = screen.getByText(incomplete.title);
    const completedText = screen.getByText(completed.title);
    expect(
      incompleteText.compareDocumentPosition(completedText) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const completedHeader = screen.getByRole("button", { name: "Hoàn thành 1" });
    await user.click(completedHeader);
    expect(completedHeader).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(completed.title)).not.toBeInTheDocument();
    expect(screen.getByText(incomplete.title)).toBeInTheDocument();

    await user.click(completedHeader);
    expect(screen.getByText(completed.title)).toBeInTheDocument();
  });

  it("shows a read-only status with creation time and due date", () => {
    renderTaskList([makeTask()]);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Chưa làm")).toBeInTheDocument();
    expect(screen.getByText(/Tạo lúc \d{2}:\d{2} 21\/06\/2026/)).toBeInTheDocument();
    expect(screen.getByText("Hạn 25/06/2026")).toBeInTheDocument();
  });

  it("clamps a long multiline note and expands or collapses it", async () => {
    const user = userEvent.setup();
    const note = [
      "Dòng ghi chú đầu tiên mô tả yêu cầu chi tiết.",
      "Dòng ghi chú thứ hai bổ sung thông tin cho Freelancer.",
      "Dòng ghi chú thứ ba chỉ hiện ra khi mở rộng.",
    ].join("\n");
    renderTaskList([makeTask({ note })]);

    const noteText = screen.getByText(/Dòng ghi chú đầu tiên/);
    expect(noteText).toHaveClass("line-clamp-2");

    await user.click(screen.getByRole("button", { name: "Xem thêm" }));
    expect(noteText).not.toHaveClass("line-clamp-2");
    expect(screen.getByRole("button", { name: "Thu gọn" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thu gọn" }));
    expect(noteText).toHaveClass("line-clamp-2");
  });

  it("edits a task inline and asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    renderTaskList([makeTask()]);

    await user.click(screen.getByRole("button", { name: /Sửa Trao đổi/ }));
    const editInput = screen.getByRole("textbox", { name: "Sửa tên công việc" });
    await user.clear(editInput);
    await user.type(editInput, "Chốt phạm vi dự án");
    fireEvent.change(screen.getByRole("textbox", { name: "Sửa ghi chú công việc" }), {
      target: { value: "Ghi chú đã cập nhật\nCó thể xuống dòng" },
    });
    await user.click(screen.getByRole("button", { name: "Lưu công việc" }));

    expect(screen.getByText("Chốt phạm vi dự án")).toBeInTheDocument();
    expect(screen.getByText(/Ghi chú đã cập nhật/)).toBeInTheDocument();
    expect(useDealStore.getState().deals[0].tasks[0].note).toContain("Có thể xuống dòng");

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const deleteButton = screen.getByRole("button", { name: /Xóa Chốt phạm vi/ });
    await user.click(deleteButton);
    expect(screen.getByText("Chốt phạm vi dự án")).toBeInTheDocument();

    await user.click(deleteButton);
    expect(screen.queryByText("Chốt phạm vi dự án")).not.toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
