import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaymentTaskPromptDialog } from "@/features/deals/components/PaymentTaskPromptDialog";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Hộp thoại hiện ra khi tick một mốc thu tiền.
 *
 * Chữ của hai nút do người dùng chốt: mốc CHƯA có hóa đơn thì "Ghi nhận" / "Gửi & ghi nhận" (tick
 * để ghi nhận mốc xong, không phải lúc nào cũng cần hóa đơn); mốc ĐÃ có hóa đơn giữ nguyên
 * "Để sau" / "Ghi nhận đã thanh toán".
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t1",
    title: "Phân tích yêu cầu",
    note: "",
    status: "todo",
    dueDate: null,
    completed: false,
    createdAt: "2026-10-02T06:16:00Z",
    completedAt: null,
    billingAmount: 37_199_000,
    ...over,
  };
}

const invoice = {
  id: "inv-1",
  invoiceNumber: "INV-20261002-6C15",
  status: "sent",
  total: 37_199_000,
  amountPaid: 10_000_000,
};

function renderDialog(t: ProjectTask | null) {
  const handlers = {
    onDismiss: vi.fn(),
    onFinishTick: vi.fn(),
    onSendInvoice: vi.fn(),
    onRecordPayment: vi.fn(),
  };
  render(<PaymentTaskPromptDialog task={t} {...handlers} />);
  return handlers;
}

const nut = (name: string) => screen.queryByRole("button", { name });

describe("mốc chưa có hóa đơn", () => {
  it("hai nút là 'Ghi nhận' và 'Gửi & ghi nhận'; không còn 'Để sau' / 'Tạo & gửi hóa đơn'", () => {
    renderDialog(task());

    expect(screen.getByText("Gửi hóa đơn cho khách luôn?")).toBeInTheDocument();
    expect(nut("Ghi nhận")).toBeInTheDocument();
    expect(nut("Gửi & ghi nhận")).toBeInTheDocument();
    expect(nut("Để sau")).toBeNull();
    expect(nut("Tạo & gửi hóa đơn")).toBeNull();
  });

  it("nội dung nêu tên mốc và việc sẽ gửi email cho khách", () => {
    renderDialog(task());

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Mốc Phân tích yêu cầu — SoloDesk sẽ tạo hóa đơn theo đúng số tiền của mốc này trong báo giá đã chốt, rồi gửi email cho khách."
    );
  });

  it("'Ghi nhận' chỉ tick xong mốc: không tạo hóa đơn, không ghi tiền", async () => {
    const h = renderDialog(task());

    await userEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));

    expect(h.onFinishTick).toHaveBeenCalledTimes(1);
    expect(h.onSendInvoice).not.toHaveBeenCalled();
    expect(h.onRecordPayment).not.toHaveBeenCalled();
  });

  it("'Gửi & ghi nhận' tick xong mốc RỒI mới mở hóa đơn cho đúng mốc này", async () => {
    const t = task();
    const h = renderDialog(t);

    await userEvent.click(screen.getByRole("button", { name: "Gửi & ghi nhận" }));

    expect(h.onSendInvoice).toHaveBeenCalledTimes(1);
    expect(h.onSendInvoice).toHaveBeenCalledWith(t);
    expect(h.onRecordPayment).not.toHaveBeenCalled();
    expect(h.onFinishTick.mock.invocationCallOrder[0]).toBeLessThan(
      h.onSendInvoice.mock.invocationCallOrder[0]
    );
  });
});

describe("mốc đã có hóa đơn", () => {
  it("giữ nguyên 'Để sau' và 'Ghi nhận đã thanh toán'; chữ mới không lọt sang đây", () => {
    renderDialog(task({ invoice }));

    expect(screen.getByText("Ghi nhận đã thanh toán?")).toBeInTheDocument();
    expect(nut("Để sau")).toBeInTheDocument();
    expect(nut("Ghi nhận đã thanh toán")).toBeInTheDocument();
    expect(nut("Ghi nhận")).toBeNull();
    expect(nut("Gửi & ghi nhận")).toBeNull();
  });

  it("nêu mã hóa đơn và số còn lại", () => {
    renderDialog(task({ invoice }));

    const noiDung = screen.getByRole("dialog");
    expect(noiDung).toHaveTextContent("INV-20261002-6C15");
    expect(noiDung).toHaveTextContent(/27\.199\.000/);
  });

  it("'Ghi nhận đã thanh toán' tick xong rồi ghi nhận tiền, không tạo hóa đơn mới", async () => {
    const t = task({ invoice });
    const h = renderDialog(t);

    await userEvent.click(screen.getByRole("button", { name: "Ghi nhận đã thanh toán" }));

    expect(h.onFinishTick).toHaveBeenCalledTimes(1);
    expect(h.onRecordPayment).toHaveBeenCalledWith(t);
    expect(h.onSendInvoice).not.toHaveBeenCalled();
  });

  it("'Để sau' chỉ tick xong mốc", async () => {
    const h = renderDialog(task({ invoice }));

    await userEvent.click(screen.getByRole("button", { name: "Để sau" }));

    expect(h.onFinishTick).toHaveBeenCalledTimes(1);
    expect(h.onRecordPayment).not.toHaveBeenCalled();
    expect(h.onSendInvoice).not.toHaveBeenCalled();
  });
});

describe("đóng hộp thoại", () => {
  it("dấu ✕ bỏ luôn việc tick: gọi onDismiss, không tick", async () => {
    const h = renderDialog(task());

    // Dấu ✕ mặc định của Dialog chỉ có chữ ẩn "Close" cho trình đọc màn hình.
    await userEvent.click(screen.getByRole("button", { name: /close|đóng/i }));

    expect(h.onDismiss).toHaveBeenCalledTimes(1);
    expect(h.onFinishTick).not.toHaveBeenCalled();
  });

  it("không có mốc nào thì không hiện hộp thoại", () => {
    renderDialog(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
