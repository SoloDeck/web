import { describe, expect, it } from "vitest";
import {
  buildDefaultInvoiceNotes,
  buildInvoiceDraft,
  fillInvoiceAmount,
  findMoneyAmounts,
  getInvoiceDisplayTitle,
  invoiceOrdinal,
  mismatchedAmounts,
  invoiceSentMessage,
  nextInvoiceNumber,
  retargetAmountSentence,
} from "@/features/deals/invoiceComposer";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

/**
 * Tên và nội dung hóa đơn ở màn chi tiết deal.
 *
 * Hai lỗi thật, thấy cùng lúc trên một màn hình:
 *   1. Hàng trong tab Tài liệu ghi "Thanh toán đợt 1", bấm vào thì hộp thoại hiện "Thanh toán
 *      đợt 2" — cùng một chứng từ mà hai cái tên.
 *   2. Hộp thoại bày một đoạn "Nội dung gửi khách" cho hóa đơn ĐÃ GỬI mà vốn không có ghi
 *      chú nào; freelancer đối chiếu hộp thư của khách rồi tưởng hệ thống gửi thiếu.
 */

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20260817-649C",
    status: "sent",
    subtotal: 37_199_000,
    total: 37_199_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: "2026-08-31",
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const deal = { id: "d1", projectType: "Làm ứng dụng đặt lịch thăm khám", value: 37_199_000 } as Deal;
const client = { name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" };

describe("số thứ tự hóa đơn", () => {
  it("hàng trong danh sách và hộp thoại phải ra CÙNG một cái tên", () => {
    const list = [invoice({ id: "inv-1" })];
    const tenTrongDanhSach = getInvoiceDisplayTitle(list[0], list);

    // Số kế tiếp (2) là thứ dành cho việc TẠO MỚI — mở hóa đơn đang có mà dùng nó là sai.
    const draft = buildInvoiceDraft(deal, client, "formal", invoiceOrdinal(list, list[0]), list[0]);

    expect(tenTrongDanhSach).toBe("Thanh toán đợt 1");
    expect(draft.title).toBe("Thanh toán đợt 1");
  });

  it("hóa đơn thứ hai vẫn ra đúng số của nó", () => {
    const list = [invoice({ id: "inv-1" }), invoice({ id: "inv-2" })];
    expect(invoiceOrdinal(list, list[1])).toBe(2);
    expect(getInvoiceDisplayTitle(list[1], list)).toBe("Thanh toán đợt 2");
  });

  it("tên freelancer tự đặt thì tôn trọng, không đánh số đè", () => {
    const named = invoice({ notes: "Hóa đơn: Đợt cuối\n\nCảm ơn anh." });
    expect(getInvoiceDisplayTitle(named, [named])).toBe("Đợt cuối");
    expect(buildInvoiceDraft(deal, client, "formal", 1, named).title).toBe("Đợt cuối");
  });

  it("hóa đơn không nằm trong danh sách thì xếp cuối, không trả 0", () => {
    expect(invoiceOrdinal([], invoice())).toBe(1);
  });
});

/**
 * API trả hóa đơn MỚI NHẤT TRƯỚC. Đánh số theo vị trí trong mảng thì hóa đơn vừa tạo luôn là
 * "đợt 1", trùng đợt 1 đã gửi, và nút "Lưu & gửi" bị chặn vì trùng tên — freelancer phải gõ tay
 * "2", "3"... mỗi lần.
 */
describe("đánh số khi danh sách trả MỚI NHẤT TRƯỚC", () => {
  const cu = invoice({
    id: "inv-cu",
    status: "sent",
    created_at: "2026-10-02T08:00:00Z",
    notes: "Hóa đơn: Thanh toán đợt 1\n\nNội dung.",
  });
  const moi = invoice({ id: "inv-moi", status: "draft", created_at: "2026-10-02T09:00:00Z", notes: null });

  it("hóa đơn vừa tạo ra 'đợt 2' chứ không trùng 'đợt 1' đã gửi", () => {
    const list = [moi, cu]; // đúng thứ tự API: mới nhất trước

    expect(getInvoiceDisplayTitle(moi, list)).toBe("Thanh toán đợt 2");
    expect(invoiceOrdinal(list, moi)).toBe(2);
    expect(buildInvoiceDraft(deal, client, "formal", invoiceOrdinal(list, moi), moi).title).toBe(
      "Thanh toán đợt 2"
    );
    expect(getInvoiceDisplayTitle(cu, list)).toBe("Thanh toán đợt 1");
  });

  it("hóa đơn kế tiếp là số lớn nhất đang có + 1", () => {
    expect(nextInvoiceNumber([moi, cu])).toBe(3);
    expect(nextInvoiceNumber([])).toBe(1);
  });

  it("freelancer đặt số nhảy cóc thì số kế tiếp đi tiếp từ số đó, không đụng tên đã có", () => {
    const dot3 = invoice({ id: "a", created_at: "2026-10-01T08:00:00Z", notes: "Hóa đơn: Thanh toán đợt 3\n\nx" });
    expect(nextInvoiceNumber([dot3])).toBe(4);
    const chua = invoice({ id: "b", status: "draft", created_at: "2026-10-02T08:00:00Z", notes: null });
    expect(getInvoiceDisplayTitle(chua, [chua, dot3])).toBe("Thanh toán đợt 4");
  });

  it("tên tự đặt không theo mẫu thì vẫn đếm số hóa đơn, không quay về 1", () => {
    const dacBiet = invoice({ id: "a", created_at: "2026-10-01T08:00:00Z", notes: "Hóa đơn: Đợt cuối\n\nx" });
    expect(nextInvoiceNumber([dacBiet])).toBe(2);
  });

  it("nhiều hóa đơn chưa đặt tên thì đánh số theo thời gian: cũ nhất là 1", () => {
    const a = invoice({ id: "a", created_at: "2026-10-01T08:00:00Z", notes: null });
    const b = invoice({ id: "b", created_at: "2026-10-02T08:00:00Z", notes: null });
    const c = invoice({ id: "c", created_at: "2026-10-03T08:00:00Z", notes: null });
    const list = [c, b, a];

    expect(getInvoiceDisplayTitle(a, list)).toBe("Thanh toán đợt 1");
    expect(getInvoiceDisplayTitle(b, list)).toBe("Thanh toán đợt 2");
    expect(getInvoiceDisplayTitle(c, list)).toBe("Thanh toán đợt 3");
  });

  it("hóa đơn chưa nằm trong danh sách (vừa tạo, danh sách chưa tải lại) vẫn ra số kế tiếp", () => {
    expect(invoiceOrdinal([cu], moi)).toBe(2);
  });
});

describe("số tiền trong lời nhắn gửi khách", () => {
  it("lời nhắn mẫu ghi SỐ THẬT = Tổng cần thanh toán (đã gồm thuế), không có chỗ giữ chỗ", () => {
    for (const tone of ["formal", "friendly"] as const) {
      const notes = buildDefaultInvoiceNotes(deal, client, 521_900_000, tone);
      expect(notes).toContain(`là ${formatVND(521_900_000)}.`);
      expect(notes).not.toContain("{{");
    }
  });

  it("bản nháp có VAT: lời nhắn ghi TỔNG gồm thuế, không phải số trước thuế", () => {
    const draft = buildInvoiceDraft(
      deal,
      client,
      "formal",
      1,
      invoice({ status: "draft", subtotal: 100_000_000, tax_rate: 0.08, total: 108_000_000, notes: null })
    );
    expect(draft.notes).toContain(formatVND(108_000_000));
    expect(draft.notes).not.toContain(formatVND(100_000_000));
  });

  it("bản nháp cũ còn chỗ giữ chỗ {{tong_tien}} thì mở ra thấy SỐ THẬT; hóa đơn đã gửi giữ nguyên", () => {
    const notes = "Hóa đơn: Đợt 1\n\nTổng số tiền cần thanh toán là {{tong_tien}}.";
    const nhap = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "draft", notes }));
    const daGui = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "sent", notes }));

    expect(nhap.notes).toBe(`Tổng số tiền cần thanh toán là ${formatVND(37_199_000)}.`);
    expect(daGui.notes).toContain("{{tong_tien}}"); // khung xem điền số lúc hiển thị
  });

  it("fillInvoiceAmount điền đúng số, chịu khoảng trắng và hoa/thường", () => {
    expect(fillInvoiceAmount("Tổng {{tong_tien}} và {{ TONG_TIEN }}.", 521_900_000)).toBe(
      `Tổng ${formatVND(521_900_000)} và ${formatVND(521_900_000)}.`
    );
    expect(fillInvoiceAmount("Không có chỗ giữ chỗ.", 1)).toBe("Không có chỗ giữ chỗ.");
  });
});

