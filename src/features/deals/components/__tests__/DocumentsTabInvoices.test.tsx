import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "@/features/deals/components/DealDetailPage";
import type { InvoiceResponse } from "@/services/invoicesService";
import type { DealAttachment } from "@/services/dealAttachmentsService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Hàng hóa đơn trong tab Tài liệu.
 *
 * Hai chuyện người dùng nêu cùng lúc:
 *   1. Hóa đơn thu đủ đeo HAI nhãn xanh nói y hệt một điều ("Đã thanh toán" + "Đã thanh toán
 *      đủ"), cộng thêm dòng "Tổng X · Đã thu X" — một tin nhắc ba lần trên một hàng.
 *   2. Không thấy MÃ hóa đơn ở đâu, nên muốn tra lại trong hộp thư đã gửi thì phải mở từng
 *      cái ra dò.
 */

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20260817-649C",
    status: "paid",
    subtotal: 37_199_000,
    total: 37_199_000,
    amount_paid: 37_199_000,
    tax_rate: 0,
    due_date: "2026-08-31",
    notes: null,
    ...over,
  } as InvoiceResponse;
}

function renderTab(invoices: InvoiceResponse[], over: Partial<{
  attachments: DealAttachment[];
  onDeleteAttachment: (attachment: DealAttachment) => void;
}> = {}) {
  render(
    <DocumentsTab
      savedQualifications={[]}
      onViewQualification={vi.fn()}
      attachments={over.attachments ?? []}
      proposals={[]}
      contracts={[]}
      invoices={invoices}
      onAddAttachment={vi.fn()}
      onDeleteAttachment={over.onDeleteAttachment ?? vi.fn()}
      onViewAttachment={vi.fn()}
      onViewInvoice={vi.fn()}
      onVoidInvoice={vi.fn()}
      onSendInvoice={vi.fn()}
      onRecordInvoicePayment={vi.fn()}
      onProposalDecision={vi.fn()}
      proposalDecisionLoading={false}
      onViewProposal={vi.fn()}
      onEditProposal={vi.fn()}
      onDeleteProposal={vi.fn()}
      onSendContract={vi.fn()}
      onSignContract={vi.fn()}
      onViewContract={vi.fn()}
      contractActionLoading={false}
      invoiceActionLoading={false}
    />
  );
}

function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest("div.rounded-lg") as HTMLElement;
}

describe("hàng hóa đơn trong tab Tài liệu", () => {
  it("thu đủ thì chỉ ĐÚNG MỘT nhãn, không phải hai nhãn xanh cạnh nhau", () => {
    renderTab([invoice()]);
    const row = rowOf("Thanh toán đợt 1");
    expect(within(row).getAllByText(/đã thanh toán/i)).toHaveLength(1);
    expect(within(row).queryByText(/đã thanh toán đủ/i)).toBeNull();
  });

  it("hiện MÃ hóa đơn để tra lại được", () => {
    renderTab([invoice()]);
    expect(screen.getByText("INV-20260817-649C")).toBeInTheDocument();
  });

  it("thu đủ rồi thì thôi lặp lại con số — chỉ còn tổng", () => {
    renderTab([invoice()]);
    const row = rowOf("Thanh toán đợt 1");
    expect(within(row).queryByText(/đã thu/i)).toBeNull();
    expect(within(row).getByText(/Tổng 37\.199\.000/)).toBeInTheDocument();
  });

  it("thu DỞ DANG thì nói rõ còn bao nhiêu", () => {
    renderTab([invoice({ status: "partially_paid", amount_paid: 10_000_000 })]);
    const row = rowOf("Thanh toán đợt 1");
    expect(within(row).getByText(/còn 27\.199\.000/)).toBeInTheDocument();
  });

  it("chưa thu đồng nào thì không in 'đã thu 0 đ' — nhãn trạng thái đã nói rồi", () => {
    renderTab([invoice({ status: "sent", amount_paid: 0 })]);
    const row = rowOf("Thanh toán đợt 1");
    expect(within(row).queryByText(/còn /i)).toBeNull();
    expect(within(row).getByText("Đã gửi")).toBeInTheDocument();
  });

  it("nhiều hóa đơn thì mỗi hàng mang mã của riêng nó", () => {
    renderTab([
      invoice({ id: "inv-1", invoice_number: "INV-A" }),
      invoice({ id: "inv-2", invoice_number: "INV-B" }),
    ]);
    expect(within(rowOf("Thanh toán đợt 1")).getByText("INV-A")).toBeInTheDocument();
    expect(within(rowOf("Thanh toán đợt 2")).getByText("INV-B")).toBeInTheDocument();
  });
});


describe("xoá file đính kèm", () => {
  const file: DealAttachment = {
    id: "att-1",
    deal_id: "d1",
    filename: "02-hot-app-dat-lich-phong-kham.pdf",
    content_type: "application/pdf",
    size_bytes: 97_000,
    ai_readable: true,
    created_at: "2026-08-17T06:00:00Z",
  } as DealAttachment;

  it("bấm thùng rác KHÔNG xoá ngay — chỉ báo lên để trang hỏi lại", () => {
    // Nút thùng rác nằm ngay cạnh "Tải PDF", cùng cỡ, cùng hàng. Trượt tay một ô là file
    // biến mất, mà file này thường do KHÁCH gửi nên không tự dựng lại được.
    const onDeleteAttachment = vi.fn();
    renderTab([], { attachments: [file], onDeleteAttachment });

    fireEvent.click(screen.getByLabelText("Xoá file"));
    expect(onDeleteAttachment).toHaveBeenCalledTimes(1);
  });

  it("báo lên CẢ file chứ không chỉ mã, để hộp thoại gọi đúng tên", () => {
    // Hỏi "Xoá file này?" mà không nói tên file thì người dùng vẫn phải đoán mình đang xoá
    // cái nào — hỏi cho có, không giúp được gì.
    const onDeleteAttachment = vi.fn();
    renderTab([], { attachments: [file], onDeleteAttachment });

    fireEvent.click(screen.getByLabelText("Xoá file"));
    expect(onDeleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "att-1", filename: file.filename })
    );
  });
});
