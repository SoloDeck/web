import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentTransferDialog } from "@/features/subscriptions/components/PaymentTransferDialog";
import type { PaymentIntentResponse } from "@/services/subscriptionsService";

/**
 * Màn này là đường thoát khi quét QR hỏng — mà quét hỏng là chuyện thường: thiếu sáng, app
 * ngân hàng không quét được từ màn hình, người dùng ngồi máy bàn. Khi đó bốn dòng thông tin
 * là cách DUY NHẤT tiền vẫn tới được. Nên mỗi dòng, và mỗi thứ nó chép ra, đều có test.
 */

const QR_URL = "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS";

function intentStub(over: Partial<PaymentIntentResponse> = {}): PaymentIntentResponse {
  return {
    id: "48d7860d-0000-0000-0000-000000000000",
    subscription_id: "sub-1",
    plan_id: "plan-pro",
    provider: "sepay",
    status: "pending",
    amount: "199000.00",
    currency: "VND",
    order_code: "SDDYFM83AS",
    payment_link: {
      type: "bank_transfer_instruction",
      url: QR_URL,
      qr_code_url: QR_URL,
      instructions:
        "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB), nội dung ghi đúng: SDDYFM83AS",
    },
    provider_reference: null,
    paid_at: null,
    expires_at: new Date(Date.now() + 25 * 60_000).toISOString(),
    failure_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function moMan(intent: PaymentIntentResponse = intentStub()) {
  const onCancelOrder = vi.fn();
  const onRecheck = vi.fn();
  render(
    <PaymentTransferDialog
      open
      onOpenChange={vi.fn()}
      intent={intent}
      planName="Pro"
      onRecheck={onRecheck}
      onCancelOrder={onCancelOrder}
    />
  );
  return { onCancelOrder, onRecheck };
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => vi.useRealTimers());

describe("<PaymentTransferDialog /> — bốn dòng chuyển khoản", () => {
  it("bày đủ ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản", () => {
    moMan();

    expect(screen.getByText("ACB")).toBeInTheDocument();
    expect(screen.getByText("40104887")).toBeInTheDocument();
    expect(screen.getByText("SDDYFM83AS")).toBeInTheDocument();
    expect(screen.getByText(/199\.000/)).toBeInTheDocument();
  });

  it("số tiền hiện có dấu chấm dù backend trả chuỗi Decimal '199000.00'", () => {
    // Chặn đúng lớp bug mà `price_monthly` đã từng dính: khai `number` rồi format ra "NaN ₫".
    moMan();
    expect(screen.getByText(/199\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("nội dung chuyển khoản lấy từ order_code, KHÔNG phải id của đơn", () => {
    moMan();
    expect(screen.getByText("SDDYFM83AS")).toBeInTheDocument();
    expect(screen.queryByText(/48d7860d/)).not.toBeInTheDocument();
  });
});

describe("<PaymentTransferDialog /> — sao chép", () => {
  it("chép số tài khoản ra chuỗi số trần, không kèm nhãn", async () => {
    // fireEvent chứ không phải userEvent: `userEvent.setup()` tự cài một stub clipboard
    // của riêng nó, che mất bản mock của test và `writeText` không bao giờ được gọi.
    moMan();

    fireEvent.click(screen.getByRole("button", { name: /sao chép số tài khoản/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("40104887"));
  });

  it("chép số tiền ra '199000', KHÔNG chép '199.000 ₫' — app ngân hàng không nhận dấu chấm", async () => {
    moMan();

    fireEvent.click(screen.getByRole("button", { name: /sao chép số tiền/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("199000"));
  });

  it("mỗi nút sao chép nói rõ nó chép dòng nào", () => {
    moMan();
    // Bốn nút cùng tên "Sao chép" thì người dùng màn hình đọc không phân biệt được.
    expect(screen.getByRole("button", { name: /sao chép ngân hàng/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sao chép số tài khoản/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sao chép số tiền/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sao chép nội dung chuyển khoản/i })
    ).toBeInTheDocument();
  });
});

describe("<PaymentTransferDialog /> — khi có gì đó hỏng", () => {
  it("ảnh QR hỏng thì vẫn còn đủ thông tin để chuyển khoản tay", () => {
    moMan();

    fireEvent.error(screen.getByAltText("Mã QR chuyển khoản"));

    expect(screen.getByText(/không tải được ảnh mã qr/i)).toBeInTheDocument();
    // Điểm mấu chốt: mất ảnh KHÔNG được làm mất đường chuyển tiền.
    expect(screen.getByText("40104887")).toBeInTheDocument();
    expect(screen.getByText("SDDYFM83AS")).toBeInTheDocument();
  });

  it("không đọc ra ngân hàng/số tài khoản thì in nguyên câu hướng dẫn, không để trống", () => {
    moMan(
      intentStub({
        payment_link: {
          type: "bank_transfer_instruction",
          url: "https://vietqr.app/img",
          qr_code_url: "https://vietqr.app/img",
          instructions: "Chuyển khoản 199.000đ theo hướng dẫn của quản trị viên.",
        },
      })
    );

    expect(
      screen.getByText(/chuyển khoản 199\.000đ theo hướng dẫn của quản trị viên/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sao chép số tài khoản/i })).not.toBeInTheDocument();
  });

  it("trình duyệt không có clipboard thì không bày nút nào, thay vì bày nút bấm là nổ", () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    moMan();

    expect(screen.queryByRole("button", { name: /sao chép/i })).not.toBeInTheDocument();
    // Nhưng thông tin thì vẫn phải đọc được để chép tay.
    expect(screen.getByText("40104887")).toBeInTheDocument();
  });
});

describe("<PaymentTransferDialog /> — theo trạng thái đơn", () => {
  it("đang chờ thì nói rõ trang tự cập nhật, và vẫn cho bấm kiểm tra lại", () => {
    // Nút "Kiểm tra lại" không thừa: SePay KHÔNG có tự đối soát như MoMo, nên phải cho
    // người dùng một cái nút thay vì bắt ngồi nhìn.
    const { onRecheck } = moMan();

    expect(screen.getByText(/đang chờ ngân hàng xác nhận/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /kiểm tra lại/i }));
    expect(onRecheck).toHaveBeenCalled();
  });

  it("hiện đồng hồ đếm ngược dạng phút:giây", () => {
    moMan();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it("đơn hết hạn thì nói tiền không mất, kèm mã đơn, và GIẤU mã QR đi", () => {
    // Quét một mã đã chết là dẫn người ta chuyển tiền vào đơn không còn khớp được nữa.
    moMan(intentStub({ status: "expired" }));

    expect(screen.getByText(/đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByText(/không mất đi đâu/i)).toBeInTheDocument();
    expect(screen.getByText("SDDYFM83AS")).toBeInTheDocument();
    expect(screen.queryByAltText("Mã QR chuyển khoản")).not.toBeInTheDocument();
  });

  it("thành công thì báo đã kích hoạt ngay trong cửa sổ, không tự đóng đột ngột", () => {
    moMan(intentStub({ status: "succeeded", paid_at: "2026-01-01T00:05:00Z" }));

    expect(screen.getByText(/đã nhận được chuyển khoản/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /xong/i })).toBeInTheDocument();
    // Không còn gì để chờ nên không bày nút huỷ nữa.
    expect(screen.queryByRole("button", { name: /huỷ đơn này/i })).not.toBeInTheDocument();
  });

  it("bấm huỷ đơn thì báo ra ngoài để trang gọi backend", () => {
    const { onCancelOrder } = moMan();
    fireEvent.click(screen.getByRole("button", { name: /huỷ đơn này/i }));
    expect(onCancelOrder).toHaveBeenCalled();
  });
});
