import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FillGapsDialog } from "./FillGapsDialog";
import { fieldsToFill } from "@/features/ai/gapFillFields";
import type { Deal } from "@/features/deals/types";
import type { QualificationGap, QualificationScoreGaps } from "@/services/dealsService";

function gap(key: string, label: string, fillField: string | null): QualificationGap {
  return {
    key,
    label,
    points: 0,
    max_points: 25,
    ask: `Hỏi khách về ${label}?`,
    lost_points: 25,
    current_state: "Khách chưa nhắc tới.",
    steps: [{ points: 25, gain: 25, requirement: "Khách nêu rõ." }],
    fill_field: fillField,
  };
}

function gaps(items: QualificationGap[]): QualificationScoreGaps {
  return {
    lost_points: items.reduce((sum, item) => sum + item.lost_points, 0),
    points_to_hot: 48,
    essential_missing: items.map((item) => item.key),
    gaps: items,
  };
}

const DEAL = {
  id: "d1",
  clientId: "c1",
  projectType: "Website bán vợt cầu lông",
  notes: "Khách cần một trang bán hàng.",
  desiredTimeline: "",
  clientBudget: "",
} as unknown as Deal;

describe("fieldsToFill", () => {
  it("chỉ hỏi đúng những ô vá được chỗ đang thiếu", () => {
    expect(
      fieldsToFill(gaps([gap("budget", "Ngân sách", "client_budget")]))
    ).toEqual(["client_budget"]);
  });

  it("nhiều tiêu chí cùng đổ về `notes` thì chỉ hiện một ô", () => {
    const fields = fieldsToFill(
      gaps([
        gap("scope", "Phạm vi công việc", "notes"),
        gap("detail", "Mức độ chi tiết", "notes"),
        gap("context", "Bối cảnh & kênh", "notes"),
      ])
    );

    expect(fields).toEqual(["notes"]);
  });

  it("giữ thứ tự cố định để form không nhảy chỗ giữa hai lần chấm", () => {
    const fields = fieldsToFill(
      gaps([
        gap("scope", "Phạm vi công việc", "notes"),
        gap("timeline", "Thời gian", "desired_timeline"),
        gap("budget", "Ngân sách", "client_budget"),
      ])
    );

    expect(fields).toEqual(["client_budget", "desired_timeline", "notes"]);
  });

  it("tiêu chí không có ô nào vá được thì bỏ qua", () => {
    expect(fieldsToFill(gaps([gap("source", "Nguồn deal", null)]))).toEqual([]);
  });
});

describe("<FillGapsDialog />", () => {
  it("chỉ bày ô đang thiếu, không bắt người dùng tự dò", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([gap("budget", "Ngân sách", "client_budget")])}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Ngân sách khách nêu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mốc thời gian khách nêu")).not.toBeInTheDocument();
  });

  it("nói rõ ô ngân sách là ghi lời KHÁCH, không phải giá mình định chào", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([gap("budget", "Ngân sách", "client_budget")])}
        onSubmit={vi.fn()}
      />
    );

    // Đây là ranh giới cả bộ chấm điểm dựa vào: `estimated_value` (freelancer tự ước) bị cấm
    // chấm, `client_budget` (lời khách) thì được. Nhãn mà mập mờ là người dùng điền nhầm ô.
    expect(screen.getByText(/Ghi lại con số KHÁCH nói, không phải giá bạn định chào/)).toBeInTheDocument();
  });

  it("chưa điền gì thì không cho gửi — tránh chấm lại tốn lượt AI mà dữ liệu y cũ", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([gap("budget", "Ngân sách", "client_budget")])}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Lưu thông tin" })).toBeDisabled();
  });

  it("gửi đi chữ đã gõ, và phần mô tả là NỐI THÊM chứ không thay thế", async () => {
    const onSubmit = vi.fn();
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([
          gap("budget", "Ngân sách", "client_budget"),
          gap("scope", "Phạm vi công việc", "notes"),
        ])}
        onSubmit={onSubmit}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Ngân sách khách nêu"), "120 triệu");
    await user.type(screen.getByLabelText("Bổ sung nội dung yêu cầu"), "5 hạng mục");
    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    expect(onSubmit).toHaveBeenCalledWith({
      client_budget: "120 triệu",
      notes_append: "5 hạng mục",
    });
  });

  it("ô để trống thì không gửi lên, tránh ghi đè dữ liệu cũ bằng chuỗi rỗng", async () => {
    const onSubmit = vi.fn();
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([
          gap("budget", "Ngân sách", "client_budget"),
          gap("timeline", "Thời gian", "desired_timeline"),
        ])}
        onSubmit={onSubmit}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Mốc thời gian khách nêu"), "trước 30/09/2026");
    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    expect(onSubmit).toHaveBeenCalledWith({ desired_timeline: "trước 30/09/2026" });
  });

  it("mỗi ô ghi rõ điền vào thì lấy lại được bao nhiêu điểm", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([
          gap("budget", "Ngân sách", "client_budget"),
          gap("timeline", "Thời gian", "desired_timeline"),
        ])}
        onSubmit={vi.fn()}
      />
    );

    // Người dùng cần biết nên đi hỏi khách cái gì trước cho bõ công.
    expect(screen.getAllByText("+25đ")).toHaveLength(2);
  });

  it("một ô vá nhiều tiêu chí thì CỘNG DỒN điểm, không hiện lẻ từng con", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([
          // Phần mô tả ăn vào cả ba tiêu chí này — viết kỹ một lần gỡ được cả ba.
          gap("scope", "Phạm vi công việc", "notes"),
          gap("detail", "Mức độ chi tiết", "notes"),
          gap("context", "Bối cảnh", "notes"),
        ])}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("+75đ")).toBeInTheDocument();
    expect(screen.queryByText("+25đ")).not.toBeInTheDocument();
  });

  it("phần mô tả đang có được bày ra để biết chữ mình gõ lần trước nằm đâu", () => {
    render(
      <FillGapsDialog
        open
        onOpenChange={vi.fn()}
        deal={DEAL}
        gaps={gaps([gap("scope", "Phạm vi công việc", "notes")])}
        onSubmit={vi.fn()}
      />
    );

    // Ô nhập luôn mở ra TRỐNG (nó là ô viết thêm), nên mô tả cũ phải hiện ở chỗ khác —
    // không thì người dùng tưởng lần bổ sung trước không lưu được.
    expect(screen.getByText("Khách cần một trang bán hàng.")).toBeInTheDocument();
  });
});
