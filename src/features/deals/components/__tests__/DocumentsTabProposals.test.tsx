import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "@/features/deals/components/DealDetailPage";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/**
 * Hàng báo giá trong tab Tài liệu.
 *
 * Thứ tự nút phải GIỐNG hàng file phía trên: Xem · Tải PDF · (thùng rác chỉ có biểu tượng). Bản
 * nháp từng đảo ngược (Tải PDF đứng trước, nút mở soạn thảo tên "Mở & chỉnh sửa" đứng sau, "Xoá"
 * có chữ) nên mắt người dùng phải tìm nút ở chỗ khác nhau tuỳ hàng.
 */

function proposal(over: Partial<{ id: string; status: string }> = {}) {
  return {
    id: "p-1",
    status: "draft",
    version_number: 1,
    created_at: "2026-10-02T08:00:00Z",
    content: { title: "Báo giá abc" },
    ...over,
  };
}

function renderTab(
  proposals: Array<ReturnType<typeof proposal>>,
  handlers: {
    onViewProposal?: (id: string) => void;
    onEditProposal?: (id: string) => void;
    onDeleteProposal?: (id: string) => void;
  } = {}
) {
  render(
    <DocumentsTab
      savedQualifications={[]}
      onViewQualification={vi.fn()}
      attachments={[]}
      proposals={proposals}
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
      onViewProposal={handlers.onViewProposal ?? vi.fn()}
      onEditProposal={handlers.onEditProposal ?? vi.fn()}
      onDeleteProposal={handlers.onDeleteProposal ?? vi.fn()}
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

/** Tên các nút trong hàng, đúng thứ tự từ trái sang phải. */
function buttonNames(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("button")
    .map((button) => (button.getAttribute("aria-label") ?? button.textContent ?? "").trim());
}

describe("hàng báo giá trong tab Tài liệu", () => {
  it("bản nháp: Xem · Tải PDF · thùng rác (chỉ biểu tượng) — giống hàng file", () => {
    renderTab([proposal()]);

    const row = rowOf("Báo giá lần 1");
    expect(buttonNames(row)).toEqual(["Xem", "Tải PDF", "Xoá báo giá"]);

    // Nút xoá chỉ có biểu tượng — không chữ "Xoá" hiện ra, và nút mở soạn thảo không còn tên cũ.
    expect(within(row).queryByText("Xoá")).not.toBeInTheDocument();
    expect(within(row).queryByText(/Mở & chỉnh sửa/)).not.toBeInTheDocument();
  });

  it("bản nháp: 'Xem' mở modal SOẠN THẢO (không phải bản chỉ đọc)", async () => {
    const user = userEvent.setup();
    const onEditProposal = vi.fn();
    const onViewProposal = vi.fn();
    renderTab([proposal()], { onEditProposal, onViewProposal });

    await user.click(within(rowOf("Báo giá lần 1")).getByRole("button", { name: "Xem" }));

    expect(onEditProposal).toHaveBeenCalledWith("p-1");
    expect(onViewProposal).not.toHaveBeenCalled();
  });

  it("bản nháp: bấm thùng rác thì xoá đúng báo giá đó", async () => {
    const user = userEvent.setup();
    const onDeleteProposal = vi.fn();
    renderTab([proposal()], { onDeleteProposal });

    await user.click(within(rowOf("Báo giá lần 1")).getByRole("button", { name: "Xoá báo giá" }));

    expect(onDeleteProposal).toHaveBeenCalledWith("p-1");
  });

  it("bản đã gửi: 'Xem' mở bản chỉ đọc, vẫn đứng đầu hàng, và KHÔNG có thùng rác", async () => {
    const user = userEvent.setup();
    const onEditProposal = vi.fn();
    const onViewProposal = vi.fn();
    renderTab([proposal({ status: "sent" })], { onEditProposal, onViewProposal });

    const row = rowOf("Báo giá lần 1");
    expect(buttonNames(row)).toEqual(["Xem", "Tải PDF", "Khách chấp nhận", "Từ chối"]);

    await user.click(within(row).getByRole("button", { name: "Xem" }));
    expect(onViewProposal).toHaveBeenCalledWith("p-1");
    expect(onEditProposal).not.toHaveBeenCalled();
  });
});
