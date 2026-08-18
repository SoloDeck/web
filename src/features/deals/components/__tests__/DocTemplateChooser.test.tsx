import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocTemplateChooser } from "@/features/deals/components/DocTemplateChooser";
import type { TermTemplateOption } from "@/services/proposalsService";

/**
 * Bộ chọn mẫu điều khoản.
 *
 * Bản trước để cứng phụ đề "Mẫu điều khoản do quản trị viên soạn" cho MỌI mẫu — mà API cũng
 * chỉ trả `{id, name}` nên có muốn hiện cũng không có gì để hiện. Hai mẫu khác nhau nhìn y hệt
 * nhau, chọn xong không có kỳ vọng nào để đối chiếu. Đó là một phần lý do freelancer thấy
 * "chọn mẫu mà chẳng khác gì".
 */

function renderChooser(templates: TermTemplateOption[]) {
  const onChange = vi.fn();
  render(
    <DocTemplateChooser
      templates={templates}
      value={null}
      onChange={onChange}
      docLabel="báo giá"
    />
  );
  return onChange;
}

describe("DocTemplateChooser", () => {
  it("hiện mẫu này ĐIỀN NHỮNG MỤC NÀO", () => {
    renderChooser([
      {
        id: "t1",
        name: "Bàn giao file nguồn",
        blocks: ["Ngoài phạm vi", "Điều khoản chuẩn"],
        preview: "Mua font bản quyền",
      },
    ]);
    expect(screen.getByText(/Điều khoản: Ngoài phạm vi · Điều khoản chuẩn/)).toBeInTheDocument();
  });

  it("hiện trích đoạn để phân biệt hai mẫu", () => {
    renderChooser([
      { id: "t1", name: "Mẫu A", blocks: ["Điều khoản chuẩn"], preview: "Bàn giao file nguồn" },
      { id: "t2", name: "Mẫu B", blocks: ["Điều khoản chuẩn"], preview: "Giữ bản quyền" },
    ]);
    expect(screen.getByText(/Bàn giao file nguồn/)).toBeInTheDocument();
    expect(screen.getByText(/Giữ bản quyền/)).toBeInTheDocument();
  });

  it("mẫu rỗng thì NÓI THẲNG, không để người dùng tự đoán sau", () => {
    // Chọn một mẫu rỗng ra kết quả y hệt "AI tự viết" — đáng được biết trước khi bấm.
    renderChooser([{ id: "t1", name: "Mẫu chưa soạn", blocks: [], preview: "" }]);
    expect(screen.getByText("Mẫu chưa có nội dung")).toBeInTheDocument();
  });

  it("không có mẫu nào thì chỉ dẫn cho freelancer biết vì sao", () => {
    renderChooser([]);
    expect(screen.getByText(/Chưa có mẫu nào cho nghề của bạn/)).toBeInTheDocument();
  });
});

/**
 * MỘT danh sách, hai cách dùng.
 *
 * Bản trước có nút gạt hai chế độ ở đầu, mỗi chế độ một danh sách — nhưng cả hai liệt kê ĐÚNG
 * CÙNG một thư viện mẫu, nên nhìn ra là hai bản sao của nhau. Khác biệt giữa hai đường soạn nằm
 * ở việc BẤM GÌ, nên nó thuộc về hai cái nút ở màn gọi, không phải hai cái tab ở đây.  #Huynh
 */
describe("DocTemplateChooser — một danh sách", () => {
  it("chỉ có MỘT danh sách, không còn nút gạt chế độ", () => {
    renderChooser([{ id: "t1", name: "Mẫu A", blocks: ["Điều khoản chuẩn"] }]);
    expect(screen.queryByText("Nhờ AI viết")).toBeNull();
    expect(screen.queryByText("Tự soạn từ khung")).toBeNull();
    expect(screen.getByText("Mẫu A")).toBeInTheDocument();
  });

  it("luôn có lối KHÔNG dùng mẫu", () => {
    renderChooser([]);
    expect(screen.getByText("Không dùng mẫu")).toBeInTheDocument();
  });

  it("nói cả hai vế: phần thân trước, điều khoản sau", () => {
    // Hai vế tốn công khác hẳn nhau — phần thân là phần gõ lâu nhất.
    renderChooser([
      {
        id: "t1",
        name: "Mẫu đủ",
        blocks: ["Điều khoản chuẩn"],
        skeleton_blocks: ["Tổng quan dự án", "Phạm vi công việc"],
      },
    ]);
    expect(
      screen.getByText(
        /Phần thân: Tổng quan dự án · Phạm vi công việc — Điều khoản: Điều khoản chuẩn/
      )
    ).toBeInTheDocument();
  });

  it("mẫu CHỈ có điều khoản thì nói thẳng phần thân vẫn phải tự gõ", () => {
    // Đúng hình dạng hai mẫu đang nằm trong DB thật.
    renderChooser([{ id: "t1", name: "Mẫu A", blocks: ["Điều khoản chuẩn"] }]);
    expect(
      screen.getByText(/Điều khoản: Điều khoản chuẩn — phần thân bạn tự điền/)
    ).toBeInTheDocument();
  });

  it("mẫu rỗng vẫn nói rõ là rỗng", () => {
    renderChooser([{ id: "t1", name: "Mẫu trắng" }]);
    expect(screen.getByText("Mẫu chưa có nội dung")).toBeInTheDocument();
  });
});
