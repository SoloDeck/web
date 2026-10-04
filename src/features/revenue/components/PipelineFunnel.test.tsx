import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineFunnel } from "./PipelineFunnel";

/**
 * Phễu từng ghi "31 deal đang chạy" trong khi thẻ "Tổng" (khi đó tên "Tổng đã ký") ghi 25: phễu cộng LUÔN cột
 * "Hoàn thành" (6 deal đã xong) vào số "đang chạy". Deal đã hoàn thành thì không còn chạy.
 */

const stat = (stage: string, deal_count: number, total_value = 0) => ({
  stage,
  deal_count,
  total_value,
});

// Phân bố thật của tài khoản đang demo: 2 + 6 + 4 + 8 + 5 đang chạy, 6 đã hoàn thành.
const THAT = [
  stat("new_lead", 2),
  stat("qualified", 6, 237_500_000),
  stat("proposal_sent", 4, 909_500_000),
  stat("in_negotiation", 8, 1_683_000_000),
  stat("active", 5, 877_000_000),
  stat("completed_and_billed", 6, 1_042_500_000),
];

describe("<PipelineFunnel /> — số deal đang chạy", () => {
  it("25 đang chạy + 6 đã hoàn thành; không cộng cột Hoàn thành vào 'đang chạy'", () => {
    render(<PipelineFunnel data={THAT} />);

    expect(screen.getByText("25 deal đang chạy · 6 đã hoàn thành")).toBeInTheDocument();
    expect(screen.queryByText(/31/)).toBeNull();
  });

  it("chưa deal nào hoàn thành thì không nhắc 'đã hoàn thành'", () => {
    render(<PipelineFunnel data={[stat("qualified", 3), stat("active", 2)]} />);

    expect(screen.getByText("5 deal đang chạy")).toBeInTheDocument();
    expect(screen.queryByText(/đã hoàn thành/)).toBeNull();
  });

  it("chỉ còn deal đã hoàn thành: phễu vẫn vẽ, không rơi vào trạng thái trống", () => {
    render(<PipelineFunnel data={[stat("completed_and_billed", 3, 300_000_000)]} />);

    expect(screen.getByText("0 deal đang chạy · 3 đã hoàn thành")).toBeInTheDocument();
    expect(screen.queryByText(/chưa có deal nào/i)).toBeNull();
  });

  it("deal không thành công (lost) không tính vào đang chạy, hiện riêng", () => {
    render(<PipelineFunnel data={[stat("active", 2), stat("lost", 4)]} />);

    expect(screen.getByText("2 deal đang chạy")).toBeInTheDocument();
    expect(screen.getByText(/4 deal/)).toBeInTheDocument();
    expect(screen.getByText(/Không thành công/)).toBeInTheDocument();
  });

  it("chưa có deal nào thì nói thẳng là trống", () => {
    render(<PipelineFunnel data={[]} />);

    expect(screen.getByText("0 deal đang chạy")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có deal nào trong pipeline/)).toBeInTheDocument();
  });

  it("mỗi cột phễu vẫn hiện đúng số deal của giai đoạn đó", () => {
    render(<PipelineFunnel data={THAT} />);

    // 2, 6, 4, 8, 5, 6 theo thứ tự vòng đời.
    const so = Array.from(document.querySelectorAll(".tabular-nums.text-lg")).map(
      (node) => node.textContent
    );
    expect(so).toEqual(["2", "6", "4", "8", "5", "6"]);
  });
});
