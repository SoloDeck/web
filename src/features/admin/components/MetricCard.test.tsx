import { render, screen } from "@testing-library/react";
import { Bot } from "lucide-react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "@/features/admin/components/AdminDashboard";

/**
 * Thẻ số liệu gọn (`compact`) nằm NGANG để bốn thẻ chỉ chiếm một hàng thấp: nhãn ở trên, giá trị và
 * dòng phụ cùng một hàng. Bản xếp dọc cao gấp đôi mà chỉ bày bốn con số.
 */

function the(props: Partial<React.ComponentProps<typeof MetricCard>> = {}) {
  return render(
    <MetricCard
      icon={Bot}
      label="Lượt gọi AI"
      value="219"
      hint="Toàn hệ thống"
      tone="primary"
      compact
      {...props}
    />
  );
}

describe("<MetricCard compact />", () => {
  it("giá trị và dòng phụ nằm CÙNG MỘT hàng, nhãn nằm ngay trên", () => {
    the();

    const hang = screen.getByText("219").parentElement as HTMLElement;
    expect(hang).toContainElement(screen.getByText("Toàn hệ thống"));
    expect(hang).not.toContainElement(screen.getByText("Lượt gọi AI"));
    expect(hang.className).toContain("flex");
  });

  it("biểu tượng đứng cạnh chữ (cùng một hàng ngang), không chồng lên trên", () => {
    const { container } = the();

    const hangNgang = container.querySelector("section > div") as HTMLElement;
    expect(hangNgang.className).toContain("flex");
    expect(hangNgang.className).not.toContain("flex-col");
    expect(hangNgang.querySelector("svg")).not.toBeNull();
    expect(hangNgang).toContainElement(screen.getByText("Lượt gọi AI"));
  });

  it("dòng phụ dài thì bị cắt chứ không đẩy thẻ cao lên", () => {
    the({ hint: "Một dòng phụ rất rất dài rất rất dài rất rất dài" });

    expect(screen.getByText(/Một dòng phụ/).className).toContain("truncate");
  });

  it("có tiến độ thì hiện phần trăm và thanh tiến độ", () => {
    const { container } = the({ progress: 42 });

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(container.querySelector("[style*='width: 42%']")).not.toBeNull();
  });
});

describe("<MetricCard /> thường", () => {
  it("vẫn xếp dọc như cũ (giá trị lớn, dòng phụ nằm dưới)", () => {
    the({ compact: false });

    const giaTri = screen.getByText("219");
    expect(giaTri.className).toContain("text-3xl");
    // Dòng phụ là một dòng RIÊNG ngay dưới giá trị, cả hai đều là con trực tiếp của thẻ.
    expect(giaTri.parentElement?.tagName).toBe("SECTION");
    expect(giaTri.nextElementSibling).toBe(screen.getByText("Toàn hệ thống"));
  });
});
