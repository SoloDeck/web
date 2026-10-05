import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTaskPanel } from "@/features/deals/components/ProjectTaskList";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Deal đã "Hoàn thành" thì tab Công việc chỉ để xem: khóa thêm, sửa, xóa và tick.
 *
 * Dự án đã đóng và tính tiền xong nên danh sách việc là hồ sơ. Bỏ tick một mốc thu tiền ở đây còn
 * làm bảng Doanh thu lệch theo (backend coi task `done` = đã thu). Khối hóa đơn của mốc thu tiền cũng
 * chỉ còn để xem: nút soạn/gửi/ghi nhận thanh toán và dòng nhắc ẩn, nhãn và mã hóa đơn còn.
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t1",
    title: "Viết tài liệu bàn giao",
    note: "",
    status: "done",
    dueDate: null,
    completed: true,
    createdAt: "2026-10-02T06:16:00Z",
    completedAt: "2026-10-03T05:03:00Z",
    ...over,
  };
}

/** Mốc thu tiền, chưa có hóa đơn nào. */
const khoanThu = task({
  id: "p1",
  title: "Thiết kế giải pháp",
  billingAmount: 30_450_000,
  billingDueType: "on_completion",
});

function renderPanel(tasks: ProjectTask[], readOnly: boolean) {
  const handlers = {
    onAddTask: vi.fn(),
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onToggleTask: vi.fn(),
  };
  const invoiceActions = {
    onCreateAndSend: vi.fn(),
    onSend: vi.fn(),
    onRecordPayment: vi.fn(),
    pendingTaskId: null,
  };
  const props = { tasks, ...handlers, invoiceActions };
  const utils = render(<ProjectTaskPanel {...props} readOnly={readOnly} />);
  return {
    ...handlers,
    invoiceActions,
    /** Deal vừa được chuyển sang "Hoàn thành" trong lúc panel đang mở. */
    lockNow: () => utils.rerender(<ProjectTaskPanel {...props} readOnly />),
  };
}

describe("deal đã Hoàn thành: danh sách việc chỉ để xem", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("nút 'Thêm công việc' bị khóa, bấm vào không mở gì", async () => {
    const h = renderPanel([task()], true);
    const nut = screen.getByRole("button", { name: /thêm công việc/i });
    expect(nut).toBeDisabled();

    await userEvent.click(nut);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.onAddTask).not.toHaveBeenCalled();
  });

  it("danh sách rỗng thì nút 'Thêm công việc đầu tiên' cũng khóa", () => {
    renderPanel([], true);

    expect(screen.getByRole("button", { name: /thêm công việc đầu tiên/i })).toBeDisabled();
  });

  it("ô tick, nút sửa và nút xóa của từng việc đều khóa", () => {
    renderPanel([task()], true);

    expect(screen.getByRole("checkbox", { name: /Viết tài liệu bàn giao/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" })).toBeDisabled();
  });

  it("bấm vào chúng không đổi được gì: không bỏ tick, không mở ô sửa, không hỏi xóa", async () => {
    const h = renderPanel([task()], true);

    await userEvent.click(screen.getByRole("checkbox", { name: /Viết tài liệu bàn giao/ }));
    await userEvent.click(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" }));
    await userEvent.click(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" }));

    expect(h.onToggleTask).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Sửa tên công việc")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(h.onUpdateTask).not.toHaveBeenCalled();
    expect(h.onDeleteTask).not.toHaveBeenCalled();
  });

  it("mốc thu tiền cũng khóa ô tick và nút sửa (nút xóa của nó vốn đã ẩn)", () => {
    renderPanel([khoanThu], true);

    expect(screen.getByRole("checkbox", { name: /Thiết kế giải pháp/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sửa Thiết kế giải pháp" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Xóa Thiết kế giải pháp" })).toBeNull();
  });

  it("khối hóa đơn của mốc thu tiền: ẩn nút soạn/gửi, vẫn hiện nhãn và mã hóa đơn", () => {
    const daGui = task({
      id: "p2",
      title: "Giai đoạn 1",
      billingAmount: 3_000_000,
      billingDueType: "on_signing",
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-20261005-AAAA",
        status: "sent",
        total: 3_000_000,
        amountPaid: 0,
      },
    });
    renderPanel([khoanThu, daGui], true);

    expect(screen.queryByRole("button", { name: /soạn & gửi hóa đơn/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /xem lại & gửi/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ghi nhận đã thanh toán/i })).toBeNull();
    // Chỉ còn để xem: nhãn trạng thái và mã hóa đơn.
    expect(screen.getByText("Đã gửi hóa đơn")).toBeInTheDocument();
    expect(screen.getByText(/INV-20261005-AAAA/)).toBeInTheDocument();
  });

  it("dòng nhắc 'chưa gửi hóa đơn' cũng ẩn: sổ đã khép, không còn gì để gửi", () => {
    renderPanel([khoanThu], true);

    expect(screen.queryByText(/chưa tạo & gửi hóa đơn/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /bỏ nhắc hóa đơn/i })).toBeNull();
  });

  it("vẫn xem và sắp xếp được", () => {
    renderPanel([task()], true);

    const sapXep = screen.getByLabelText("Sắp xếp công việc");
    expect(sapXep).not.toBeDisabled();
    expect(sapXep).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Viết tài liệu bàn giao")).toBeInTheDocument();
  });
});

describe("deal chưa hoàn thành: mọi thứ vẫn dùng được", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("nút Thêm, nút sửa, nút xóa đều bấm được và ô tick đổi được trạng thái", async () => {
    const h = renderPanel([task({ id: "t1", completed: false, status: "todo", completedAt: null })], false);

    expect(screen.getByRole("button", { name: /thêm công việc/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" })).toBeEnabled();

    await userEvent.click(screen.getByRole("checkbox", { name: /Viết tài liệu bàn giao/ }));
    expect(h.onToggleTask).toHaveBeenCalledWith("t1", true);
  });

  it("bấm 'Thêm công việc' mở hộp thoại thêm", async () => {
    renderPanel([task()], false);

    await userEvent.click(screen.getByRole("button", { name: /thêm công việc/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("deal vừa hoàn thành lúc đang dở tay", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("đang sửa dở một việc thì ô sửa biến mất, không còn đường lưu", async () => {
    const t = task({ completed: false, status: "todo", completedAt: null });
    const h = renderPanel([t], false);
    await userEvent.click(screen.getByRole("button", { name: "Sửa Viết tài liệu bàn giao" }));
    expect(screen.getByLabelText("Sửa tên công việc")).toBeInTheDocument();

    h.lockNow();

    expect(screen.queryByLabelText("Sửa tên công việc")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu công việc" })).toBeNull();
  });

  it("đang mở hộp thoại thêm việc thì hộp thoại đóng", async () => {
    const h = renderPanel([task()], false);
    await userEvent.click(screen.getByRole("button", { name: /thêm công việc/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    h.lockNow();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("đang hỏi xóa một việc thì hộp hỏi đóng, không xóa được nữa", async () => {
    const h = renderPanel([task()], false);
    await userEvent.click(screen.getByRole("button", { name: "Xóa Viết tài liệu bàn giao" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    h.lockNow();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(h.onDeleteTask).not.toHaveBeenCalled();
  });
});
