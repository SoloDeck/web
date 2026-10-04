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

describe("<ConfirmDialog /> nút phụ", () => {
  it("không truyền secondaryLabel/onSecondary thì không hiện nút thứ ba", () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Hỏi" cancelLabel="Để sau" onConfirm={() => {}} />
    );
    expect(screen.queryByRole("button", { name: /chỉ ghi nhận/ })).not.toBeInTheDocument();
  });

  it("bấm nút phụ thì chỉ gọi onSecondary — không onConfirm, không tự đóng", async () => {
    const user = userEvent.setup();
    const onSecondary = vi.fn();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Gửi?"
        confirmLabel="Gửi"
        secondaryLabel="Tôi đã gửi cách khác — chỉ ghi nhận"
        onSecondary={onSecondary}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tôi đã gửi cách khác — chỉ ghi nhận" }));

    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("<ConfirmDialog /> nội dung", () => {
  it("nhận cả JSX để nhấn mạnh một đoạn (ví dụ in đậm số tiền)", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Gửi?"
        description={
          <>
            Giá <strong>5.000.000 ₫</strong> nhé.
          </>
        }
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("5.000.000 ₫").tagName).toBe("STRONG");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Giá 5.000.000 ₫ nhé.");
  });

  it("vẫn nhận chuỗi thường như trước", () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Xoá?" description="Không hoàn tác được." onConfirm={() => {}} />
    );
    expect(screen.getByText("Không hoàn tác được.")).toBeInTheDocument();
  });
});
