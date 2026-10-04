import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmSendInvoiceDialog } from "./ConfirmSendInvoiceDialog";

/**
 * Gửi hóa đơn = email mang SỐ TIỀN tới khách thật, đã đi thì không thu hồi được. Hộp thoại cùng
 * khuôn với gửi báo giá / hợp đồng: "Hủy" · "Lưu & gửi", nội dung gọn, in đậm chỗ cần nhìn.
 */
function renderDialog(over: Partial<Parameters<typeof ConfirmSendInvoiceDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmSendInvoiceDialog
      open
      onOpenChange={onOpenChange}
      invoiceNumber="INV-20261003-AB12"
      total={521_900_000}
      clientName="Hoa Huynh"
      clientEmail="  khach@example.com  "
      onConfirm={onConfirm}
      {...over}
    />
  );
  return { onConfirm, onOpenChange };
}

describe("<ConfirmSendInvoiceDialog />", () => {
  it("tiêu đề nhắc đúng mã hóa đơn, số tiền và người nhận", () => {
    renderDialog();
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent("Gửi hóa đơn INV-20261003-AB12");
    expect(hopThoai).toHaveTextContent(/521\.900\.000/);
    expect(hopThoai).toHaveTextContent("cho Hoa Huynh?");
  });

  it("nội dung gọn, email nhận được IN ĐẬM (đã cắt khoảng trắng), không còn câu dặn thừa", () => {
    renderDialog();

    expect(screen.getByText("khach@example.com").tagName).toBe("STRONG");
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent("Hệ thống sẽ gửi email kèm hóa đơn tới khach@example.com.");
    expect(hopThoai).not.toHaveTextContent(/không thu hồi được/);
    expect(hopThoai).not.toHaveTextContent(/ngay bây giờ/);
  });

  it("chưa biết email khách thì nói chung, không in 'undefined'", () => {
    renderDialog({ clientEmail: null });

    expect(screen.getByText(/tới email đã lưu của khách/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });

  it("đúng hai nút theo thứ tự: 'Hủy' rồi 'Lưu & gửi'", () => {
    renderDialog();

    // Chỉ đếm thẻ <button> thật — Base UI chèn thêm vài thẻ giữ focus không phải nút.
    const labels = Array.from(screen.getByRole("alertdialog").querySelectorAll("button")).map((b) =>
      b.textContent?.trim()
    );
    expect(labels).toEqual(["Hủy", "Lưu & gửi"]);
  });

  it("chỉ gửi khi bấm 'Lưu & gửi'; 'Hủy' thì không gửi", async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Lưu & gửi" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