/**
 * Nhận ra số tiền gõ tay trong lời nhắn. Bộ ví dụ SAO Y từ `test_typed_amounts.py` ở backend: hai bản
 * cài đặt phải cho cùng kết quả, không thì web báo ổn mà backend chặn.
 */
describe("số tiền gõ tay trong lời nhắn", () => {
  const laTien: Array<[string, number[]]> = [
    ["Tổng số tiền cần thanh toán là 511.900.000 ₫.", [511_900_000]],
    ["Phí 500k", [500_000]],
    ["Tạm ứng 30tr", [30_000_000]],
    ["Khoảng 1,5 triệu", [1_500_000]],
    ["Dự án 2 tỷ", [2_000_000_000]],
    ["Chỉ 50.000đ", [50_000]],
    ["Chỉ 50.000 đồng", [50_000]],
    ["Giá 1,500", [1_500]],
    ["VND: 15.000.000 VND", [15_000_000]],
    ["Đợt 1 là 100.000.000 ₫, đợt 2 là 421.900.000 ₫", [100_000_000, 421_900_000]],
    ["500K và 30TR", [500_000, 30_000_000]],
  ];
  const khongPhaiTien = [
    "Gọi 0352015349 nhé",
    "Hạn thanh toán 16/10/2026",
    "Hạn 16.10.2026",
    "Thanh toán đợt 2",
    "Tạm ứng 50%",
    "Mã INV-20261003-AB12",
    "Tối đa 2 vòng chỉnh sửa",
    "Giao 5km",
    "Dài 5 trang",
    "Phiên bản 3.5",
    "Số tài khoản 0123456789",
    "Tổng số tiền cần thanh toán là {{tong_tien}}.",
    "",
  ];

  it.each(laTien)("nhận ra tiền trong %j", (text, expected) => {
    expect(findMoneyAmounts(text)).toEqual(expected);
  });

  it.each(khongPhaiTien)("số trần không bị coi là tiền: %j", (text) => {
    expect(findMoneyAmounts(text)).toEqual([]);
  });

  it("null/undefined không nổ", () => {
    expect(findMoneyAmounts(null)).toEqual([]);
    expect(findMoneyAmounts(undefined)).toEqual([]);
  });

  it("số khớp một con số trên hóa đơn thì cho qua; số LẠ thì bị nêu ra", () => {
    const text = "Tạm tính 100.000.000 ₫, thuế 8.000.000 ₫, tổng 108.000.000 ₫.";
    expect(mismatchedAmounts(text, [100_000_000, 8_000_000, 108_000_000])).toEqual([]);
    expect(mismatchedAmounts("Hóa đơn 521.900.000 ₫ và phụ thu 1.000.000 ₫.", [521_900_000])).toEqual([1_000_000]);
  });

  it("lệch một đồng do làm tròn vẫn cho qua, lệch hơn thì không", () => {
    expect(mismatchedAmounts("Tổng 1.080.001 ₫", [1_080_000])).toEqual([]);
    expect(mismatchedAmounts("Tổng 1.080.003 ₫", [1_080_000])).toEqual([1_080_003]);
  });
});

