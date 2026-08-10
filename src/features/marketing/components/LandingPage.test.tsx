import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type React from "react";

import { LandingPage } from "./LandingPage";
import { STAGES } from "@/features/deals/types";
import {
  CONTRACT_DISCLAIMER,
  FACTS,
  FEATURE_TILES,
  OFFICIAL_TITLE_VI,
} from "@/features/marketing/content";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("LandingPage", () => {
  it("hiện đúng nguyên văn tên đề tài trong phiếu", () => {
    render(<LandingPage />);

    // Khẳng định theo HẰNG chứ không gõ lại chuỗi: ai sửa câu chữ (kể cả đổi en-dash
    // thành gạch nối) là test đỏ, đúng như mong muốn.
    // Dùng getAllByText vì tên cố ý xuất hiện hai lần: ở hero cho hội đồng thấy ngay,
    // và ở chân trang cạnh mã đề tài.
    expect(screen.getAllByText(OFFICIAL_TITLE_VI, { exact: false }).length).toBeGreaterThan(0);
  });

  it("nêu đúng sáu giai đoạn của bảng Kanban thật", () => {
    render(<LandingPage />);

    for (const stage of STAGES.filter((s) => s.id !== "lost")) {
      expect(screen.getAllByText(stage.title).length).toBeGreaterThan(0);
    }
    // Phiếu đăng ký SÁU giai đoạn, và bảng Kanban cũng không render cột `lost`.
    expect(screen.queryByText("Không Chốt Được")).not.toBeInTheDocument();
  });

  it("không hứa những thứ sản phẩm chưa có", () => {
    // Biến chính sách "không nói quá" thành luật chạy được. Repo không có file .dart
    // nào, email đi qua SMTP chứ không phải SendGrid, và analytics không có chỉ số
    // giá trị deal trung bình — dù phiếu có nhắc tới ứng dụng di động và chỉ số đó.
    const CAM = [
      /Flutter/i,
      /ứng dụng di động/i,
      /\bmobile\b/i,
      /tải app/i,
      /App Store/i,
      /Google Play/i,
      /SendGrid/i,
      /giá trị deal trung bình/i,
      /quy mô deal trung bình/i,
      // SoloDesk là CRM riêng của từng freelancer, KHÔNG phải sàn cho khách chọn thợ.
      // Chữ nghĩa là chỗ tính chất "chợ" bò lại dễ nhất, nên chặn luôn ở đây.  #Huynh
      /tìm freelancer/i,
      /danh bạ/i,
      /thuê freelancer/i,
    ];

    const { container } = render(<LandingPage />);
    const text = container.textContent ?? "";

    for (const pattern of CAM) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("chỉ còn một lối vào: freelancer đăng nhập", () => {
    // Trang này từng có lối vào thứ hai "Tôi cần thuê — Tìm freelancer" dẫn vào danh bạ.
    // Đó là hình dạng của một cái sàn; đề tài là CRM độc lập cho từng freelancer, khách
    // chỉ vào qua link riêng do chính freelancer gửi.  #Huynh
    render(<LandingPage />);

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/login"]));
    expect(hrefs).not.toContain("/find-freelancer");
  });

  it("giữ nguyên câu miễn trừ về hợp đồng do AI soạn", () => {
    render(<LandingPage />);

    // Trang vẫn quảng cáo "AI soạn hợp đồng", nên câu giới hạn trách nhiệm này không
    // được phép biến mất trong các lượt cắt chữ sau.
    expect(screen.getByText(CONTRACT_DISCLAIMER)).toBeInTheDocument();
  });

  it("lưới phân hệ đếm đúng bằng con số nêu ở dải số liệu", () => {
    render(<LandingPage />);

    for (const tile of FEATURE_TILES) {
      expect(screen.getAllByText(tile.label).length).toBeGreaterThan(0);
    }
    // Dải số liệu ghi "10 phân hệ nghiệp vụ" — số đó phải bằng số ô trong lưới, không
    // thì hội đồng đếm ra một con số khác con số trang tự ghi.
    const fact = FACTS.find((f) => f.label.includes("Phân hệ"));
    expect(Number(fact?.value)).toBe(FEATURE_TILES.length);
  });
});
