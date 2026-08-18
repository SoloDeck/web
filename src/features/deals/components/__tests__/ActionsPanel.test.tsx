import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionsPanel } from "@/features/deals/components/DealDetailPage";
import type { Deal } from "@/features/deals/types";

/**
 * Cột hành động bên phải màn chi tiết deal — luật "MỘT việc tại một thời điểm".
 *
 * Trước đây ở giai đoạn Đang Đàm Phán, "Tạo Hợp Đồng AI" và "Bắt đầu triển khai" hiện cùng
 * lúc, cái sau bị khoá cho tới khi ghi nhận đã ký. Hai nút xếp chồng thì nút nào cũng trông
 * như việc phải làm, và cái đang khoá lại là cái nổi hơn về bố cục — bấm vào rồi tự hỏi vì
 * sao không ăn.
 */

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    clientId: "client-1",
    client: "Hỏa Quốc huynh",
    projectType: "Làm ứng dụng đặt lịch thăm khám",
    value: 156_000_000,
    score: "hot",
    stage: "in_negotiation",
    contact: "0352015349",
    channel: "Zalo",
    createdAt: "2026-08-17",
    notes: "",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
    ...overrides,
  };
}

function renderPanel(props: Partial<Parameters<typeof ActionsPanel>[0]> = {}) {
  render(
    <ActionsPanel
      deal={makeDeal()}
      onEvaluate={vi.fn()}
      onProposal={vi.fn()}
      onContract={vi.fn()}
      onStartProject={vi.fn()}
      onComplete={vi.fn()}
      contractLoading={false}
      stageTransitionLoading={false}
      hasAcceptedProposal
      hasContract
      hasDraftContract={false}
      hasActiveContract={false}
      {...props}
    />
  );
}

describe("ActionsPanel — giai đoạn Đang Đàm Phán", () => {
  it("chưa ghi nhận đã ký: chỉ mời tạo hợp đồng", () => {
    renderPanel({ hasActiveContract: false });

    expect(screen.getByRole("button", { name: /tạo hợp đồng ai/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bắt đầu triển khai/i })).toBeNull();
  });

  it("ghi nhận đã ký rồi: nút tạo hợp đồng được THAY bằng bắt đầu triển khai", () => {
    renderPanel({ hasActiveContract: true });

    expect(screen.getByRole("button", { name: /bắt đầu triển khai/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tạo hợp đồng ai/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /tạo lại hợp đồng ai/i })).toBeNull();
  });

  it("không bao giờ hiện cả hai cùng lúc", () => {
    for (const hasActiveContract of [false, true]) {
      const { unmount } = render(
        <ActionsPanel
          deal={makeDeal()}
          onEvaluate={vi.fn()}
          onProposal={vi.fn()}
          onContract={vi.fn()}
          onStartProject={vi.fn()}
          onComplete={vi.fn()}
          contractLoading={false}
          stageTransitionLoading={false}
          hasAcceptedProposal
          hasContract
          hasDraftContract={false}
          hasActiveContract={hasActiveContract}
        />
      );
      const nutTaoHopDong = screen.queryByRole("button", { name: /hợp đồng ai/i });
      const nutTrienKhai = screen.queryByRole("button", { name: /bắt đầu triển khai/i });
      expect(Boolean(nutTaoHopDong) && Boolean(nutTrienKhai)).toBe(false);
      unmount();
    }
  });

  it("ký rồi thì nút triển khai bấm được ngay, không còn khoá", () => {
    // Bản cũ để nút này `disabled` cho tới khi có hợp đồng hiệu lực. Giờ nó chỉ xuất hiện
    // đúng lúc đã đủ điều kiện, nên không có lý do gì để khoá nữa.
    renderPanel({ hasActiveContract: true });
    expect(screen.getByRole("button", { name: /bắt đầu triển khai/i })).toBeEnabled();
  });

  it("chưa có hợp đồng thì vẫn nói rõ bước kế tiếp", () => {
    renderPanel({ hasContract: false, hasActiveContract: false });
    expect(screen.getByText(/gửi cho khách ký trước khi mở project/i)).toBeInTheDocument();
  });

  it("hợp đồng đang chờ ký thì chỉ đường tới chỗ ghi nhận", () => {
    renderPanel({ hasContract: true, hasActiveContract: false });
    expect(screen.getByText(/Ghi nhận: khách đã ký/i)).toBeInTheDocument();
  });
});
