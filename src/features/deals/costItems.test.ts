import { describe, expect, it } from "vitest";
import {
  DUE_CUSTOM,
  DUE_ON_COMPLETION,
  DUE_ON_SIGNING,
  DUE_TYPE_LABELS,
  DEPOSIT_DEFAULT_PERCENT,
  DEPOSIT_LABEL,
  costItemsIssue,
  depositAmount,
  depositPercentOf,
  dueLabel,
  rescaleToTotal,
  splitDeposit,
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

  it('chọn "Khác" mà bỏ trống thì chặn — tờ giấy khách ký không được mơ hồ', () => {
    const issue = costItemsIssue(
      [{ label: "Giai đoạn 2", amount: 500_000_000, due_type: DUE_CUSTOM }],
      500_000_000
    );
    expect(issue?.message).toMatch(/Giai đoạn 2/);
    expect(issue?.message).toMatch(/Khác/);
  });

  it('chọn "Khác" và có ghi rõ thì qua', () => {
    expect(
      costItemsIssue(
        [
          {
            label: "Giai đoạn 2",
            amount: 500_000_000,
            due_type: DUE_CUSTOM,
            due_note: "Sau khi bên A duyệt bản demo",
          },
        ],
        500_000_000
      )
    ).toBeNull();
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
      dueLabel({ due_type: DUE_CUSTOM, due_note: "Sau khi bên A duyệt demo" })
    ).toBe("Sau khi bên A duyệt demo");
  });
});


describe("phí trả trước", () => {
  /**
   * Cọc CẮT RA TỪ TỔNG, không cộng thêm: khách vẫn trả đúng giá đã chào. Cộng thêm là tờ báo
   * giá tự mâu thuẫn với chính dòng "Tổng báo giá" của nó, và khách cầm giấy cộng cột "Thành
   * tiền" ra một số khác — mất uy tín ngay tại bàn.
   *
   * Mọi con số ở đây phải KHỚP TUYỆT ĐỐI `pdf_content.deposit_amount` bên backend: tờ báo giá
   * bên phải màn soạn do SERVER dựng, panel bên trái do đây dựng.  #Huynh
   */
  const rows = [
    item("Phát triển ứng dụng di động", 62_500_000),
    item("Tích hợp chức năng đặt lịch", 47_000_000),
    item("Thiết kế giao diện người dùng", 46_500_000),
  ];

  it("ví dụ thật 156 triệu: cọc 30% và tổng không lệch một đồng", () => {
    const out = splitDeposit(rows, 156_000_000, 30);
    expect(out[0].label).toBe(DEPOSIT_LABEL);
    expect(out[0].amount).toBe(46_800_000);
    expect(out[0].due_type).toBe(DUE_ON_SIGNING);
    expect(out[0].is_deposit).toBe(true);
    expect(out.reduce((sum, r) => sum + r.amount, 0)).toBe(156_000_000);
  });

  it("giữ nguyên tỷ lệ giữa các hạng mục còn lại", () => {
    const out = splitDeposit(rows, 156_000_000, 30).filter((r) => !r.is_deposit);
    // Hạng mục đắt nhất vẫn đắt nhất, rẻ nhất vẫn rẻ nhất.
    expect(out.map((r) => r.label)).toEqual(rows.map((r) => r.label));
    expect(out[0].amount).toBeGreaterThan(out[2].amount);
  });

  it("đổi tỷ lệ thì tổng vẫn khớp", () => {
    for (const percent of [10, 25, 40, 50, 70]) {
      const out = splitDeposit(rows, 156_000_000, percent);
      expect(out.reduce((sum, r) => sum + r.amount, 0)).toBe(156_000_000);
    }
  });

  it("0% là BỎ HẲN dòng cọc chứ không phải đặt 0 đ", () => {
    // Dòng 0 đ sẽ bị cổng gửi chặn ("mỗi hạng mục là một đợt thu tiền"), deal kẹt vĩnh viễn.
    const out = splitDeposit(splitDeposit(rows, 156_000_000, 30), 156_000_000, 0);
    expect(out.some((r) => r.is_deposit)).toBe(false);
    expect(out.reduce((sum, r) => sum + r.amount, 0)).toBe(156_000_000);
    expect(costItemsIssue(out, 156_000_000)).toBeNull();
  });

  it("bật rồi tắt rồi bật lại vẫn ra đúng con số cũ", () => {
    const once = splitDeposit(rows, 156_000_000, 30);
    const roundTrip = splitDeposit(splitDeposit(once, 156_000_000, 0), 156_000_000, 30);
    expect(roundTrip.map((r) => r.amount)).toEqual(once.map((r) => r.amount));
  });

  it("làm tròn bội nghìn, nửa-lên chứ không phải nửa-xuống", () => {
    // Backend dùng ROUND_HALF_UP đúng để khớp `Math.round` ở đây; `round()` của Python là làm
    // tròn ngân hàng (round(2.5) == 2) nên KHÔNG dùng được.
    expect(depositAmount(15_000, 30, 0)).toBe(5_000);
    expect(depositAmount(100_000_000, 30, 3)).toBe(30_000_000);
  });

  it("kẹp lại để mỗi hạng mục còn lại vẫn còn tiền", () => {
    expect(depositAmount(1_000_000, 99, 20)).toBe(980_000);
  });

  it("gõ số tiền quy ra đúng tỷ lệ", () => {
    expect(depositPercentOf(156_000_000, 46_800_000)).toBe(30);
    expect(depositPercentOf(0, 100)).toBe(0);
  });

  it("gõ tiền rồi quy ngược lại vẫn ra chính con số đó", () => {
    const percent = depositPercentOf(156_000_000, 50_000_000);
    expect(depositAmount(156_000_000, percent, 3)).toBe(50_000_000);
  });

  it("mặc định là 30%", () => {
    expect(DEPOSIT_DEFAULT_PERCENT).toBe(30);
  });

  it("giữ nhãn freelancer đã sửa khi đổi tỷ lệ", () => {
    const named = splitDeposit(rows, 156_000_000, 30).map((r) =>
      r.is_deposit ? { ...r, label: "Đặt cọc đợt 1" } : r
    );
    expect(splitDeposit(named, 156_000_000, 40)[0].label).toBe("Đặt cọc đợt 1");
  });
});

