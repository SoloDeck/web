import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { X } from "lucide-react";
import { WindowControlButton } from "./WindowControlButton";

/**
 * Nút này CHỈ có biểu tượng, nên `label` là thứ DUY NHẤT còn nói được nó làm gì. Thiếu
 * `title` là người rê chuột không biết; thiếu `aria-label` là trình đọc màn hình mù và các
 * test tìm nút theo tên cũng gãy. Test này chốt cả hai lại.  #Huynh
 */
describe("<WindowControlButton />", () => {
  it("gắn label vào CẢ title lẫn aria-label", () => {
    render(<WindowControlButton icon={X} label="Thu nhỏ" onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Thu nhỏ" });
    expect(button).toHaveAttribute("title", "Thu nhỏ");
    expect(button).toHaveAttribute("aria-label", "Thu nhỏ");
  });

  it("bấm thì gọi onClick", async () => {
    const onClick = vi.fn();
    render(<WindowControlButton icon={X} label="Đóng" onClick={onClick} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("không lẫn chữ nào vào nút — chỉ biểu tượng", () => {
    render(<WindowControlButton icon={X} label="Đóng" onClick={vi.fn()} />);

    // Nhãn nằm ở thuộc tính, KHÔNG phải nội dung nhìn thấy được. Có chữ hiện ra là quay lại
    // đúng cái header lộn xộn mà thay đổi này dọn đi.
    expect(screen.getByRole("button", { name: "Đóng" })).toHaveTextContent("");
  });
});
