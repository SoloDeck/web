import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateFilterField } from "@/features/admin/components/DateFilterField";

/**
 * Ô lọc ngày trong thanh bộ lọc: nhãn ngắn đứng trước, ngày hiện dạng ngày/tháng/năm, có lịch.
 * Bộ lọc giữ ISO; ô chỉ đổi bộ lọc khi chữ gõ thành một ngày có thật.
 */

function setup(over: Partial<React.ComponentProps<typeof DateFilterField>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <DateFilterField label="Từ" ariaLabel="Từ ngày" value="" onChange={onChange} {...over} />
  );
  return { onChange, ...utils };
}

const o = () => screen.getByRole("textbox", { name: "Từ ngày" });
const nutLich = () => screen.getByRole("button", { name: "Mở lịch: Từ ngày" });
const lich = () => screen.getByRole("dialog", { name: "Lịch chọn ngày" });
const ngay = (so: string) => within(lich()).getByText(so, { selector: "button" });

describe("<DateFilterField />", () => {
  it("hiện nhãn ngắn trước ô và đặt tên đầy đủ cho ô", () => {
    setup();

    expect(screen.getByText("Từ")).toBeInTheDocument();
    expect(o()).toHaveAttribute("placeholder", "dd/mm/yyyy");
  });

  it("giá trị ISO hiện thành ngày/tháng/năm", () => {
    setup({ value: "2026-10-05" });

    expect(o()).toHaveValue("05/10/2026");
  });

  it("gõ một ngày đầy đủ thì báo ISO ra ngoài", async () => {
    const { onChange } = setup();

    await userEvent.type(o(), "05/10/2026");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2026-10-05");
  });

  it("gõ dở dang thì CHƯA báo gì ra ngoài", async () => {
    const { onChange } = setup();

    await userEvent.type(o(), "05/10/20");

    expect(onChange).not.toHaveBeenCalled();
    expect(o()).toHaveValue("05/10/20");
  });

  it("ngày không có thật (31/02) thì không báo ra ngoài", async () => {
    const { onChange } = setup();

    await userEvent.type(o(), "31/02/2026");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("gõ lại đúng ngày đang lọc thì không báo thừa", async () => {
    const { onChange } = setup({ value: "2026-10-05" });

    await userEvent.clear(o());
    onChange.mockClear();
    await userEvent.type(o(), "05/10/2026");

    // Sau khi xóa, `value` vẫn là bản cũ vì chưa có ai cập nhật nó → gõ lại chính ngày đó là không đổi.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("xóa hết chữ thì báo '' (bỏ lọc)", async () => {
    const { onChange } = setup({ value: "2026-10-05" });

    await userEvent.clear(o());

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("rời ô khi còn gõ dở thì chữ trả về ngày đang lọc", async () => {
    setup({ value: "2026-10-05" });
    await userEvent.type(o(), "x");

    await userEvent.tab();

    expect(o()).toHaveValue("05/10/2026");
  });

  it("rời ô khi chưa lọc ngày nào thì ô trống lại", async () => {
    setup();
    await userEvent.type(o(), "05/1");

    await userEvent.tab();

    expect(o()).toHaveValue("");
  });

  it("bộ lọc bị đặt lại từ bên ngoài thì chữ trong ô đi theo", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateFilterField label="Từ" ariaLabel="Từ ngày" value="2026-10-05" onChange={onChange} />
    );
    expect(o()).toHaveValue("05/10/2026");

    rerender(<DateFilterField label="Từ" ariaLabel="Từ ngày" value="" onChange={onChange} />);

    expect(o()).toHaveValue("");
  });

  it("bộ lọc đổi từ bên ngoài sang ngày khác thì ô hiện ngày mới", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateFilterField label="Từ" ariaLabel="Từ ngày" value="2026-10-05" onChange={onChange} />
    );

    rerender(
      <DateFilterField label="Từ" ariaLabel="Từ ngày" value="2026-11-20" onChange={onChange} />
    );

    expect(o()).toHaveValue("20/11/2026");
  });

  it("chọn một ngày trên lịch thì báo ISO của đúng ngày đó", async () => {
    const { onChange } = setup({ value: "2026-10-05" });

    await userEvent.click(nutLich());
    await userEvent.click(ngay("20"));

    expect(onChange).toHaveBeenCalledWith("2026-10-20");
  });

  it("lịch mở đúng tháng của ngày đang lọc và đánh dấu ngày đó", async () => {
    setup({ value: "2026-10-05" });

    await userEvent.click(nutLich());

    expect(lich()).toHaveTextContent(/2026/);
    expect(within(lich()).getByRole("gridcell", { selected: true })).toHaveTextContent("5");
  });

  it("minDate làm mờ các ngày trước nó", async () => {
    setup({ minDate: "2026-10-10", value: "2026-10-15" });

    await userEvent.click(nutLich());

    expect(ngay("9")).toBeDisabled();
    expect(ngay("10")).toBeEnabled();
  });

  it("maxDate làm mờ các ngày sau nó", async () => {
    setup({ maxDate: "2026-10-20", value: "2026-10-15" });

    await userEvent.click(nutLich());

    expect(ngay("20")).toBeEnabled();
    expect(ngay("21")).toBeDisabled();
  });

  it("lịch căn theo mép trái của ô (ô nằm giữa thanh bộ lọc, không tràn ra ngoài bên phải)", async () => {
    setup();

    await userEvent.click(nutLich());

    expect(lich()).toHaveClass("left-0");
  });
});
