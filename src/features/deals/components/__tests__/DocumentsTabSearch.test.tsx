import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "@/features/deals/components/DealDetailPage";
import type { InvoiceResponse } from "@/services/invoicesService";
import type { DealAttachment } from "@/services/dealAttachmentsService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Tab "Tài liệu": thanh tìm kiếm, và hàng báo giá chỉ ghi ngày.
 *
 * Tab gom file, báo giá, hợp đồng, hóa đơn — vài đợt thu tiền là danh sách dài, tìm bằng mắt chậm.
 */

const hoaDon = {
  id: "inv-1",
  invoice_number: "INV-20261002-6C15",
  status: "draft",
  subtotal: 521_900_000,
  total: 521_900_000,
  amount_paid: 0,
  tax_rate: 0,
  due_date: "2099-10-16",
  notes: "Hóa đơn: Thanh toán đợt 1\n\nNội dung.",
  created_at: "2026-10-02T08:00:00Z",
} as InvoiceResponse;

const tepDinhKem = {
  id: "att-1",
  filename: "01-hot-100-website-thuong-mai-dien-tu.pdf",
  content_type: "application/pdf",
  size_bytes: 99_000,
  ai_readable: true,
  created_at: "2026-10-02T08:00:00Z",
} as DealAttachment;

function renderTab() {
  render(
    <DocumentsTab
      savedQualifications={[]}
      onViewQualification={vi.fn()}
      attachments={[tepDinhKem]}
      proposals={[
        {
          id: "p-1",
          status: "accepted",
          version_number: 1,
          created_at: "2026-10-02T08:00:00Z",
          content: { title: "Báo giá abc" },
        },
      ]}
      contracts={[{ id: "c-1", status: "active", version_number: 1, created_at: "2026-10-02T09:00:00Z" }]}
      invoices={[hoaDon]}
      onAddAttachment={vi.fn()}
      onDeleteAttachment={vi.fn()}
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
      pendingInvoiceId={null}
      clientName="Hoa Huynh"
      clientEmail="khach@example.com"
    />
  );
}

const oTim = () => screen.getByRole("textbox", { name: "Tìm tài liệu" });

describe("hàng báo giá", () => {
  it("dòng dưới tên chỉ ghi NGÀY — không lặp tên 'Báo giá abc'", () => {
    renderTab();

    const hang = screen.getByText("Báo giá lần 1").closest("div.rounded-lg") as HTMLElement;
    expect(within(hang).getByText("02/10/2026")).toBeInTheDocument();
    expect(within(hang).queryByText(/Báo giá abc/)).not.toBeInTheDocument();
  });
});

describe("hàng hóa đơn", () => {
  it("vẫn hiện tên + mã INV để dễ nhìn", () => {
    renderTab();

    expect(screen.getByText("Thanh toán đợt 1")).toBeInTheDocument();
    expect(screen.getByText("INV-20261002-6C15")).toBeInTheDocument();
  });
});

describe("thanh tìm kiếm trong tab Tài liệu", () => {
  it("có ô tìm khi đã có tài liệu", () => {
    renderTab();
    expect(oTim()).toBeInTheDocument();
  });

  it("không có tài liệu nào thì không bày ô tìm vô nghĩa", () => {
    render(
      <DocumentsTab
        savedQualifications={[]}
        onViewQualification={vi.fn()}
        attachments={[]}
        proposals={[]}
        contracts={[]}
        invoices={[]}
        onAddAttachment={vi.fn()}
        onDeleteAttachment={vi.fn()}
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
        pendingInvoiceId={null}
        clientName="Hoa Huynh"
      />
    );
    expect(screen.queryByRole("textbox", { name: "Tìm tài liệu" })).not.toBeInTheDocument();
    expect(screen.getByText("Chưa có tài liệu nào cho deal này.")).toBeInTheDocument();
  });

  it("gõ mã INV thì chỉ còn hóa đơn đó", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "inv-20261002");

    expect(screen.getByText("Thanh toán đợt 1")).toBeInTheDocument();
    expect(screen.queryByText("Báo giá lần 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Hợp đồng lần 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/01-hot-100-website/)).not.toBeInTheDocument();
  });

  it("gõ không dấu vẫn tìm ra báo giá và hợp đồng", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "bao gia");
    expect(screen.getByText("Báo giá lần 1")).toBeInTheDocument();
    expect(screen.queryByText("Hợp đồng lần 1")).not.toBeInTheDocument();

    await user.clear(oTim());
    await user.type(oTim(), "hop dong");
    expect(screen.getByText("Hợp đồng lần 1")).toBeInTheDocument();
    expect(screen.queryByText("Báo giá lần 1")).not.toBeInTheDocument();
  });

  it("tìm theo tên file đính kèm", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "thuong mai");

    expect(screen.getByText(/01-hot-100-website/)).toBeInTheDocument();
    expect(screen.queryByText("Thanh toán đợt 1")).not.toBeInTheDocument();
  });

  it("không khớp hàng nào thì nói rõ, kèm nút xoá tìm kiếm đưa mọi thứ trở lại", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "zzzz");
    expect(screen.getByText(/Không có tài liệu nào khớp "zzzz"/)).toBeInTheDocument();
    expect(screen.queryByText("Báo giá lần 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xoá tìm kiếm" }));

    expect(oTim()).toHaveValue("");
    expect(screen.getByText("Báo giá lần 1")).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng lần 1")).toBeInTheDocument();
    expect(screen.getByText("Thanh toán đợt 1")).toBeInTheDocument();
  });

  it("nút X trong ô tìm xoá nội dung và hiện lại mọi hàng", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "bao gia");
    expect(screen.getByText("1/4", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xoá nội dung ô tìm" }));

    expect(oTim()).toHaveValue("");
    expect(screen.getByText("Hợp đồng lần 1")).toBeInTheDocument();
  });

  it("Esc xoá ô tìm", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(oTim(), "bao gia{Escape}");

    expect(oTim()).toHaveValue("");
    expect(screen.getByText("Hợp đồng lần 1")).toBeInTheDocument();
  });
});
