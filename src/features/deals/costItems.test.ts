import { describe, expect, it } from "vitest";
import {
  DUE_ON_COMPLETION,
  DUE_ON_SIGNING,
  costItemsIssue,
  dueLabel,
  rescaleToTotal,
  splitEqually,
  type CostItem,
} from "@/features/deals/proposalHtml";

/**
 * Hạng mục chi phí mục 7.
 *
 * Lỗi thật đã thấy trên màn hình (30/07/2026): panel trái hiện 4 hạng mục 125tr mỗi dòng,
 * trong khi tờ báo giá bên cạnh in 200/150/75/75. Không phải mạng lag — panel LUÔN hiện chia
 * đều, còn backend giữ tỷ lệ của bộ định giá rồi co giãn theo giá chốt. Hai bên đều đúng theo
 * logic riêng, chỉ là không cùng một logic.
 *
 * Các hàm ở đây phải KHỚP TUYỆT ĐỐI với backend (`pdf_content._structured_pricing`) — panel
 * và tờ báo giá cùng một con số thì mới không mâu thuẫn.  #Huynh
 */

const item = (label: string, amount: number): CostItem => ({ label, amount });

describe("splitEqually", () => {
  it("chia đều và cộng ĐÚNG tổng, dòng cuối gánh phần lẻ", () => {
    const out = splitEqually(500_000_000, 4);
    expect(out).toEqual([125_000_000, 125_000_000, 125_000_000, 125_000_000]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(500_000_000);
  });

  it("số lẻ vẫn cộng đúng tổng — bảng không cộng ra tổng là thứ khách soi ra ngay", () => {
    const out = splitEqually(100_000_001, 3);
    expect(out.reduce((a, b) => a + b, 0)).toBe(100_000_001);
  });

  it("chưa có giá hoặc không có dòng nào thì không nổ", () => {
    expect(splitEqually(0, 3)).toEqual([0, 0, 0]);
    expect(splitEqually(1_000_000, 0)).toEqual([]);
  });
});

describe("rescaleToTotal", () => {
  const BO_DINH_GIA = [
    item("BE", 200_000_000),
    item("FE", 150_000_000),
    item("Design", 75_000_000),
    item("QA", 75_000_000),
  ];

  it("GIỮ tỷ lệ giữa các hạng mục khi đổi tổng", () => {
    // Bộ định giá chia 200/150/75/75 cho giá đề xuất 500tr. Hạ giá còn 250tr thì mọi dòng
    // giảm một nửa — KHÔNG san phẳng thành 62.5tr × 4.
    const out = rescaleToTotal(BO_DINH_GIA, 250_000_000, 500_000_000);
    expect(out.map((x) => x.amount)).toEqual([
      100_000_000, 75_000_000, 37_500_000, 37_500_000,
    ]);
    expect(out.reduce((a, b) => a + b.amount, 0)).toBe(250_000_000);
  });

  it("tổng bằng giá đề xuất thì giữ nguyên từng dòng", () => {
    const out = rescaleToTotal(BO_DINH_GIA, 500_000_000, 500_000_000);
    expect(out.map((x) => x.amount)).toEqual([
      200_000_000, 150_000_000, 75_000_000, 75_000_000,
    ]);
  });

  it("MẪU SỐ là giá đề xuất, KHÔNG phải tổng các dòng", () => {
    // Backend chia theo `pricing_detail.suggested`. Tổng các `line_items` không có gì bảo
    // đảm bằng đúng `suggested` — tự cộng lấy mẫu số khác là panel lại nói khác tờ báo giá,
    // đúng con bug đang đi sửa.  #Huynh
    const rows = [item("A", 100_000_000), item("B", 100_000_000)]; // tổng 200tr
    const out = rescaleToTotal(rows, 400_000_000, 400_000_000); // suggested = 400tr

    // ratio = 400/400 = 1 → dòng đầu GIỮ NGUYÊN 100tr.
    // Nếu lấy mẫu số là tổng các dòng (200tr) thì ratio = 2 và nó đã thành 200tr.
    expect(out[0].amount).toBe(100_000_000);
    // Dòng cuối gánh phần lẻ để tổng khớp tuyệt đối.
    expect(out.reduce((a, b) => a + b.amount, 0)).toBe(400_000_000);
  });

  it("không có mẫu số hợp lệ thì cộng các dòng làm phương án chót", () => {
    const out = rescaleToTotal(
      [item("A", 100_000_000), item("B", 100_000_000)],
      400_000_000,
      0
    );
    expect(out.map((x) => x.amount)).toEqual([200_000_000, 200_000_000]);
  });

  it("mọi dòng đều 0 và không có mẫu số thì chia đều", () => {
    const out = rescaleToTotal([item("A", 0), item("B", 0)], 100_000_000, 0);
    expect(out.map((x) => x.amount)).toEqual([50_000_000, 50_000_000]);
  });

  it("giữ nguyên nhãn", () => {
    const out = rescaleToTotal([item("Phát triển backend", 100)], 500, 100);
    expect(out[0].label).toBe("Phát triển backend");
  });
});

describe("costItemsIssue", () => {
  it("khớp giá chào thì không có gì để nói", () => {
    expect(
      costItemsIssue([item("A", 300_000_000), item("B", 200_000_000)], 500_000_000)
    ).toBeNull();
  });

  it("thiếu thì nêu đúng số thiếu", () => {
    const issue = costItemsIssue([item("A", 300_000_000)], 500_000_000);
    expect(issue?.total).toBe(300_000_000);
    expect(issue?.message).toMatch(/thiếu/);
    expect(issue?.message).toMatch(/200\.000\.000/);
  });

  it("dư thì nêu đúng số dư", () => {
    const issue = costItemsIssue([item("A", 600_000_000)], 500_000_000);
    expect(issue?.message).toMatch(/dư/);
    expect(issue?.message).toMatch(/100\.000\.000/);
  });

  it("chưa chốt giá thì bỏ qua — chưa có gì để đối chiếu, cảnh báo là báo oan", () => {
    expect(costItemsIssue([item("A", 300_000_000)], 0)).toBeNull();
  });

  it("chưa có hạng mục nào cũng bỏ qua", () => {
    expect(costItemsIssue([], 500_000_000)).toBeNull();
  });

  /**
   * Hạng mục 0 đồng làm DEAL KẸT VĨNH VIỄN.
   *
   * Mỗi hạng mục sinh ra một công việc thu tiền. Dòng 0 đồng thành một task bắt buộc tick
   * xong mới đóng được dự án, nhưng bấm xuất hoá đơn thì backend từ chối vì 0 đồng. Không có
   * lối ra. Cổng tổng không bắt được vì 0 không làm tổng lệch nếu các dòng khác đã bù.  #Huynh
   */
  it("hạng mục 0 đồng thì chặn, dù tổng vẫn khớp giá chào", () => {
    const issue = costItemsIssue(
      [item("Có tiền", 500_000_000), item("Quên điền", 0)],
      500_000_000
    );
    expect(issue).not.toBeNull();
    expect(issue?.message).toMatch(/Quên điền/);
    expect(issue?.message).toMatch(/0 đ/);
  });

  it("hạng mục 0 đồng vẫn chặn khi chưa chốt giá", () => {
    // Chưa chốt giá thì cổng tổng im lặng, nhưng dòng thiếu tiền vẫn phải nói ra.
    expect(costItemsIssue([item("Quên điền", 0)], 0)).not.toBeNull();
  });

  it("hạng mục chưa đặt tên mà 0 đồng thì vẫn nêu được", () => {
    const issue = costItemsIssue([item("", 0)], 500_000_000);
    expect(issue?.message).toMatch(/chưa đặt tên/);
  });
});

describe("dueLabel", () => {
  /**
   * Thời điểm thu là LOẠI có sẵn, kèm ghi chú tự do tuỳ chọn.
   *
   * Bản đầu chỉ có chữ tự do, và giao diện phải ĐOÁN xem câu đó có nghĩa "thu trước" không
   * bằng cách dò từ khoá tiếng Việt — gõ "Ngay sau khi hai bên xác nhận" là đoán trượt, cảnh
   * báo hiện sai. Nhãn phải khớp `pdf_content.DUE_TYPE_LABELS` bên backend.  #Huynh
   */
  it("chưa chọn thì coi như thu khi hoàn thành", () => {
    expect(dueLabel({})).toBe("Khi hoàn thành hạng mục");
  });

  it("nhãn chuẩn theo loại", () => {
    expect(dueLabel({ due_type: DUE_ON_SIGNING })).toBe("Khi ký hợp đồng");
    expect(dueLabel({ due_type: DUE_ON_COMPLETION })).toBe("Khi hoàn thành hạng mục");
  });

  it("ghi chú riêng in ĐÈ lên nhãn chuẩn", () => {
    // Hợp đồng thật hay có điều kiện riêng — ép về hai câu cố định là làm nghèo tờ giấy.
    expect(
      dueLabel({ due_type: DUE_ON_COMPLETION, due_note: "Sau khi bên A duyệt demo" })
    ).toBe("Sau khi bên A duyệt demo");
  });
});
