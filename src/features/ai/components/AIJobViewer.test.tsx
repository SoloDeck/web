import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Panel AI mount ở tầng gốc và KHÔNG bị unmount khi đổi deal (thu nhỏ chỉ ngừng vẽ). Nó lại
 * giữ state cục bộ nói về deal đang mở — thông tin vừa bổ sung, cờ điểm đã cũ.
 *
 * Thiếu `key` theo deal thì React tái dùng đúng instance cũ, và mô tả vừa gõ cho deal A hiện
 * nguyên văn trên deal B: dữ liệu khách này nằm trên hồ sơ khách khác.  #Huynh
 */

const panelState = vi.hoisted(() => ({
  current: null as { kind: string; dealId: string; jobId: string | null; openedAt: number } | null,
}));

vi.mock("@/features/ai/hooks/useAIActivityStore", () => ({
  useAIActivityStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ panel: panelState.current, closePanel: vi.fn() }),
}));

vi.mock("@/features/deals/hooks/useDeals", () => ({
  // Deal luôn có sẵn (đúng như khi nó đã nằm trong cache TanStack Query) — đây chính là điều
  // kiện làm lộ lỗi: không có frame null nào để React kịp unmount panel.
  useDeal: (id: string | undefined) => ({ data: id ? { id, projectType: `Deal ${id}` } : undefined }),
}));

vi.mock("@/features/deals/components/ProposalModal", () => ({
  ProposalModal: () => <div>proposal</div>,
}));

// Thay AIPanel bằng bản giả có state cục bộ, mô phỏng đúng justAddedNotes trong bản thật.
vi.mock("@/features/ai/components/AIPanel", () => ({
  AIPanel: ({ deal }: { deal: { id: string } }) => {
    const [notes] = useState(`ghi-chu-rieng-cua-${deal.id}`);
    return (
      <div>
        <span data-testid="deal">{deal.id}</span>
        <span data-testid="notes">{notes}</span>
      </div>
    );
  },
}));

const { AIJobViewer } = await import("./AIJobViewer");

describe("<AIJobViewer />", () => {
  beforeEach(() => {
    panelState.current = null;
  });

  it("đổi deal thì dựng lại panel, không mang state của deal trước sang", () => {
    panelState.current = { kind: "deal_qualification", dealId: "A", jobId: null, openedAt: 1 };
    const { rerender } = render(<AIJobViewer />);
    expect(screen.getByTestId("notes")).toHaveTextContent("ghi-chu-rieng-cua-A");

    // Người dùng thu nhỏ panel của deal A rồi mở job của deal B.
    panelState.current = { kind: "deal_qualification", dealId: "B", jobId: "j2", openedAt: 2 };
    rerender(<AIJobViewer />);

    expect(screen.getByTestId("deal")).toHaveTextContent("B");
    // Nếu thiếu key, chỗ này vẫn là "ghi-chu-rieng-cua-A" — chữ của khách A trên hồ sơ khách B.
    expect(screen.getByTestId("notes")).toHaveTextContent("ghi-chu-rieng-cua-B");
  });

  it("mở lại cùng một deal thì KHÔNG dựng lại, giữ nguyên phiên đang làm dở", () => {
    panelState.current = { kind: "deal_qualification", dealId: "A", jobId: null, openedAt: 1 };
    const { rerender } = render(<AIJobViewer />);

    // Cùng deal, chỉ là một lần bấm "Xem" mới -> openNonce đổi.
    panelState.current = { kind: "deal_qualification", dealId: "A", jobId: "j9", openedAt: 99 };
    rerender(<AIJobViewer />);

    expect(screen.getByTestId("notes")).toHaveTextContent("ghi-chu-rieng-cua-A");
  });

  it("chưa có panel nào thì không vẽ gì", () => {
    const { container } = render(<AIJobViewer />);
    expect(container).toBeEmptyDOMElement();
  });
});