describe("câu mẫu tự đổi theo tổng", () => {
  const cau = (n: number) => `Tổng số tiền cần thanh toán là ${formatVND(n)}.`;

  it("sửa ô số tiền / VAT thì số trong câu mẫu đi theo tổng mới", () => {
    const notes = `Kính gửi anh,\n${cau(37_199_000)}\nCảm ơn.`;
    expect(retargetAmountSentence(notes, 37_199_000, 521_900_000)).toBe(
      `Kính gửi anh,\n${cau(521_900_000)}\nCảm ơn.`
    );
  });

  it("áp dụng cả cho câu của giọng thân mật", () => {
    const notes = `Số tiền cần thanh toán là ${formatVND(1_000_000)}.`;
    expect(retargetAmountSentence(notes, 1_000_000, 2_000_000)).toBe(
      `Số tiền cần thanh toán là ${formatVND(2_000_000)}.`
    );
  });

  it("người dùng đã tự gõ con số khác thì KHÔNG đụng vào (và nó sẽ bị báo đỏ vì lệch)", () => {
    const notes = cau(511_900_000);
    expect(retargetAmountSentence(notes, 521_900_000, 600_000_000)).toBe(notes);
    expect(mismatchedAmounts(notes, [600_000_000])).toEqual([511_900_000]);
  });

  it("tổng không đổi thì giữ nguyên; chữ khác không bị đụng", () => {
    const notes = `Phí phát sinh ${formatVND(1_000_000)} đã gồm. ${cau(5_000_000)}`;
    expect(retargetAmountSentence(notes, 5_000_000, 5_000_000)).toBe(notes);
    expect(retargetAmountSentence(notes, 5_000_000, 6_000_000)).toBe(
      `Phí phát sinh ${formatVND(1_000_000)} đã gồm. ${cau(6_000_000)}`
    );
  });
});

