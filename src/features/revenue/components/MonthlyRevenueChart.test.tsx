import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MonthlyRevenueChart } from "./MonthlyRevenueChart";

/**
 * Biểu đồ này đếm HOÁ ĐƠN; thẻ "Đã thu" phía trên đếm MỐC THANH TOÁN đã tick. Hai nguồn có thể
 * lệch nhau (hoá đơn lập tay, mốc tick không kèm hoá đơn), nên biểu đồ không được gọi con số của
 * nó là "Đã thu" — màn hình từng có hai ô "Đã thu" mang hai giá trị khác nhau.
 */

const THANG = [
  { month: "2026-07", invoiced: 200_000_000, collected: 200_000_000 },
  { month: "2026-08", invoiced: 310_625_000, collected: 238_375_000 },
  { month: "2026-10", invoiced: 770_950_000, collected: 770_950_000 },
];

describe("<MonthlyRevenueChart /> — tên gọi", () => {
  it("tổng ghi 'Hoá đơn đã xuất' và 'Khách đã trả' với đúng số cộng được", () => {
    render(<MonthlyRevenueChart data={THANG} />);

    expect(screen.getByText(/Hoá đơn đã xuất:/)).toHaveTextContent("1.281.575.000");
    expect(screen.getByText(/Khách đã trả:/)).toHaveTextContent("1.209.325.000");
  });

  it("KHÔNG dùng chữ 'Đã thu' / 'Chưa thu' — hai chữ đó thuộc về thẻ mốc thanh toán", () => {
    render(<MonthlyRevenueChart data={THANG} />);

    expect(screen.queryByText(/Đã thu/)).toBeNull();
    expect(screen.queryByText(/Chưa thu/)).toBeNull();
    expect(screen.queryByText(/Còn phải thu/)).toBeNull();
  });

  it("chú giải có đủ hai phần: khách đã trả / chưa trả", () => {
    render(<MonthlyRevenueChart data={THANG} />);

    expect(screen.getByText("Khách đã trả")).toBeInTheDocument();
    expect(screen.getByText("Chưa trả")).toBeInTheDocument();
  });

  it("rê chuột vào cột thì chú thích nói 'Khách đã trả / Chưa trả / Đã xuất' của đúng tháng", async () => {
    const { container } = render(<MonthlyRevenueChart data={THANG} />);

    const cotThang8 = container.querySelectorAll(".group")[1] as HTMLElement;
    await userEvent.hover(cotThang8);

    expect(screen.getByText("Tháng 8/2026")).toBeInTheDocument();
    expect(screen.getAllByText("Khách đã trả").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Chưa trả").length).toBeGreaterThan(1);
    expect(screen.getByText("Đã xuất")).toBeInTheDocument();
    // 310.625.000 - 238.375.000 = 72.250.000 chưa trả.
    expect(screen.getByText(/72\.250\.000/)).toBeInTheDocument();
  });

  it("chú thích không để nhãn 'Khách đã trả' xuống dòng: rộng đủ và nhãn không bẻ chữ", async () => {
    const { container } = render(<MonthlyRevenueChart data={THANG} />);

    await userEvent.hover(container.querySelectorAll(".group")[1] as HTMLElement);

    const chuThich = screen.getByText("Tháng 8/2026").parentElement as HTMLElement;
    expect(chuThich).toHaveClass("w-56");
    for (const nhan of ["Khách đã trả", "Chưa trả", "Đã xuất"]) {
      const trongChuThich = Array.from(chuThich.querySelectorAll("span")).find(
        (span) => span.textContent === nhan
      );
      expect(trongChuThich, nhan).toHaveClass("whitespace-nowrap");
    }
  });

  it("hai cột đầu căn mép trái, hai cột cuối căn mép phải, cột giữa căn giữa — chú thích không tràn khung", async () => {
    const muoiHaiThang = Array.from({ length: 12 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, "0")}`,
      invoiced: 100_000_000,
      collected: 60_000_000,
    }));
    const { container } = render(<MonthlyRevenueChart data={muoiHaiThang} />);
    const cot = container.querySelectorAll(".group");
    const chuThichCuaCot = async (viTri: number) => {
      await userEvent.hover(cot[viTri] as HTMLElement);
      return screen.getByText(/^Tháng \d+\/2026$/).parentElement as HTMLElement;
    };

    expect(await chuThichCuaCot(0)).toHaveClass("left-0");
    expect(await chuThichCuaCot(1)).toHaveClass("left-0");
    expect(await chuThichCuaCot(5)).toHaveClass("left-1/2", "-translate-x-1/2");
    expect(await chuThichCuaCot(10)).toHaveClass("right-0");
    expect(await chuThichCuaCot(11)).toHaveClass("right-0");
  });

  it("chưa có hoá đơn nào thì nói trống, không in tổng 0", () => {
    render(<MonthlyRevenueChart data={[{ month: "2026-10", invoiced: 0, collected: 0 }]} />);

    expect(screen.getByText(/Chưa có hoá đơn nào/)).toBeInTheDocument();
    expect(screen.queryByText(/Hoá đơn đã xuất:/)).toBeNull();
  });
});
