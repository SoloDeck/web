import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClientFactsCard } from "./ClientFactsCard";
import type { ScoreItem } from "./QualificationResult";
import type { Deal } from "@/features/deals/types";

/**
 * Khung này sinh ra từ một câu phàn nàn cụ thể: bổ sung thông tin xong chỉ thấy điểm nhảy,
 * không thấy lại thứ mình vừa gõ — nhất là phần mô tả, vì ô đó luôn mở ra trống nên trông
 * như chưa lưu được gì.
 *
 * Bộ test khoá đúng ba thứ: có bày lại dữ kiện không, có chỉ ra cái nào VỪA thêm không, và
 * có im lặng về điểm khi điểm đang là của lần chấm trước không.  #Huynh
 */

const BREAKDOWN: ScoreItem[] = [
  { key: "scope", label: "Phạm vi công việc", points: 30, max_points: 30 },
  { key: "budget", label: "Ngân sách", points: 25, max_points: 25 },
  { key: "timeline", label: "Thời gian", points: 10, max_points: 20 },
];

function deal(overrides: Partial<Deal> = {}) {
  return {
    id: "d1",
    clientId: "c1",
    projectType: "Bộ nhận diện quán cà phê",
    notes: "Khách cần logo và menu.",
    clientBudget: "",
    desiredTimeline: "",
    ...overrides,
  } as unknown as Deal;
}

function renderCard(props: Partial<Parameters<typeof ClientFactsCard>[0]> = {}) {
  return render(
    <ClientFactsCard
      deal={deal()}
      justAdded={[]}
      justAddedNotes=""
      breakdown={BREAKDOWN}
      scoresAreStale={false}
      onEdit={vi.fn()}
      {...props}
    />
  );
}

describe("<ClientFactsCard />", () => {
  it("chưa có dữ kiện nào thì ẩn hẳn, không bày khung rỗng giữ chỗ", () => {
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it("bày lại đúng lời khách kèm điểm của tiêu chí tương ứng", () => {
    renderCard({
      deal: deal({ clientBudget: "100 triệu", desiredTimeline: "20/10/2026" }),
    });

    expect(screen.getByText("100 triệu")).toBeInTheDocument();
    expect(screen.getByText("20/10/2026")).toBeInTheDocument();
    // Điểm phải đi kèm dữ kiện, nếu không người dùng không nối được nhân với quả.
    expect(screen.getByText("Ngân sách 25/25")).toBeInTheDocument();
    expect(screen.getByText("Thời gian 10/20")).toBeInTheDocument();
  });

  it("chỉ ra ô nào VỪA thêm trong phiên này", () => {
    renderCard({
      deal: deal({ clientBudget: "100 triệu", desiredTimeline: "20/10/2026" }),
      justAdded: ["client_budget"],
    });

    // Chỉ ngân sách là mới; mốc thời gian đã có từ trước nên không được gắn nhãn.
    expect(screen.getAllByText("vừa thêm")).toHaveLength(1);
  });

  it("chưa chấm lại thì KHÔNG bày điểm cũ cạnh dữ liệu mới", () => {
    renderCard({
      deal: deal({ clientBudget: "100 triệu" }),
      justAdded: ["client_budget"],
      scoresAreStale: true,
    });

    // Con điểm bên bảng chưa tính phần vừa thêm — bày ra là nói dối bằng con số.
    expect(screen.getByText("chưa chấm lại")).toBeInTheDocument();
    expect(screen.queryByText("Ngân sách 25/25")).not.toBeInTheDocument();
  });

  it("in nguyên văn phần mô tả vừa viết thêm, không chỉ báo suông là đã lưu", () => {
    renderCard({
      justAdded: ["notes"],
      justAddedNotes: "Đăng nhập, giỏ hàng, chụp hình cho 1 buổi",
    });

    expect(
      screen.getByText("Đăng nhập, giỏ hàng, chụp hình cho 1 buổi")
    ).toBeInTheDocument();
  });

  it("không dùng chữ 'nối' — từ của người viết code, người dùng đọc thấy kỳ", () => {
    const { container } = renderCard({
      deal: deal({ clientBudget: "100 triệu" }),
      justAdded: ["notes"],
      justAddedNotes: "Thêm phần bàn giao file gốc",
    });

    expect(container.textContent).not.toMatch(/nối/i);
  });

  it("bảng chấm điểm thiếu tiêu chí thì bỏ qua nhãn điểm, không vỡ", () => {
    renderCard({
      deal: deal({ clientBudget: "100 triệu" }),
      breakdown: [],
    });

    expect(screen.getByText("100 triệu")).toBeInTheDocument();
    expect(screen.queryByText(/25\/25/)).not.toBeInTheDocument();
  });
});