describe("nội dung gửi khách", () => {
  it("hóa đơn ĐÃ GỬI mà không có ghi chú thì để TRỐNG, không bịa thư mẫu", () => {
    // Hóa đơn sinh từ mốc thu tiền đi thẳng, `notes` là NULL. Bày một đoạn thư mẫu ở đây là
    // cho freelancer xem thứ khách chưa bao giờ nhận được.
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "sent" }));
    expect(draft.notes).toBe("");
  });

  it("hóa đơn đã thanh toán cũng vậy", () => {
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "paid" }));
    expect(draft.notes).toBe("");
  });

  it("bản NHÁP thì vẫn soạn sẵn cho freelancer sửa — sửa xong lưu là nó thành thật", () => {
    const draft = buildInvoiceDraft(deal, client, "formal", 1, invoice({ status: "draft" }));
    expect(draft.notes).toContain("Kính gửi Hỏa Quốc huynh");
  });

  it("tạo hóa đơn mới cũng soạn sẵn", () => {
    expect(buildInvoiceDraft(deal, client, "friendly", 1).notes).toContain("Chào Hỏa Quốc huynh");
  });

  it("có ghi chú thật thì hiện đúng phần thân, bỏ dòng tiêu đề", () => {
    const draft = buildInvoiceDraft(
      deal,
      client,
      "formal",
      1,
      invoice({ status: "sent", notes: "Hóa đơn: Đợt 1\n\nCảm ơn anh đã hợp tác." })
    );
    expect(draft.notes).toBe("Cảm ơn anh đã hợp tác.");
  });
});

/**
 * Thông báo sau khi gửi hóa đơn phải nói ĐÚNG việc hệ thống đã làm với lời nhắc thanh toán (theo kết
 * quả backend trả về): đã lên lịch (kèm chỗ kiểm tra, có chờ duyệt không) hay vì sao chưa lên lịch.
 */
describe("invoiceSentMessage", () => {
  const dat = { scheduled: true, scheduled_at: "2026-10-14T02:00:00Z", days_before_due: 3 };
  const goc = "Đã gửi hóa đơn INV-1 cho khách.";

  it("đã lên lịch (tự gửi): nói trước mấy ngày so với hạn thanh toán và chỉ chỗ kiểm tra", () => {
    expect(invoiceSentMessage("INV-1", { ...dat, requires_approval: false })).toBe(
      goc + ' Sẽ tự động lên lịch nhắc trước 3 ngày so với hạn thanh toán, bạn có thể kiểm tra ở mục "Nhắc nhở".'
    );
  });

  it("số ngày lấy theo quy tắc của người dùng chứ không cố định", () => {
    expect(invoiceSentMessage("INV-1", { ...dat, days_before_due: 5 })).toContain("trước 5 ngày");
    expect(invoiceSentMessage("INV-1", { ...dat, days_before_due: 0 })).toContain(
      "vào đúng ngày đến hạn thanh toán"
    );
  });

  it("quy tắc để chờ duyệt thì nói rõ lời nhắc chờ bạn duyệt, không hứa tự gửi", () => {
    const text = invoiceSentMessage("INV-1", { ...dat, requires_approval: true });

    expect(text).toContain('kiểm tra ở mục "Nhắc nhở".');
    expect(text).toContain("Lời nhắc chờ bạn duyệt trước khi gửi.");
  });

  it.each([
    ["too_soon", "Hạn thanh toán còn quá gần nên chưa lên lịch nhắc tự động."],
    ["disabled", "Quy tắc nhắc trước hạn thanh toán đang tắt nên chưa lên lịch nhắc."],
    ["no_client_email", "Khách chưa có email nên chưa lên lịch nhắc."],
    ["error", "Chưa lên lịch được lời nhắc tự động."],
  ] as const)("không đặt được vì %s: nói thật lý do, không hứa lịch nhắc", (reason, cau) => {
    const text = invoiceSentMessage("INV-1", { scheduled: false, reason });

    expect(text).toBe(`${goc} ${cau}`);
    expect(text).not.toContain("Sẽ tự động lên lịch");
  });

  it("backend cũ không trả gì về lời nhắc thì chỉ nói đã gửi", () => {
    expect(invoiceSentMessage("INV-1", null)).toBe(goc);
    expect(invoiceSentMessage("INV-1")).toBe(goc);
  });
});
