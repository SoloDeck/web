import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("chưa có hợp đồng thì chỉ còn nút 'Tạo Hợp Đồng AI' — không có dòng nhắc thừa bên dưới", () => {
    renderPanel({ hasContract: false, hasActiveContract: false });
    // Nút đã tự nói bước kế tiếp; dòng "Cần tạo hợp đồng và gửi cho khách ký trước khi mở project
    // triển khai." chỉ lặp lại điều đó nên đã bị bỏ.
    expect(screen.getByRole("button", { name: /tạo hợp đồng ai/i })).toBeInTheDocument();
    expect(screen.queryByText(/gửi cho khách ký trước khi mở project/i)).not.toBeInTheDocument();
  });

  it("hợp đồng đang chờ ký thì chỉ đường tới chỗ ghi nhận", () => {
    renderPanel({ hasContract: true, hasActiveContract: false });
    expect(screen.getByText(/Ghi nhận: khách đã ký/i)).toBeInTheDocument();
  });

  it("hợp đồng ĐÃ GỬI, đang chờ khách ký: nút tạo hợp đồng bị khoá — như báo giá đã gửi", async () => {
    // Báo giá đã gửi thì không còn nút AI; hợp đồng đã gửi mà vẫn bấm "Tạo Hợp Đồng AI" được là
    // mời freelancer đẻ hợp đồng thứ hai trong khi khách đang cầm bản đầu (backend cũng chặn: mỗi
    // deal chỉ một hợp đồng chờ ký / đang hiệu lực).
    const user = userEvent.setup();
    const onContract = vi.fn();
    renderPanel({ hasContract: true, hasPendingContract: true, onContract });

    const nut = screen.getByRole("button", { name: /tạo hợp đồng ai/i });
    expect(nut).toBeDisabled();
    expect(nut).toHaveAttribute("title", "Hợp đồng đã gửi, đang chờ khách ký");
    await user.click(nut);
    expect(onContract).not.toHaveBeenCalled();
    // Vẫn chỉ đường tới chỗ ghi nhận khách đã ký.
    expect(screen.getByText(/Ghi nhận: khách đã ký/i)).toBeInTheDocument();
  });

  it("bản nháp thì vẫn viết lại được — chỉ khoá khi hợp đồng đã gửi", async () => {
    const user = userEvent.setup();
    const onContract = vi.fn();
    renderPanel({ hasContract: true, hasDraftContract: true, hasPendingContract: false, onContract });

    const nut = screen.getByRole("button", { name: /tạo lại hợp đồng ai/i });
    expect(nut).toBeEnabled();
    await user.click(nut);
    expect(onContract).toHaveBeenCalledTimes(1);
  });
});
