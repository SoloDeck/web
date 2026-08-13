import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  QualificationResultView,
  type QualificationView,
} from "./QualificationResult";
import type { QualificationScoreGaps } from "@/services/dealsService";

/**
 * Mentor chê đúng chỗ này: màn hình cũ giải thích được "vì sao ĐƯỢC 27 điểm" nhưng không
 * nói được "vì sao KHÔNG được 73 điểm còn lại, và làm sao lên 100".
 *
 * Bộ test này khoá đúng ba thứ đó lại.  #Huynh
 */

const GAPS_27: QualificationScoreGaps = {
  lost_points: 73,
  points_to_hot: 48,
  essential_missing: ["budget", "scope", "timeline"],
  gaps: [
    {
      key: "budget",
      label: "Ngân sách",
      points: 0,
      max_points: 25,
      ask: "Anh/chị dự trù ngân sách khoảng bao nhiêu cho dự án này ạ?",
      lost_points: 25,
      current_state: "Khách chưa nhắc gì tới tiền.",
      steps: [
        { points: 15, gain: 15, requirement: "Khách nói ước lượng về tiền." },
        { points: 25, gain: 25, requirement: "Khách nêu CON SỐ ngân sách." },
      ],
      fill_field: "client_budget",
    },
    {
      key: "scope",
      label: "Phạm vi công việc",
      points: 12,
      max_points: 30,
      ask: "Anh/chị cần làm cụ thể những hạng mục nào ạ?",
      lost_points: 18,
      current_state: "Chỉ có tên dự án, chưa có hạng mục nào.",
      steps: [
        { points: 20, gain: 8, requirement: "Khách cho biết loại việc kèm vài hạng mục." },
        { points: 30, gain: 18, requirement: "Khách liệt kê đủ hạng mục và sản phẩm bàn giao." },
      ],
      fill_field: "notes",
    },
    {
      key: "context",
      label: "Bối cảnh & kênh",
      points: 5,
      max_points: 10,
      ask: "Bên anh/chị hoạt động trong ngành nào ạ?",
      lost_points: 5,
      current_state: "Chỉ biết một phần bối cảnh khách hàng.",
      steps: [{ points: 10, gain: 5, requirement: "Khách cho biết ngành nghề và quy mô." }],
      fill_field: "notes",
    },
  ],
};

function makeView(overrides: Partial<QualificationView> = {}): QualificationView {
  return {
    level: "cold",
    score: 27,
    label: "COLD",
    rationale: "Yêu cầu còn quá sơ sài để báo giá.",
    recommendation: "Bạn nên hỏi khách về ngân sách trước.",
    signals: ["Khách chưa nêu ngân sách"],
    breakdown: [
      {
        key: "scope",
        label: "Phạm vi công việc",
        points: 12,
        max_points: 30,
        reason: "Chỉ có tên dự án.",
        evidence: "Website bán vợt cầu lông",
      },
      {
        key: "budget",
        label: "Ngân sách",
        points: 0,
        max_points: 25,
        reason: "Khách chưa nhắc tới tiền.",
        evidence: null,
      },
    ],
    gaps: GAPS_27,
    redFlags: [],
    ...overrides,
  };
}

/** Cột trái (thẻ điểm + tóm tắt phần thiếu + nút hành động) — `<aside>` = role complementary. */
const rail = () => within(screen.getByRole("complementary"));

