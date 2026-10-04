import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DealFailureDialog } from "@/features/deals/components/DealFailureDialog";
import { FAILURE_REASONS } from "@/features/deals/dealFailure";

/**
 * "Loại bỏ dự án" = đánh dấu dự án KHÔNG THÀNH CÔNG, bắt buộc kèm lý do.
 *
 * Trước đây nút này chỉ xóa mềm: deal biến khỏi mọi thống kê nên tỷ lệ thắng luôn 100%. Hộp thoại
 * này là chỗ duy nhất đòi lý do — xác nhận khi chưa có lý do thì deal sẽ mất mà không để lại dấu.
 */

function setup(extra: { isLoading?: boolean } = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <DealFailureDialog
      open
      onOpenChange={onOpenChange}
      dealTitle="Logo thương hiệu"
      onConfirm={onConfirm}
      {...extra}
    />
  );
  return { onOpenChange, onConfirm };
}

const nutXacNhan = () => screen.getByRole("button", { name: "Loại bỏ" });
const chon = (ten: string) => screen.getByRole("radio", { name: ten });
const oGhiChu = () => screen.getByRole("textbox");

describe("<DealFailureDialog />", () => {
  it("đóng thì không vẽ gì", () => {
    render(
      <DealFailureDialog open={false} onOpenChange={vi.fn()} dealTitle="X" onConfirm={vi.fn()} />
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("nói rõ hậu quả: dự án được ghi nhận KHÔNG THÀNH CÔNG và chuyển vào Kho lưu trữ", () => {
    setup();

    const hop = screen.getByRole("alertdialog");
    expect(hop).toHaveTextContent("Loại bỏ dự án?");
    expect(hop).toHaveTextContent(
      'Dự án "Logo thương hiệu" sẽ được ghi nhận là KHÔNG THÀNH CÔNG và chuyển vào Kho lưu trữ.'
    );
  });

  it("có đủ các lý do để chọn nhanh", () => {
    setup();

    for (const ten of FAILURE_REASONS) {
      expect(chon(ten)).toBeInTheDocument();
    }
  });

  it("chưa chọn lý do thì KHÔNG xác nhận được", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    expect(nutXacNhan()).toBeDisabled();
    await user.click(nutXacNhan());

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("gõ ghi chú mà chưa chọn lý do vẫn chưa xác nhận được", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(oGhiChu(), "ghi chú lẻ loi");

    expect(nutXacNhan()).toBeDisabled();
  });

  it("chọn một lý do nhanh thì xác nhận và gửi đúng lý do đó", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(chon("Ngân sách không đủ"));
    expect(chon("Ngân sách không đủ")).toHaveAttribute("aria-checked", "true");
    await user.click(nutXacNhan());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Ngân sách không đủ");
  });

  it("chọn lý do kèm ghi chú thì gửi câu ghép", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(chon("Khách chọn bên khác"));
    await user.type(oGhiChu(), "giá thấp hơn 30%");
    await user.click(nutXacNhan());

    expect(onConfirm).toHaveBeenCalledWith("Khách chọn bên khác: giá thấp hơn 30%");
  });

  it("chọn 'Khác' thì BẮT BUỘC nêu lý do, và nhãn ô nhập đổi theo", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    expect(screen.getByLabelText(/Ghi chú thêm \(không bắt buộc\)/)).toBeInTheDocument();
    await user.click(chon("Khác"));

    expect(screen.getByLabelText("Nêu lý do")).toBeInTheDocument();
    expect(nutXacNhan()).toBeDisabled();

    await user.type(oGhiChu(), "   ");
    expect(nutXacNhan()).toBeDisabled();

    await user.type(oGhiChu(), "khách đổi ý");
    await user.click(nutXacNhan());
    expect(onConfirm).toHaveBeenCalledWith("khách đổi ý");
  });

  it("ô ghi chú giới hạn 1000 ký tự — khớp giới hạn của backend", () => {
    setup();

    expect(oGhiChu()).toHaveAttribute("maxLength", "1000");
  });

  it("xác nhận KHÔNG tự đóng hộp — chỗ gọi đóng khi xong việc", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();

    await user.click(chon("Khách không phản hồi"));
    await user.click(nutXacNhan());

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("bấm Giữ lại thì đóng hộp và không gửi gì", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onConfirm } = setup();

    await user.click(screen.getByRole("button", { name: "Giữ lại" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("đang xử lý thì khóa mọi thứ: không đổi lý do, không bấm lại, Esc không đóng", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onConfirm } = setup({ isLoading: true });

    expect(screen.getByRole("button", { name: "Đang xử lý..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Giữ lại" })).toBeDisabled();
    expect(chon("Khác")).toBeDisabled();
    expect(oGhiChu()).toBeDisabled();

    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("đóng rồi mở lại thì lý do cũ không còn — không lỡ tay xác nhận lý do của lần trước", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>Mở lại</button>
          <DealFailureDialog
            open={open}
            onOpenChange={setOpen}
            dealTitle="Logo thương hiệu"
            onConfirm={vi.fn()}
          />
        </>
      );
    }
    render(<Harness />);
    await user.click(chon("Khách chọn bên khác"));
    await user.type(oGhiChu(), "ghi chú cũ");
    expect(nutXacNhan()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Giữ lại" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Mở lại" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(chon("Khách chọn bên khác")).toHaveAttribute("aria-checked", "false");
    expect(oGhiChu()).toHaveValue("");
    expect(nutXacNhan()).toBeDisabled();
  });
});
