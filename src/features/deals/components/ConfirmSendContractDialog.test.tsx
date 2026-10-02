import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmSendContractDialog } from "./ConfirmSendContractDialog";

/**
 * Gửi hợp đồng = gửi email THẬT kèm PDF tới khách, thư đã đi thì không rút lại được — nên mọi
 * nút "Gửi cho khách ký" phải hỏi lại một lần, và câu hỏi nói rõ thư sẽ đi đâu.
 */
describe("<ConfirmSendContractDialog />", () => {
  it("nêu thẳng email khách để freelancer thấy thư sẽ đi đâu", () => {
    render(
      <ConfirmSendContractDialog
        open
        onOpenChange={() => {}}
        clientEmail="  khach@example.com  "
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Gửi hợp đồng cho khách ký?")).toBeInTheDocument();
    expect(screen.getByText(/gửi email kèm file PDF hợp đồng tới khach@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/không rút lại được/)).toBeInTheDocument();
  });

  it("chưa biết email khách thì nói chung là email của khách hàng, không in 'undefined'", () => {
    render(<ConfirmSendContractDialog open onOpenChange={() => {}} onConfirm={() => {}} />);

    expect(screen.getByText(/tới email của khách hàng/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });

  it("chỉ gửi khi bấm 'Gửi hợp đồng'; 'Để tôi xem lại' thì không gửi", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmSendContractDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Để tôi xem lại" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Gửi hợp đồng" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
