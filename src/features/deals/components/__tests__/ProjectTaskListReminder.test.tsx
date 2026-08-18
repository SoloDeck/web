import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTaskPanel } from "@/features/deals/components/ProjectTaskList";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Dòng nhắc "chưa tạo & gửi hóa đơn" nằm NGAY TRONG mốc, không gom lên đầu bảng.
 *
 * Gom lên đầu thì phải đọc tên rồi dò xuống tìm đúng hàng; hai mốc chưa gửi là hai dòng chữ
 * nằm cách xa chỗ cần bấm. Ở trong hàng thì lời nhắc và nút "Tạo & gửi hóa đơn" cạnh nhau.
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t1",
    title: "Thiết kế giao diện người dùng",
    note: "",
    status: "done",
    dueDate: null,
    completed: true,
    createdAt: "2026-08-17T06:16:00Z",
    completedAt: "2026-08-17T06:40:00Z",
    billingAmount: 37_199_000,
    ...over,
  };
}

const invoiceActions = {
  onCreateAndSend: vi.fn(),
  onSend: vi.fn(),
  onRecordPayment: vi.fn(),
  busyTaskId: null,
} as never;

function renderPanel(tasks: ProjectTask[]) {
  render(
    <ProjectTaskPanel
      tasks={tasks}
      onAddTask={vi.fn()}
      onUpdateTask={vi.fn()}
      onDeleteTask={vi.fn()}
      onToggleTask={vi.fn()}
      invoiceActions={invoiceActions}
    />
  );
}

/** Hàng chứa một mốc — để chứng minh dòng nhắc nằm TRONG hàng đó chứ không phải chỗ khác. */
function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest("div.group") as HTMLElement;
}

describe("dòng nhắc hóa đơn trong bảng việc", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mốc đã xong mà chưa gửi hóa đơn thì có dòng nhắc ngay trong hàng đó", () => {
    renderPanel([task()]);
    expect(
      within(rowOf("Thiết kế giao diện người dùng")).getByText(/chưa tạo & gửi hóa đơn/i)
    ).toBeInTheDocument();
  });

  it("hai mốc chưa gửi thì HAI hàng đều có dòng nhắc của riêng nó", () => {
    renderPanel([
      task({ id: "t1", title: "Thiết kế giao diện người dùng" }),
      task({ id: "t2", title: "Phát triển ứng dụng di động" }),
    ]);

    expect(screen.getAllByText(/chưa tạo & gửi hóa đơn/i)).toHaveLength(2);
    expect(
      within(rowOf("Phát triển ứng dụng di động")).getByText(/chưa tạo & gửi hóa đơn/i)
    ).toBeInTheDocument();
  });

  it("bỏ nhắc một mốc thì mốc kia GIỮ NGUYÊN dòng nhắc của nó", () => {
    renderPanel([
      task({ id: "t1", title: "Thiết kế giao diện người dùng" }),
      task({ id: "t2", title: "Phát triển ứng dụng di động" }),
    ]);

    fireEvent.click(
      screen.getByLabelText("Bỏ nhắc hóa đơn cho Thiết kế giao diện người dùng")
    );

    expect(screen.getAllByText(/chưa tạo & gửi hóa đơn/i)).toHaveLength(1);
    expect(
      within(rowOf("Phát triển ứng dụng di động")).getByText(/chưa tạo & gửi hóa đơn/i)
    ).toBeInTheDocument();
  });

  it("đã bỏ nhắc thì mở lại vẫn im — nhớ qua các lần mở", () => {
    const { unmount } = render(
      <ProjectTaskPanel
        tasks={[task()]}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onToggleTask={vi.fn()}
        invoiceActions={invoiceActions}
      />
    );
    fireEvent.click(
      screen.getByLabelText("Bỏ nhắc hóa đơn cho Thiết kế giao diện người dùng")
    );
    unmount();

    renderPanel([task()]);
    expect(screen.queryByText(/chưa tạo & gửi hóa đơn/i)).toBeNull();
  });

  it("mốc chưa tick xong thì chưa nhắc — chưa tới lúc đòi tiền", () => {
    renderPanel([task({ completed: false, status: "todo" })]);
    expect(screen.queryByText(/chưa tạo & gửi hóa đơn/i)).toBeNull();
  });

  it("công việc thường không dính dòng nhắc", () => {
    renderPanel([task({ title: "Họp với khách", billingAmount: null })]);
    expect(screen.queryByText(/chưa tạo & gửi hóa đơn/i)).toBeNull();
  });
});
