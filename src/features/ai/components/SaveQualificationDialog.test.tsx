import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveQualificationDialog } from "./SaveQualificationDialog";
import { saveWarningLevel } from "@/features/ai/qualificationUi";
import type { QualificationScoreGaps } from "@/services/dealsService";

/**
 * Mentor hỏi: "chưa đủ 100 điểm mà vẫn quyết định lưu thì có cảnh báo gì không?"
 *
 * Trước đây câu trả lời là không — bấm Lưu là đóng dấu thẳng, kể cả deal 12/100.  #Huynh
 */

function gapsFor(lostPoints: number, essential: string[] = []): QualificationScoreGaps {
  return {
    lost_points: lostPoints,
    points_to_hot: Math.max(0, lostPoints - 25),
    essential_missing: essential,
    gaps: [
      {
        key: "budget",
        label: "Ngân sách",
        points: 0,
        max_points: 25,
        ask: "Anh/chị dự trù bao nhiêu ạ?",
        lost_points: 25,
        current_state: "Khách chưa nhắc gì tới tiền.",
        steps: [{ points: 25, gain: 25, requirement: "Khách nêu CON SỐ ngân sách." }],
        fill_field: "client_budget",
      },
    ],
  };
}

describe("saveWarningLevel", () => {
  it("đủ 100 điểm thì không cảnh báo gì", () => {
    expect(saveWarningLevel(100, 0)).toBe("none");
  });

  it("từ 75 điểm trở lên chỉ nhắc nhẹ — ba mảng thiết yếu đã đủ", () => {
    expect(saveWarningLevel(75, 25)).toBe("soft");
    expect(saveWarningLevel(99, 1)).toBe("soft");
  });

  it("dưới 75 là cảnh báo nặng — thiếu ít nhất một mảng thiết yếu", () => {
    expect(saveWarningLevel(74, 26)).toBe("hard");
    expect(saveWarningLevel(27, 73)).toBe("hard");
  });
});

describe("<SaveQualificationDialog />", () => {
  it("dưới 75 điểm thì khoá nút chốt cho tới khi người dùng tích xác nhận", async () => {
    const onConfirm = vi.fn();
    render(
      <SaveQualificationDialog
        open
        onOpenChange={vi.fn()}
        score={27}
        gaps={gapsFor(73, ["budget"])}
        onConfirm={onConfirm}
      />
    );

    const confirm = screen.getByRole("button", { name: "Vẫn chốt" });
    expect(confirm).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("nêu đích danh mảng thiết yếu đang thiếu, không nói chung chung", () => {
    render(
      <SaveQualificationDialog
        open
        onOpenChange={vi.fn()}
        score={27}
        gaps={gapsFor(73, ["budget"])}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Bản đánh giá này mới 27/100 điểm")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có ngân sách/)).toBeInTheDocument();
  });

  it("từ 75 điểm thì chỉ nhắc nhẹ, chốt được ngay không cần tích gì", async () => {
    const onConfirm = vi.fn();
    render(
      <SaveQualificationDialog
        open
        onOpenChange={vi.fn()}
        score={85}
        gaps={gapsFor(15)}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Còn thiếu 15 điểm — vẫn chốt chứ?")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Vẫn chốt" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("liệt kê từng tiêu chí đang thiếu kèm số điểm mất", () => {
    render(
      <SaveQualificationDialog
        open
        onOpenChange={vi.fn()}
        score={27}
        gaps={gapsFor(73, ["budget"])}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Ngân sách")).toBeInTheDocument();
    expect(screen.getByText("−25đ")).toBeInTheDocument();
  });

  it("đang lưu thì khoá cả hai nút, tránh bấm chốt hai lần", () => {
    render(
      <SaveQualificationDialog
        open
        onOpenChange={vi.fn()}
        score={85}
        gaps={gapsFor(15)}
        isSaving
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Đang lưu..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quay lại" })).toBeDisabled();
  });
});
