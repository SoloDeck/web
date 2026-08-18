import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentTaskInvoice } from "@/features/deals/components/PaymentTaskInvoice";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Khối hóa đơn gắn dưới một mốc thu tiền.
 *
 * Hai nút đứng cùng một chỗ nhưng là hai việc khác hẳn nhau: "Tạo & gửi hóa đơn" gửi thư ra
 * ngoài cho khách, còn "Ghi nhận đã thanh toán" đụng vào sổ tiền. Để chung một kiểu viền xám
 * thì lướt qua bảng việc chỉ thấy một dãy nút giống nhau, phải đọc chữ mới phân biệt được.
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t1",
    title: "Phát triển ứng dụng di động",
    note: "",
    status: "done",
    dueDate: null,
    completed: true,
    createdAt: "2026-08-17T06:16:00Z",
    completedAt: "2026-08-17T07:12:00Z",
    billingAmount: 49_999_000,
    ...over,
  };
}

const invoice = (status: string, over: Record<string, unknown> = {}) =>
  ({
    id: "inv-1",
    invoiceNumber: "INV-20260817-A683",
    status,
    total: 49_999_000,
    amountPaid: 0,
    ...over,
  }) as never;

function renderBlock(t: ProjectTask) {
  const actions = {
    onCreateAndSend: vi.fn(),
    onSend: vi.fn(),
    onRecordPayment: vi.fn(),
    pendingTaskId: null,
  };
  render(<PaymentTaskInvoice task={t} actions={actions} />);
  return actions;
}

describe("PaymentTaskInvoice — màu nút", () => {
  it("nút thu tiền mang màu XANH, khác hẳn nút gửi chứng từ", () => {
    renderBlock(task({ invoice: invoice("sent") }));
    const nut = screen.getByRole("button", { name: /ghi nhận đã thanh toán/i });
    expect(nut.className).toContain("text-success");
  });

  it("thu một phần rồi vẫn là nút thu tiền, vẫn xanh", () => {
    renderBlock(task({ invoice: invoice("partially_paid", { amountPaid: 10_000_000 }) }));
    const nut = screen.getByRole("button", { name: /ghi nhận đã thanh toán/i });
    expect(nut.className).toContain("text-success");
  });

  it("nút GỬI ĐI thì trung tính, không mượn màu tiền về", () => {
    renderBlock(task());
    const nut = screen.getByRole("button", { name: /soạn & gửi hóa đơn/i });
    expect(nut.className).not.toContain("text-success");
  });

  it("gửi lại bản nháp cũng là việc gửi đi — cùng màu trung tính", () => {
    renderBlock(task({ invoice: invoice("draft") }));
    const nut = screen.getByRole("button", { name: /xem lại & gửi/i });
    expect(nut.className).not.toContain("text-success");
  });

  it("đã thu đủ thì không còn nút nào", () => {
    renderBlock(task({ invoice: invoice("paid", { amountPaid: 49_999_000 }) }));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("bấm nút thu tiền gọi đúng hành động", () => {
    const actions = renderBlock(task({ invoice: invoice("sent") }));
    fireEvent.click(screen.getByRole("button", { name: /ghi nhận đã thanh toán/i }));
    expect(actions.onRecordPayment).toHaveBeenCalled();
    expect(actions.onCreateAndSend).not.toHaveBeenCalled();
  });
});
