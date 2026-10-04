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
    // Địa chỉ nhận được IN ĐẬM (đã cắt khoảng trắng thừa), và câu vẫn đọc liền mạch.
    expect(screen.getByText("khach@example.com").tagName).toBe("STRONG");
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Hệ thống sẽ gửi email kèm file PDF hợp đồng tới khach@example.com."
    );
  });

  it("nội dung gọn — không còn hai câu dặn dò thừa", () => {
    render(<ConfirmSendContractDialog open onOpenChange={() => {}} onConfirm={() => {}} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).not.toHaveTextContent(/không rút lại được/);
    expect(dialog).not.toHaveTextContent(/hãy kiểm tra kỹ/i);
    expect(dialog).not.toHaveTextContent(/Zalo/);
  });

  it("chưa biết email khách thì nói chung là email của khách hàng, không in 'undefined'", () => {
    render(<ConfirmSendContractDialog open onOpenChange={() => {}} onConfirm={() => {}} />);

    expect(screen.getByText(/tới email của khách hàng/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });

  it("chỉ gửi khi bấm 'Lưu & gửi'; 'Hủy' thì không gửi", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmSendContractDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Lưu & gửi" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("<ConfirmSendContractDialog /> chỉ ghi nhận", () => {
  it("có onRecordOnly thì hiện lựa chọn 'đã gửi cách khác' và nó KHÔNG gửi email", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onRecordOnly = vi.fn();
    render(
      <ConfirmSendContractDialog
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
        onRecordOnly={onRecordOnly}
      />
    );

    await user.click(screen.getByRole("button", { name: "Chỉ lưu" }));

    expect(onRecordOnly).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("ba nút theo thứ tự — 'Hủy', 'Chỉ lưu', 'Lưu & gửi' — giống hộp thoại gửi báo giá", () => {
    render(
      <ConfirmSendContractDialog open onOpenChange={() => {}} onConfirm={() => {}} onRecordOnly={() => {}} />
    );

    // Chỉ đếm thẻ <button> thật — Base UI chèn thêm vài thẻ giữ focus không phải nút.
    const labels = Array.from(screen.getByRole("alertdialog").querySelectorAll("button")).map((b) =>
      b.textContent?.trim()
    );
    expect(labels).toEqual(["Hủy", "Chỉ lưu", "Lưu & gửi"]);
  });

  it("không truyền onRecordOnly thì không có lựa chọn đó", () => {
    render(<ConfirmSendContractDialog open onOpenChange={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("button", { name: /chỉ lưu/i })).not.toBeInTheDocument();
  });
});
