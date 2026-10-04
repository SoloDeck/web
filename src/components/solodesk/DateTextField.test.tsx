import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateTextField } from "@/components/solodesk/DateTextField";

/**
 * Ô ngày kiểu Việt có lịch bấm chọn. Chỗ nhập ngày trước đây chỉ gõ tay (dd/mm/yyyy), người dùng
 * không có lịch để bấm. Các ngày dưới đây cố định để bài kiểm không phụ thuộc hôm nay là ngày nào.
 */

const NGAY_DANG_CHON = new Date(2026, 9, 17); // 17/10/2026

function setup(over: Partial<React.ComponentProps<typeof DateTextField>> = {}) {
  const onPick = vi.fn();
  const onValueChange = vi.fn();
  const onBlur = vi.fn();
  render(
    <DateTextField
      value="17/10/2026"
      onValueChange={onValueChange}
      onBlur={onBlur}
      selected={NGAY_DANG_CHON}
      onPick={onPick}
      calendarLabel="Mở lịch"
      {...over}
    />
  );
  return { onPick, onValueChange, onBlur };
}

const nutLich = () => screen.getByRole("button", { name: "Mở lịch" });
const lich = () => screen.getByRole("dialog", { name: "Lịch chọn ngày" });
const ngay = (so: string) => within(lich()).getByText(so, { selector: "button" });

describe("<DateTextField />", () => {
  it("mặc định chỉ có ô gõ, lịch đang đóng", () => {
    setup();

    expect(screen.getByPlaceholderText("dd/mm/yyyy")).toHaveValue("17/10/2026");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(nutLich()).toHaveAttribute("aria-expanded", "false");
  });

  it("bấm biểu tượng lịch thì mở lịch, đúng tháng và đánh dấu đúng ngày đang chọn", async () => {
    setup();

    await userEvent.click(nutLich());

    expect(nutLich()).toHaveAttribute("aria-expanded", "true");
    expect(lich()).toHaveTextContent(/2026/);
    const dangChon = within(lich()).getByRole("gridcell", { selected: true });
    expect(dangChon).toHaveTextContent("17");
  });

  it("bấm một ngày thì báo đúng ngày đó (theo lịch của người dùng) và đóng lịch", async () => {
    const { onPick } = setup();
    await userEvent.click(nutLich());

    await userEvent.click(ngay("20"));

    expect(onPick).toHaveBeenCalledTimes(1);
    const ngayDuocChon = onPick.mock.calls[0][0] as Date;
    expect([ngayDuocChon.getFullYear(), ngayDuocChon.getMonth(), ngayDuocChon.getDate()]).toEqual([
      2026, 9, 20,
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bấm lại đúng ngày đang chọn vẫn là chọn, không bị bỏ chọn", async () => {
    const { onPick } = setup();
    await userEvent.click(nutLich());

    await userEvent.click(ngay("17"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect((onPick.mock.calls[0][0] as Date).getDate()).toBe(17);
  });

  it("các ngày trước ngày tối thiểu bị mờ, bấm vào không chọn được", async () => {
    const { onPick } = setup({ minDate: new Date(2026, 9, 10) });
    await userEvent.click(nutLich());

    expect(ngay("5")).toBeDisabled();
    expect(ngay("9")).toBeDisabled();
    expect(ngay("10")).toBeEnabled();
    await userEvent.click(ngay("5"));

    expect(onPick).not.toHaveBeenCalled();
    expect(lich()).toBeInTheDocument();
  });

  it("bấm ra ngoài thì đóng lịch", async () => {
    setup();
    await userEvent.click(nutLich());
    expect(lich()).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bấm vào chính lịch thì KHÔNG đóng (đổi tháng còn phải bấm tiếp)", async () => {
    setup();
    await userEvent.click(nutLich());

    await userEvent.click(within(lich()).getByRole("button", { name: /tháng sau|next/i }));

    expect(lich()).toBeInTheDocument();
  });

  it("Esc đóng riêng cái lịch, không lan lên cửa sổ cha", async () => {
    const choCha = vi.fn();
    const choTrang = vi.fn();
    window.addEventListener("keydown", choTrang);
    render(
      <div onKeyDown={choCha}>
        <DateTextField
          value=""
          onValueChange={vi.fn()}
          onPick={vi.fn()}
          calendarLabel="Mở lịch"
        />
      </div>
    );
    await userEvent.click(nutLich());

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(choCha).not.toHaveBeenCalled();
    expect(choTrang).not.toHaveBeenCalled();
    window.removeEventListener("keydown", choTrang);
  });

  it("Esc khi lịch đang đóng thì để yên cho cửa sổ cha xử lý", async () => {
    const choCha = vi.fn();
    render(
      <div onKeyDown={choCha}>
        <DateTextField value="" onValueChange={vi.fn()} onPick={vi.fn()} calendarLabel="Mở lịch" />
      </div>
    );
    await userEvent.click(screen.getByPlaceholderText("dd/mm/yyyy"));

    await userEvent.keyboard("{Escape}");

    expect(choCha).toHaveBeenCalled();
  });

  it("ô bị khóa thì nút lịch cũng khóa, không mở được lịch", async () => {
    setup({ disabled: true });

    expect(screen.getByPlaceholderText("dd/mm/yyyy")).toBeDisabled();
    expect(nutLich()).toBeDisabled();
    await userEvent.click(nutLich());

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("đang mở lịch mà ô bị khóa (ví dụ hóa đơn vừa được gửi) thì lịch tự biến mất", async () => {
    const props = {
      value: "17/10/2026",
      onValueChange: vi.fn(),
      onPick: vi.fn(),
      calendarLabel: "Mở lịch",
    };
    const { rerender } = render(<DateTextField {...props} />);
    await userEvent.click(nutLich());
    expect(lich()).toBeInTheDocument();

    rerender(<DateTextField {...props} disabled />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("gõ tay vẫn báo qua onValueChange, rời ô thì báo onBlur", async () => {
    const { onValueChange, onBlur } = setup({ value: "" });
    const o = screen.getByPlaceholderText("dd/mm/yyyy");

    await userEvent.type(o, "5");
    await userEvent.tab();

    expect(onValueChange).toHaveBeenCalledWith("5");
    expect(onBlur).toHaveBeenCalled();
  });
});
