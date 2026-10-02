import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(extra: { onCancel?: () => void } = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Chuyển qua trạng thái triển khai?"
      confirmLabel="Chuyển sang triển khai"
      cancelLabel="Để sau"
      onConfirm={onConfirm}
      {...extra}
    />
  );
  return { onOpenChange, onConfirm };
}

/**
 * `onCancel` chạy khi bấm ĐÚNG nút từ chối ("Để sau"), không chạy khi đóng bằng Esc. Nhờ vậy chỗ
 * gọi phân biệt được "để sau, vẫn làm tiếp việc đang dở" với "bỏ hẳn".
 */
describe("<ConfirmDialog /> onCancel", () => {
  it("bấm nút từ chối thì gọi onCancel rồi đóng hộp thoại", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { onOpenChange } = setup({ onCancel });

    await user.click(screen.getByRole("button", { name: "Để sau" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("đóng bằng Esc thì KHÔNG gọi onCancel — đó là bỏ hẳn, không phải 'để sau'", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { onOpenChange } = setup({ onCancel });

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("không truyền onCancel thì nút từ chối vẫn đóng hộp thoại như cũ", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onConfirm } = setup();

    await user.click(screen.getByRole("button", { name: "Để sau" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("bấm xác nhận thì gọi onConfirm và KHÔNG tự đóng (chỗ gọi tự đóng khi xong việc)", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { onOpenChange, onConfirm } = setup({ onCancel });

    await user.click(screen.getByRole("button", { name: "Chuyển sang triển khai" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
