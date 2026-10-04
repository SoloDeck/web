import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvoiceComposerModal } from "@/features/deals/components/DealDetailPage";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/**
 * Cửa sổ soạn hóa đơn không còn ô "Hạng mục thanh toán" (hạng mục luôn lấy tên dự án) và cũng KHÔNG
 * có ô cấu hình lời nhắc: gửi hóa đơn thì hệ thống tự lên lịch nhắc thanh toán THEO quy tắc "Nhắc
 * trước khi hóa đơn tới hạn" ở Cài đặt hồ sơ, freelancer chỉ việc kiểm tra ở tab Nhắc nhở.
 */

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20261003-3AF1",
    status: "draft",
    subtotal: 83_000_000,
    total: 83_000_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: daysFromNow(14),
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const deal = { id: "d1", projectType: "English center", value: 83_000_000 } as Deal;

function renderModal(onSaveAndSend = vi.fn()) {
  const draft = invoice();
  render(
    <InvoiceComposerModal
      mode="edit"
      deal={deal}
      suggestedInvoiceIndex={2}
      existingInvoices={[draft]}
      client={{ name: "Nguyễn Văn Mười", email: "ngvan10@gmail.com", phone: "0352051348" }}
      invoice={draft}
      isLoading={false}
      onClose={vi.fn()}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onSaveAndSend={onSaveAndSend as never}
      onDelete={vi.fn()}
    />
  );
  return { onSaveAndSend };
}

async function guiVaXacNhan() {
  await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
  const hopThoai = screen.getByRole("alertdialog");
  await userEvent.click(within(hopThoai).getByRole("button", { name: "Lưu & gửi" }));
  return hopThoai;
}

describe("cửa sổ soạn hóa đơn: không còn ô nhập hạng mục lẫn ô cấu hình lời nhắc", () => {
  it("không có ô 'Hạng mục thanh toán' và không có ô nhắc nào để nhập", () => {
    renderModal();

    expect(screen.queryByText("Hạng mục thanh toán")).toBeNull();
    expect(screen.queryByText(/Nhắc nếu chưa thanh toán/)).toBeNull();
    expect(screen.queryByPlaceholderText("Không nhắc")).toBeNull();
    // Các ô còn lại vẫn đủ.
    expect(screen.getByText("Tên hóa đơn / đợt thanh toán")).toBeInTheDocument();
    expect(screen.getByText("Số tiền")).toBeInTheDocument();
    // Không còn ô thuế/VAT: giá lấy từ hợp đồng.
    expect(screen.queryByText(/Thuế\/VAT/)).toBeNull();
    expect(screen.getByText("Hạn thanh toán")).toBeInTheDocument();
  });

  it("không còn dòng chú thích 'mã hóa đơn backend' dưới ô tên", () => {
    renderModal();

    expect(screen.queryByText(/mã hóa đơn backend/)).toBeNull();
  });

  it("Hạn thanh toán đứng sau Số tiền", () => {
    renderModal();

    const han = screen.getByPlaceholderText("dd/mm/yyyy");
    const soTien = screen.getByDisplayValue("83000000");
    expect(soTien.compareDocumentPosition(han) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("gửi hóa đơn: lời nhắc do hệ thống tự lên lịch", () => {
  it("hộp xác nhận không nhắc tới lời nhắc — thông báo đến SAU khi gửi", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));

    expect(screen.getByRole("alertdialog")).not.toHaveTextContent(/nhắc khách|lên lịch nhắc/);
  });

  it("gửi chỉ mang nội dung hóa đơn — mọi thông số lời nhắc do quy tắc của người dùng quyết; hạng mục luôn là tên dự án", async () => {
    const { onSaveAndSend } = renderModal();

    await guiVaXacNhan();

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
    const args = onSaveAndSend.mock.calls[0];
    expect(args).toHaveLength(2);
    expect(args[0]).toBe("inv-1");
    expect(args[1].line_items[0].description).toBe("English center");
  });

  it("sửa hạn thanh toán xong vẫn gửi được như thường", async () => {
    const { onSaveAndSend } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("dd/mm/yyyy"), {
      target: { value: new Date(Date.now() + 20 * 86_400_000).toLocaleDateString("vi-VN") },
    });
    await guiVaXacNhan();

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
  });
});
