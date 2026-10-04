import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContractChooserDialog } from "@/features/deals/components/ContractChooserDialog";
import type { TermTemplateOption } from "@/services/proposalsService";

/**
 * Hộp thoại "Tạo hợp đồng". Dấu X ở góc và phím Esc đã đóng được hộp, nên nút "Hủy" ở hàng nút là
 * thừa — hàng nút chỉ giữ hai hành động thật sự đổi kết quả: tự soạn hoặc nhờ AI.
 */

const MAU: TermTemplateOption[] = [
  { id: "t1", name: "Hợp đồng Lập trình phần mềm", blocks: ["Điều khoản chuẩn"] },
];

function mo(over: Partial<React.ComponentProps<typeof ContractChooserDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    templates: MAU,
    templateId: null as string | null,
    onTemplateChange: vi.fn(),
    canUseAi: true as boolean | undefined,
    onSelfCompose: vi.fn(),
    onAi: vi.fn(),
    ...over,
  };
  render(<ContractChooserDialog {...props} />);
  return props;
}

describe("<ContractChooserDialog />", () => {
  it("không còn nút 'Hủy' — chỉ còn hai nút hành động ở chân hộp", () => {
    mo();

    expect(screen.queryByRole("button", { name: "Hủy" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tôi tự soạn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nhờ AI viết" })).toBeInTheDocument();
  });

  it("dấu X ở góc đóng được hộp thoại", async () => {
    const { onOpenChange } = mo();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("phím Esc đóng được hộp thoại", async () => {
    const { onOpenChange } = mo();

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("'Tôi tự soạn' gọi đúng đường không AI, 'Nhờ AI viết' gọi đúng đường AI", async () => {
    const { onSelfCompose, onAi } = mo();

    await userEvent.click(screen.getByRole("button", { name: "Tôi tự soạn" }));
    expect(onSelfCompose).toHaveBeenCalledTimes(1);
    expect(onAi).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Nhờ AI viết" }));
    expect(onAi).toHaveBeenCalledTimes(1);
    expect(onSelfCompose).toHaveBeenCalledTimes(1);
  });

  it("gói không dùng được AI thì khoá 'Nhờ AI viết', vẫn cho 'Tôi tự soạn'", async () => {
    const { onSelfCompose, onAi } = mo({ canUseAi: false });

    expect(screen.getByRole("button", { name: "Nhờ AI viết" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Nhờ AI viết" }));
    expect(onAi).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tôi tự soạn" }));
    expect(onSelfCompose).toHaveBeenCalledTimes(1);
  });

  it("chưa biết gói (đang tải) thì chưa khoá nút AI", () => {
    mo({ canUseAi: undefined });

    expect(screen.getByRole("button", { name: "Nhờ AI viết" })).toBeEnabled();
  });

  it("chọn một mẫu thì báo id của mẫu đó, chọn 'Không dùng mẫu' thì báo null", async () => {
    const { onTemplateChange } = mo({ templateId: "t1" });

    await userEvent.click(screen.getByRole("button", { name: /Không dùng mẫu/ }));
    expect(onTemplateChange).toHaveBeenLastCalledWith(null);

    await userEvent.click(screen.getByRole("button", { name: /Hợp đồng Lập trình phần mềm/ }));
    expect(onTemplateChange).toHaveBeenLastCalledWith("t1");
  });

  it("đánh dấu đúng lựa chọn đang chọn: không mẫu khi null, mẫu đó khi có id", () => {
    const { unmount } = render(
      <ContractChooserDialog
        open
        onOpenChange={vi.fn()}
        templates={MAU}
        templateId={null}
        onTemplateChange={vi.fn()}
        canUseAi
        onSelfCompose={vi.fn()}
        onAi={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Không dùng mẫu/ })).toHaveClass("border-primary");
    expect(screen.getByRole("button", { name: /Hợp đồng Lập trình phần mềm/ })).not.toHaveClass(
      "border-primary"
    );
    unmount();

    mo({ templateId: "t1" });
    expect(screen.getByRole("button", { name: /Hợp đồng Lập trình phần mềm/ })).toHaveClass(
      "border-primary"
    );
    expect(screen.getByRole("button", { name: /Không dùng mẫu/ })).not.toHaveClass("border-primary");
  });

  it("đóng thì không dựng gì ra", () => {
    mo({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hiện tiêu đề và danh sách mẫu", () => {
    mo();

    expect(screen.getByRole("dialog", { name: "Tạo hợp đồng" })).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng Lập trình phần mềm")).toBeInTheDocument();
  });
});
