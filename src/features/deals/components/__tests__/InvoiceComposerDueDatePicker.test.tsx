import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceComposerModal } from "@/features/deals/components/DealDetailPage";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/**
 * Ô "Hạn thanh toán" của cửa sổ soạn hóa đơn trước đây chỉ gõ tay (dd/mm/yyyy), không có lịch để
 * bấm chọn. Nay có biểu tượng lịch ngay trong ô. Hôm nay được cố định là 04/10/2026 để lịch hiện
 * đúng tháng và các ngày "đã qua" mờ đi một cách đoán trước được.
 */

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 4, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20261004-3AF1",
    status: "draft",
    subtotal: 24_150_000,
    total: 24_150_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: "2026-10-17",
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const deal = { id: "d1", projectType: "a", value: 24_150_000 } as Deal;

function renderModal(over: { mode?: "edit" | "view"; opened?: InvoiceResponse } = {}) {
  const opened = over.opened ?? invoice();
  const onSaveAndSend = vi.fn();
  render(
    <InvoiceComposerModal
      mode={over.mode ?? "edit"}
      deal={deal}
      suggestedInvoiceIndex={2}
      existingInvoices={[opened]}
      client={{ name: "Hỏa Quốc huynh", email: "hoaquochuynh349@gmail.com", phone: "0352015349" }}
      invoice={opened}
      isLoading={false}
      onClose={vi.fn()}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onSaveAndSend={onSaveAndSend as never}
      onDelete={vi.fn()}
    />
  );
  return { onSaveAndSend };
}

const nutLich = () => screen.getByRole("button", { name: "Mở lịch chọn hạn thanh toán" });
const lich = () => screen.getByRole("dialog", { name: "Lịch chọn ngày" });
const oHan = () => screen.getByPlaceholderText("dd/mm/yyyy");
const ngay = (so: string) => within(lich()).getByText(so, { selector: "button" });

describe("cửa sổ soạn hóa đơn: chọn hạn thanh toán trên lịch", () => {
  it("ô Hạn thanh toán có biểu tượng lịch và vẫn gõ tay được như cũ", () => {
    renderModal();

    expect(oHan()).toHaveValue("17/10/2026");
    expect(nutLich()).toBeInTheDocument();
    expect(screen.getByLabelText("Hạn thanh toán")).toBe(oHan());
  });

  it("bấm biểu tượng lịch thì lịch mở đúng ngày hạn đang có", async () => {
    renderModal();

    await userEvent.click(nutLich());

    expect(within(lich()).getByRole("gridcell", { selected: true })).toHaveTextContent("17");
  });

  it("bấm một ngày thì ô hiện đúng dd/mm/yyyy và lịch đóng lại", async () => {
    renderModal();
    await userEvent.click(nutLich());

    await userEvent.click(ngay("25"));

    expect(oHan()).toHaveValue("25/10/2026");
    expect(screen.queryByRole("dialog", { name: "Lịch chọn ngày" })).toBeNull();
  });

  it("ngày chọn trên lịch đi vào hóa đơn gửi đi (due_date đúng ngày đã bấm)", async () => {
    const { onSaveAndSend } = renderModal();
    await userEvent.click(nutLich());
    await userEvent.click(ngay("25"));

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Lưu & gửi" })
    );

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
    expect(onSaveAndSend.mock.calls[0][1].due_date).toBe("2026-10-25");
  });

  it("ngày đã qua bị mờ, bấm không chọn được; hôm nay thì chọn được", async () => {
    renderModal();
    await userEvent.click(nutLich());

    expect(ngay("3")).toBeDisabled();
    expect(ngay("4")).toBeEnabled();
    await userEvent.click(ngay("3"));

    expect(oHan()).toHaveValue("17/10/2026");
    expect(lich()).toBeInTheDocument();
  });

  it("gõ tay một ngày ở tháng khác rồi mở lịch thì lịch mở đúng tháng đó", async () => {
    renderModal();
    fireEvent.change(oHan(), { target: { value: "25/12/2026" } });

    await userEvent.click(nutLich());

    expect(within(lich()).getByRole("gridcell", { selected: true })).toHaveTextContent("25");
    expect(lich()).toHaveTextContent(/12/);
  });

  it("gõ dở dang (chưa thành ngày) rồi mở lịch thì lịch vẫn mở được, không văng", async () => {
    renderModal();
    fireEvent.change(oHan(), { target: { value: "25/1" } });

    await userEvent.click(nutLich());

    expect(lich()).toBeInTheDocument();
  });

  it("hóa đơn đã gửi (chỉ xem) thì khóa cả ô lẫn nút lịch", () => {
    renderModal({ mode: "view", opened: invoice({ status: "sent" }) });

    expect(oHan()).toBeDisabled();
    expect(nutLich()).toBeDisabled();
  });
});