describe("<QualificationResultView /> — phần mất điểm", () => {
  it("cột trái nói rõ tổng số điểm còn thiếu, không chỉ điểm đạt được", () => {
    render(<QualificationResultView view={makeView()} />);

    expect(rail().getByText("Còn thiếu")).toBeInTheDocument();
    expect(rail().getByText("73 điểm")).toBeInTheDocument();
  });

  it("mỗi tiêu chí nêu mất bao nhiêu điểm và cần gì để lên từng nấc", () => {
    render(<QualificationResultView view={makeView()} />);

    expect(screen.getByText("Khách chưa nhắc gì tới tiền.")).toBeInTheDocument();
    expect(screen.getByText(/Lên 15đ \(\+15\)/)).toBeInTheDocument();
    expect(screen.getByText(/Lên 25đ \(\+25\)/)).toBeInTheDocument();
  });

  it("cột trái xếp tiêu chí mất nhiều điểm nhất lên trước", () => {
    render(<QualificationResultView view={makeView()} />);

    const losses = rail()
      .getAllByText(/^−\d+đ$/)
      .map((node) => node.textContent);
    expect(losses).toEqual(["−25đ", "−18đ", "−5đ"]);
  });

  it("đánh dấu tiêu chí thiết yếu — còn cái nào thì chưa thể HOT", () => {
    render(<QualificationResultView view={makeView()} />);

    // budget và scope là thiết yếu, context thì không.
    expect(screen.getAllByText("thiết yếu")).toHaveLength(2);
  });

  it("kèm câu hỏi gửi thẳng cho khách", () => {
    render(<QualificationResultView view={makeView()} />);

    expect(
      screen.getByText("Anh/chị dự trù ngân sách khoảng bao nhiêu cho dự án này ạ?")
    ).toBeInTheDocument();
  });

  it("đủ 100 điểm thì cột trái không còn khối thiếu điểm", () => {
    const full = makeView({
      score: 100,
      level: "hot",
      label: "HOT",
      gaps: { lost_points: 0, points_to_hot: 0, essential_missing: [], gaps: [] },
    });
    render(<QualificationResultView view={full} />);

    expect(screen.queryByText("Còn thiếu")).not.toBeInTheDocument();
    expect(screen.queryByText(/còn thiếu/)).not.toBeInTheDocument();
    expect(screen.queryByText("Mất điểm vì")).not.toBeInTheDocument();
  });

  it("bản đánh giá cũ không có dữ liệu thiếu điểm thì vẫn hiện được, không vỡ", () => {
    render(<QualificationResultView view={makeView({ gaps: null })} />);

    expect(screen.queryByText("Còn thiếu")).not.toBeInTheDocument();
    expect(screen.getByText(/Bảng chấm điểm/)).toBeInTheDocument();
  });

  it("nút bổ sung thông tin chỉ hiện khi có chỗ để mở form", async () => {
    const onFillGaps = vi.fn();
    const { rerender } = render(<QualificationResultView view={makeView()} />);
    expect(screen.queryByRole("button", { name: "Bổ sung thông tin" })).not.toBeInTheDocument();

    rerender(<QualificationResultView view={makeView()} onFillGaps={onFillGaps} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Bổ sung thông tin" }));

    expect(onFillGaps).toHaveBeenCalledTimes(1);
  });
});

/**
 * Đây là tính chất quan trọng nhất của bố cục mới, và cũng là lý do phải làm lại: hai vế
 * "được điểm vì" và "mất điểm vì" của CÙNG một tiêu chí phải nằm trong CÙNG một dòng.
 *
 * Bản trước tách thành hai khối cách nhau cả màn hình, nên muốn đối chiếu là phải cuộn lên
 * cuộn xuống — đúng thứ người dùng phàn nàn.
 */
describe("<QualificationResultView /> — hai vế cùng một dòng", () => {
  /** Tên tiêu chí xuất hiện ở CẢ cột trái (tóm tắt) lẫn cột phải — phải khoanh đúng bảng. */
  function criterionRow(label: string): HTMLElement {
    const card = screen.getByText(/Bảng chấm điểm/).closest("div.rounded-xl");
    if (!card) throw new Error("không tìm thấy thẻ Bảng chấm điểm");

    const heading = within(card as HTMLElement).getByText(label);
    const row = heading.closest("div.rounded-lg");
    if (!row) throw new Error(`không tìm thấy dòng tiêu chí "${label}"`);
    return row as HTMLElement;
  }

  it("dòng thiếu điểm chứa CẢ dữ kiện đã ăn điểm LẪN cách lên điểm", () => {
    render(<QualificationResultView view={makeView()} />);
    const row = within(criterionRow("Phạm vi công việc"));

    expect(row.getByText("Được điểm vì")).toBeInTheDocument();
    expect(row.getByText("Mất điểm vì")).toBeInTheDocument();
    expect(row.getByText("Website bán vợt cầu lông")).toBeInTheDocument();
    expect(row.getByText("Chỉ có tên dự án, chưa có hạng mục nào.")).toBeInTheDocument();
    expect(row.getByText(/Lên 30đ \(\+18\)/)).toBeInTheDocument();
  });

  it("thang nấc hiện sẵn, không phải bấm mở mới thấy", () => {
    render(<QualificationResultView view={makeView()} />);

    // Không có thao tác click nào ở trên — nội dung phải có mặt ngay.
    // Chữ đầu viết thường vì được ghép sau chữ "nếu" (xem `lowerFirst`).
    expect(
      screen.getByText(/nếu khách liệt kê đủ hạng mục và sản phẩm bàn giao/)
    ).toBeInTheDocument();
  });

  it("tiêu chí đã đạt trần thì báo đủ điểm và không có vế mất điểm", () => {
    const view = makeView({
      breakdown: [
        {
          key: "budget",
          label: "Ngân sách",
          points: 25,
          max_points: 25,
          reason: "Khách nêu con số cụ thể.",
          evidence: "180 triệu đồng",
        },
      ],
      gaps: { lost_points: 0, points_to_hot: 0, essential_missing: [], gaps: [] },
    });
    render(<QualificationResultView view={view} />);
    const row = within(criterionRow("Ngân sách"));

    expect(row.getByText("đủ điểm")).toBeInTheDocument();
    expect(row.getByText("180 triệu đồng")).toBeInTheDocument();
    expect(row.queryByText("Mất điểm vì")).not.toBeInTheDocument();
  });

  it("khách không nhắc tới tiêu chí thì nói thẳng là không tìm thấy, không để trống", () => {
    render(<QualificationResultView view={makeView()} />);
    const row = within(criterionRow("Ngân sách"));

    expect(row.getByText(/Không tìm thấy con số ngân sách nào/)).toBeInTheDocument();
  });
});

describe("<QualificationResultView /> — so với lần chấm trước", () => {
  it("hiện mức tăng và tiêu chí nào lên điểm", () => {
    render(
      <QualificationResultView
        view={makeView({ score: 72 })}
        delta={{
          previousScore: 27,
          changes: [
            { label: "Ngân sách", diff: 25 },
            { label: "Thời gian", diff: 10 },
          ],
        }}
      />
    );

    expect(screen.getByText("+45")).toBeInTheDocument();
    expect(screen.getByText("so với lần chấm trước")).toBeInTheDocument();
    expect(screen.getByText("+25")).toBeInTheDocument();
  });

  it("lần chấm đầu tiên thì không có gì để so", () => {
    render(<QualificationResultView view={makeView()} delta={null} />);

    expect(screen.queryByText("so với lần chấm trước")).not.toBeInTheDocument();
  });
});
