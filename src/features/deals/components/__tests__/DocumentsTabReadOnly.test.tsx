import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "@/features/deals/components/DealDetailPage";
import type { DealAttachment } from "@/services/dealAttachmentsService";
import type { InvoiceResponse } from "@/services/invoicesService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Deal đã "Hoàn thành" thì tab Tài liệu chỉ để xem lại và tải về.
 *
 * Dự án đã đóng và tính tiền xong, nên mọi nút làm ĐỔI hoặc GỬI ĐI thứ gì đều ẩn: thêm/xoá file,
 * sửa/gửi/hủy hóa đơn, ghi nhận thanh toán, sửa/xoá báo giá, chấp nhận/từ chối, gửi hợp đồng và
 * ghi nhận khách đã ký. Gửi thêm thư cho khách về một khoản đã khép sổ chỉ gây rối.
 */

function invoice(over: Partial<InvoiceResponse>): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20261005-AAAA",
    status: "sent",
    subtotal: 3_000_000,
    total: 3_000_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: "2026-10-12",
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const file = {
  id: "att-1",
  deal_id: "d1",
  filename: "bien-nhan.pdf",
  content_type: "application/pdf",
  size_bytes: 97_000,
  ai_readable: true,
  created_at: "2026-10-05T06:00:00Z",
} as DealAttachment;

function renderTab(readOnly: boolean, over: { proposalStatus?: string; contractStatus?: string } = {}) {
  render(
    <DocumentsTab
      readOnly={readOnly}
      savedQualifications={[]}
      onViewQualification={vi.fn()}
      attachments={[file]}
      proposals={[
        {
          id: "p-1",
          status: over.proposalStatus ?? "sent",
          version_number: 1,
          created_at: "2026-10-02T08:00:00Z",
        },
      ]}
      contracts={[
        { id: "c-1", status: over.contractStatus ?? "pending_signatures", version_number: 1, created_at: "2026-10-03T08:00:00Z" },
      ]}
      invoices={[
        invoice({ id: "inv-sent", status: "sent" }),
        invoice({ id: "inv-draft", invoice_number: "INV-20261005-BBBB", status: "draft" }),
      ]}
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

describe("deal đã Hoàn thành: tab Tài liệu chỉ để xem", () => {
  it("ẩn nút thêm file và nút xoá file", () => {
    renderTab(true);

    expect(screen.queryByText("Thêm file")).toBeNull();
    expect(screen.queryByRole("button", { name: "Xoá file" })).toBeNull();
  });

  it("hóa đơn: ẩn gửi, ghi nhận thanh toán, hủy và nút sửa của bản nháp", () => {
    renderTab(true);

    expect(screen.queryByRole("button", { name: /Gửi hóa đơn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ghi nhận thanh toán/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hủy hóa đơn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sửa/ })).toBeNull();
  });

  it("hóa đơn đã gửi vẫn xem được", () => {
    renderTab(true);

    expect(screen.getByText("INV-20261005-AAAA")).toBeInTheDocument();
    const row = screen.getByText("INV-20261005-AAAA").closest("div.rounded-lg") as HTMLElement;
    expect(within(row).getByRole("button", { name: /Xem/ })).toBeInTheDocument();
  });

  it("báo giá đã gửi: ẩn 'Khách chấp nhận' và 'Từ chối', vẫn xem được", () => {
    renderTab(true, { proposalStatus: "sent" });

    expect(screen.queryByRole("button", { name: /Khách chấp nhận/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Từ chối/ })).toBeNull();
    const row = screen.getByText("Báo giá lần 1").closest("div.rounded-lg") as HTMLElement;
    expect(within(row).getByRole("button", { name: /Xem/ })).toBeInTheDocument();
  });

  it("báo giá nháp: ẩn cả cửa soạn lẫn nút xoá", () => {
    renderTab(true, { proposalStatus: "draft" });

    const row = screen.getByText("Báo giá lần 1").closest("div.rounded-lg") as HTMLElement;
    expect(within(row).queryByRole("button", { name: /Xem/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xoá báo giá" })).toBeNull();
  });

  it("hợp đồng: ẩn 'Gửi cho khách ký' và 'Ghi nhận: khách đã ký', vẫn xem được", () => {
    renderTab(true, { contractStatus: "pending_signatures" });
    expect(screen.queryByRole("button", { name: /Ghi nhận: khách đã ký/ })).toBeNull();
    const row = screen.getByText("Hợp đồng lần 1").closest("div.rounded-lg") as HTMLElement;
    expect(within(row).getByRole("button", { name: /Xem/ })).toBeInTheDocument();
  });

  it("hợp đồng nháp cũng không còn nút gửi", () => {
    renderTab(true, { contractStatus: "draft" });
    expect(screen.queryByRole("button", { name: /Gửi cho khách ký/ })).toBeNull();
  });

  it("file đính kèm vẫn tải về được", () => {
    renderTab(true);
    const row = screen.getByText("bien-nhan.pdf").closest("div.rounded-lg") as HTMLElement;
    expect(within(row).getByRole("button", { name: /Tải PDF/ })).toBeInTheDocument();
  });
});

describe("deal chưa hoàn thành: mọi nút vẫn như cũ", () => {
  it("còn nút thêm file, xoá file, gửi hóa đơn, ghi nhận thanh toán, hủy hóa đơn", () => {
    renderTab(false);

    expect(screen.getByText("Thêm file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xoá file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi hóa đơn/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ghi nhận thanh toán/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hủy hóa đơn/ })).toBeInTheDocument();
  });

  it("báo giá đã gửi còn 'Khách chấp nhận' / 'Từ chối'; hợp đồng chờ ký còn 'Ghi nhận: khách đã ký'", () => {
    renderTab(false);

    expect(screen.getByRole("button", { name: /Khách chấp nhận/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Từ chối/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ghi nhận: khách đã ký/ })).toBeInTheDocument();
  });
});
