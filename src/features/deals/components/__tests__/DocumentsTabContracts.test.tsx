import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "@/features/deals/components/DealDetailPage";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Hàng hợp đồng trong tab Tài liệu — nhãn trạng thái.
 *
 * Hợp đồng đã gửi cho khách và đang đợi khách ký (`pending_signatures`) từng hiện "Chờ ký". Báo giá
 * ở cùng trạng thái hiện "Đã gửi khách", nên hai loại giấy tờ kể cùng một việc bằng hai kiểu khác
 * nhau; nay hợp đồng ghi "Đã gửi".
 */

function renderTab(contractStatus: string) {
  render(
    <DocumentsTab
      savedQualifications={[]}
      onViewQualification={vi.fn()}
      attachments={[]}
      proposals={[]}
      contracts={[
        { id: "c-1", status: contractStatus, version_number: 1, created_at: "2026-10-02T08:00:00Z" },
      ]}
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
      clientEmail="khach@example.com"
    />
  );
}

function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest("div.rounded-lg") as HTMLElement;
}

describe("hàng hợp đồng trong tab Tài liệu", () => {
  it("đã gửi, đang đợi khách ký: nhãn là 'Đã gửi' (không còn 'Chờ ký')", () => {
    renderTab("pending_signatures");

    const row = rowOf("Hợp đồng lần 1");
    expect(within(row).getByText("Đã gửi")).toBeInTheDocument();
    expect(within(row).queryByText("Chờ ký")).not.toBeInTheDocument();
    // Việc kế tiếp vẫn là ghi nhận khách đã ký.
    expect(within(row).getByRole("button", { name: /Ghi nhận: khách đã ký/ })).toBeInTheDocument();
  });

  it("bản nháp vẫn là 'Bản nháp' và có nút gửi cho khách ký", () => {
    renderTab("draft");

    const row = rowOf("Hợp đồng lần 1");
    expect(within(row).getByText("Bản nháp")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Gửi cho khách ký/ })).toBeInTheDocument();
  });
});