describe("đổi thứ tự hạng mục", () => {
  it("KHÔNG làm đổi số tiền của bất kỳ hạng mục nào", () => {
    // Cả điểm của việc kéo-thả: đây là thao tác TRÌNH BÀY, không phải thao tác về tiền. Bản
    // trước lấy vị trí làm khoản cọc nên kéo một cái là dòng tiền nhảy theo.  #Huynh
    const withDeposit = splitDeposit(
      [item("Thiết kế", 40_000_000), item("Phát triển", 60_000_000)],
      100_000_000,
      30
    );
    const [deposit, ...rest] = withDeposit;
    const reordered = [deposit, rest[1], rest[0]];

    expect(reordered.map((r) => r.label)).toEqual([
      DEPOSIT_LABEL,
      "Phát triển",
      "Thiết kế",
    ]);
    expect(reordered.reduce((sum, r) => sum + r.amount, 0)).toBe(100_000_000);
    // Từng dòng giữ nguyên tiền của chính nó.
    expect(rest[0].amount).toBe(reordered[2].amount);
    expect(rest[1].amount).toBe(reordered[1].amount);
  });

  it("không làm nhảy dòng thu khi ký — bằng chứng luật cũ đã gỡ", () => {
    const withDeposit = splitDeposit(
      [item("Thiết kế", 40_000_000), item("Phát triển", 60_000_000)],
      100_000_000,
      30
    );
    const [deposit, ...rest] = withDeposit;
    const reordered = [deposit, rest[1], rest[0]];
    // Đúng MỘT dòng thu khi ký, và đó là dòng cọc — không phải "dòng đang đứng đầu".
    expect(reordered.filter((r) => r.due_type === DUE_ON_SIGNING)).toHaveLength(1);
    expect(reordered[0].is_deposit).toBe(true);
    // Hạng mục thường: `splitDeposit` cố ý KHÔNG ghi đè thời điểm thu — đè là xoá mất lựa
    // chọn freelancer đã đặt tay. Chưa đặt thì cả hai bên đều hiểu là "khi hoàn thành".
    expect(dueLabel(reordered[1])).toBe(DUE_TYPE_LABELS[DUE_ON_COMPLETION]);
    expect(dueLabel(reordered[2])).toBe(DUE_TYPE_LABELS[DUE_ON_COMPLETION]);
  });
});
