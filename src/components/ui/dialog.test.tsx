import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Hộp thoại là một lưới (`grid`). Cột lưới mặc định co giãn theo nội dung nên một dòng chữ không
 * xuống dòng (ví dụ phụ đề `truncate` rất dài) đẩy cột rộng hơn chính hộp, và mọi thứ nằm cùng cột
 * — kể cả hàng nút ở chân — văng ra ngoài hộp. Cột phải bị khoá bằng đúng bề rộng của hộp.
 */
describe("<DialogContent />", () => {
  it("cột lưới bị khoá bằng bề rộng hộp, không phình theo nội dung dài", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo hợp đồng</DialogTitle>
          </DialogHeader>
          <p className="truncate">{"rất dài ".repeat(80)}</p>
        </DialogContent>
      </Dialog>
    );

    const hop = screen.getByRole("dialog");
    expect(hop).toHaveClass("grid");
    expect(hop).toHaveClass("grid-cols-[minmax(0,1fr)]");
  });

  it("vẫn nhận className riêng của nơi dùng (độ rộng tối đa...)", () => {
    render(
      <Dialog open>
        <DialogContent className="max-w-md">
          <DialogTitle>Tiêu đề</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-w-md", "grid-cols-[minmax(0,1fr)]");
  });
});
