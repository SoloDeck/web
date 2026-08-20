import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlanCheckoutDialog } from "@/features/subscriptions/components/PlanCheckoutDialog";
import type { PlanResponse } from "@/services/subscriptionsService";

/**
 * Hộp này là chỗ duy nhất người dùng chọn được cách trả tiền. Trước đây frontend hardcode
 * `"momo"` ở đúng một dòng trong service, nên hai cổng còn lại không ai chạm tới được dù
 * backend đã hỗ trợ từ lâu.
 */

function planStub(over: Partial<PlanResponse> = {}): PlanResponse {
  return {
    id: "plan-pro",
    name: "Pro",
    slug: "pro",
    price_monthly: "199000.00",
    currency: "VND",
    can_use_ai: true,
    can_export_pdf: true,
    max_clients: null,
    max_deals: null,
    max_ai_generations_per_month: 50,
    is_active: true,
    ...over,
  } as PlanResponse;
}

function moHop(props: Partial<React.ComponentProps<typeof PlanCheckoutDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const view = render(
    <PlanCheckoutDialog
      open
      onOpenChange={onOpenChange}
      plan={planStub()}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onConfirm, onOpenChange, view };
}

describe("<PlanCheckoutDialog /> — chọn cổng thanh toán", () => {
  it("bày đủ BA cổng, cổng nào cũng chọn được", () => {
    // Đây là câu chốt của cả tính năng.
    moHop();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    // `toBeDisabled()` KHÔNG dùng được ở đây: base-ui vẽ radio thành `<span role="radio">`
    // chứ không phải `<input>`, mà matcher đó chỉ hiểu phần tử form thật — nên nó luôn
    // qua, bất kể radio có bị khoá hay không. Phải xét `aria-disabled`.
    radios.forEach((radio) => expect(radio).not.toHaveAttribute("aria-disabled", "true"));

    expect(screen.getByText("Ví MoMo")).toBeInTheDocument();
    expect(screen.getByText("ZaloPay")).toBeInTheDocument();
    expect(screen.getByText("SePay")).toBeInTheDocument();
  });

  it("SePay có nhãn riêng để không bị nhầm là một cái ví nữa", () => {
    moHop();
    expect(screen.getByText(/chuyển khoản ngân hàng/i)).toBeInTheDocument();
  });

  it("mặc định là MoMo — cổng duy nhất backend có đường tự đối soát", () => {
    const { onConfirm } = moHop();

    fireEvent.click(screen.getByRole("button", { name: /tiến hành thanh toán/i }));

    expect(onConfirm).toHaveBeenCalledWith("momo");
  });

  it("chọn SePay rồi xác nhận thì báo về đúng sepay, không phải cổng mặc định", () => {
    const { onConfirm } = moHop();

    fireEvent.click(screen.getAllByRole("radio")[2]);
    fireEvent.click(screen.getByRole("button", { name: /tiến hành thanh toán/i }));

    expect(onConfirm).toHaveBeenCalledWith("sepay");
  });

  it("chọn ZaloPay thì báo về zalopay", () => {
    const { onConfirm } = moHop();

    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: /tiến hành thanh toán/i }));

    expect(onConfirm).toHaveBeenCalledWith("zalopay");
  });

  it("nói rõ TÊN GÓI và SỐ TIỀN — hai thứ quyết định câu trả lời", () => {
    moHop();

    expect(screen.getByText(/gói Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/199\.000/)).toBeInTheDocument();
  });

  it("đang tạo đơn thì khoá cả ba lựa chọn và không cho đóng hộp", () => {
    // Đóng giữa chừng thì đơn vẫn được tạo mà không ai đón kết quả.
    const { onOpenChange } = moHop({ isLoading: true });

    screen
      .getAllByRole("radio")
      .forEach((radio) => expect(radio).toHaveAttribute("aria-disabled", "true"));
    expect(screen.getByRole("button", { name: /đang tạo đơn/i })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("nhãn nút không hứa 'mở trang thanh toán' — SePay chẳng mở trang nào cả", () => {
    moHop();
    expect(screen.queryByText(/mở trang thanh toán/i)).not.toBeInTheDocument();
  });

  it("chưa chọn gói thì không vẽ gì, không nổ", () => {
    const { view } = moHop({ plan: null });
    expect(view.container).toBeEmptyDOMElement();
  });
});
