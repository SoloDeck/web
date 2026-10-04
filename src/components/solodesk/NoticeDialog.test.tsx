import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoticeDialog } from "./NoticeDialog";

describe("<NoticeDialog />", () => {
  it("hiện tiêu đề, mô tả, từng khoản còn thiếu và dòng chốt — chỉ có MỘT nút Đóng", () => {
    render(
      <NoticeDialog
        open
        onOpenChange={() => {}}
        title="Bạn chưa ghi nhận những khoản phải thu ngay"
        description="Khoản này thu khi hoàn thành."
        items={["Tạm ứng khi ký hợp đồng — 51.900.000 ₫", "Phụ thu — 1.000.000 ₫"]}
        footnote="Hãy thu và ghi nhận các khoản này trước."
      />
    );

    expect(screen.getByText("Bạn chưa ghi nhận những khoản phải thu ngay")).toBeInTheDocument();
    expect(screen.getByText("Khoản này thu khi hoàn thành.")).toBeInTheDocument();
    expect(screen.getByText("Tạm ứng khi ký hợp đồng — 51.900.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Phụ thu — 1.000.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Hãy thu và ghi nhận các khoản này trước.")).toBeInTheDocument();
    // Không có lựa chọn "cứ làm tiếp": việc đang định làm đã bị chặn.
    // (Thư viện dialog còn chèn vài thẻ <span role="button"> làm "chốt giữ focus" — không tính.)
    const realButtons = screen.getAllByRole("button").filter((el) => el.tagName === "BUTTON");
    expect(realButtons).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
  });

  it("bấm Đóng thì báo đóng hộp thoại", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<NoticeDialog open onOpenChange={onOpenChange} title="Nhắc" />);

    await user.click(screen.getByRole("button", { name: "Đóng" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("đóng bằng Esc cũng được", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<NoticeDialog open onOpenChange={onOpenChange} title="Nhắc" />);

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("không có items thì không dựng khung danh sách rỗng", () => {
    render(<NoticeDialog open onOpenChange={() => {}} title="Nhắc" items={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("khung rộng hơn mặc định — tiêu đề dài không bị rớt một chữ xuống dòng riêng", () => {
    // jsdom không có layout nên không đo được bề ngang; kiểm cái quyết định bề ngang: class của
    // khung. Khung gốc có `data-[size=default]:sm:max-w-lg`; class ghi đè phải CÙNG biến thể thì
    // `cn()` mới gỡ được cái cũ (một class `sm:max-w-xl` trơn bị lờ đi vì độ ưu tiên thấp hơn).
    render(
      <NoticeDialog open onOpenChange={() => {}} title="Bạn chưa ghi nhận những khoản phải thu ngay" />
    );

    const khung = screen.getByRole("alertdialog");
    expect(khung).toHaveClass("data-[size=default]:sm:max-w-xl");
    expect(khung).not.toHaveClass("data-[size=default]:sm:max-w-lg");
  });
});
