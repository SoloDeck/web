import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectTaskPanel } from "./ProjectTaskList";
import type { ProjectTask, TaskInvoice } from "@/features/deals/types";

/**
 * Mốc "Thu tiền:" nối với hóa đơn.
 *
 * Điểm của bộ test này: NĂM trạng thái hóa đơn phải cho năm giao diện khác nhau. Gộp bất kỳ
 * hai cái nào lại là freelancer không phân biệt được "đã gửi cho khách rồi" với "mới có bản
 * nháp nằm đó" — hai chuyện khác hẳn nhau khi đang đợi tiền về.
 */

function mocTask(invoice: TaskInvoice | null = null, overrides: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "task-thu-tien",
    title: "Thu tiền: Đặt cọc khi ký hợp đồng",
    note: "Giá trị: 50% của tổng báo giá",
    status: "todo",
    dueDate: null,
    completed: false,
    createdAt: "2026-08-04T09:00:00.000Z",
    completedAt: null,
    invoice,
    ...overrides,
  };
}

function hoaDon(overrides: Partial<TaskInvoice> = {}): TaskInvoice {
  return {
    id: "inv-1",
    invoiceNumber: "INV-20260804-A1B2",
    status: "draft",
    total: 10_000_000,
    amountPaid: 0,
    ...overrides,
  };
}

function veRa(task: ProjectTask, actions: Partial<Parameters<typeof ProjectTaskPanel>[0]["invoiceActions"]> = {}) {
  const onCreateAndSend = vi.fn();
  const onSend = vi.fn();
  const onRecordPayment = vi.fn();
  render(
    <ProjectTaskPanel
      tasks={[task]}
      onAddTask={vi.fn()}
      onUpdateTask={vi.fn()}
      onDeleteTask={vi.fn()}
      onToggleTask={vi.fn()}
      invoiceActions={{ onCreateAndSend, onSend, onRecordPayment, ...actions }}
    />
  );
  return { onCreateAndSend, onSend, onRecordPayment };
}

describe("Mốc thu tiền — hóa đơn trong hàng task", () => {
  it("chưa có hóa đơn thì mời tạo", async () => {
    const { onCreateAndSend } = veRa(mocTask(null));

    await userEvent.click(screen.getByRole("button", { name: /tạo & gửi hóa đơn/i }));

    expect(onCreateAndSend).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("hóa đơn nháp thì mời gửi, KHÔNG mời tạo lại", async () => {
    // Mời tạo lại ở đây là mở đường cho hai hóa đơn cùng một mốc.
    const { onSend, onCreateAndSend } = veRa(mocTask(hoaDon({ status: "draft" })));

    expect(screen.getByText(/hóa đơn nháp/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /gửi cho khách/i }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onCreateAndSend).not.toHaveBeenCalled();
  }, 20_000);

  it("đã gửi thì hiện 'Đã gửi hóa đơn' và mời ghi nhận tiền", async () => {
    const { onRecordPayment } = veRa(mocTask(hoaDon({ status: "sent" })));

    expect(screen.getByText(/đã gửi hóa đơn/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /ghi nhận đã thanh toán/i }));

    expect(onRecordPayment).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("thu một phần thì nói RÕ còn bao nhiêu", () => {
    // Chỉ ghi "đã thu một phần" mà không nói còn bao nhiêu thì freelancer vẫn phải đi mở
    // chỗ khác để biết đòi tiếp bao nhiêu.
    veRa(mocTask(hoaDon({ status: "partially_paid", amountPaid: 4_000_000 })));

    expect(screen.getByText(/đã thu một phần/i)).toBeInTheDocument();
    expect(screen.getByText(/còn 6\.000\.000/)).toBeInTheDocument();
  }, 20_000);

  it("đã thanh toán đủ thì KHÔNG còn nút nào", () => {
    veRa(mocTask(hoaDon({ status: "paid", amountPaid: 10_000_000 })));

    expect(screen.getByText(/đã thanh toán/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ghi nhận đã thanh toán/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gửi cho khách/i })).not.toBeInTheDocument();
  }, 20_000);

  it("đang chạy thì khoá nút — bấm hai lần không đẻ hai hóa đơn", () => {
    veRa(mocTask(null), { pendingTaskId: "task-thu-tien" });

    expect(screen.getByRole("button", { name: /tạo & gửi hóa đơn/i })).toBeDisabled();
  }, 20_000);

  it("task thường KHÔNG có khối hóa đơn nào", () => {
    veRa(mocTask(null, { id: "task-thuong", title: "Sửa lại logo" }));

    expect(screen.queryByRole("button", { name: /hóa đơn/i })).not.toBeInTheDocument();
  }, 20_000);

  it("không truyền invoiceActions thì mốc thu tiền hiện như task thường", () => {
    // `DealDetailModal` dùng lại panel này ở cửa sổ nhỏ mà không cần phần chứng từ.
    render(
      <ProjectTaskPanel
        tasks={[mocTask(hoaDon({ status: "sent" }))]}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onToggleTask={vi.fn()}
      />
    );

    expect(screen.queryByText(/đã gửi hóa đơn/i)).not.toBeInTheDocument();
  }, 20_000);
});
