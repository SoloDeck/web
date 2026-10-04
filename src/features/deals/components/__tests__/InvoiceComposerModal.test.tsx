import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { InvoiceComposerModal } from "@/features/deals/components/DealDetailPage";
import type { Deal } from "@/features/deals/types";
import type { InvoiceResponse } from "@/services/invoicesService";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/**
 * Lỗi thật người dùng bắt được: hàng trong tab Tài liệu ghi "Thanh toán đợt 1", bấm vào thì
 * hộp thoại hiện "Thanh toán đợt 2".
 *
 * Nguyên nhân: hộp thoại nhận `suggestedInvoiceIndex` = "số của hóa đơn KẾ TIẾP" (tổng + 1),
 * con số vốn chỉ dành cho việc tạo mới, rồi dùng luôn nó làm tên cho hóa đơn đang mở.
 *
 * Bài ở đây kiểm ĐÚNG chỗ nối dây — `invoiceComposer.test.ts` chỉ kiểm các hàm thuần, nên
 * tháo dây ra nó vẫn xanh.
 */

/**
 * Hạn thanh toán tính TƯƠNG ĐỐI so với hôm nay.
 *
 * Trước đây fixture ghi cứng "2026-08-31". Bài "bấm gửi thì đưa ra đúng nội dung" xanh lúc
 * viết rồi tự chuyển đỏ từ 01/09/2026: hạn đã trôi vào quá khứ nên `validateInvoiceDraft`
 * chặn, `onSaveAndSend` không bao giờ được gọi. Quả bom hẹn giờ — ngày bảo vệ chạy test
 * trước hội đồng vẫn đỏ một file.  #Huynh
 */
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: "inv-1",
    invoice_number: "INV-20260817-649C",
    status: "sent",
    subtotal: 37_199_000,
    total: 37_199_000,
    amount_paid: 0,
    tax_rate: 0,
    due_date: daysFromNow(30),
    notes: null,
    ...over,
  } as InvoiceResponse;
}

const deal = {
  id: "d1",
  projectType: "Làm ứng dụng đặt lịch thăm khám",
  value: 37_199_000,
} as Deal;

function renderModal(
  list: InvoiceResponse[],
  opened: InvoiceResponse | null,
  over: {
    mode?: "create" | "edit" | "view";
    onSaveAndSend?: (id: string, p: never) => void;
    isLoading?: boolean;
  } = {}
) {
  render(
    <InvoiceComposerModal
      mode={over.mode ?? "view"}
      deal={deal}
      // Đúng thứ trang chi tiết truyền vào: số của hóa đơn KẾ TIẾP.
      suggestedInvoiceIndex={list.length + 1}
      existingInvoices={list}
      client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
      invoice={opened}
      isLoading={over.isLoading ?? false}
      onClose={vi.fn()}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onSaveAndSend={over.onSaveAndSend as never}
      onDelete={vi.fn()}
    />
  );
}

describe("InvoiceComposerModal", () => {
  it("mở hóa đơn đầu tiên thì tiêu đề là 'đợt 1', KHÔNG phải 'đợt 2'", () => {
    const list = [invoice({ id: "inv-1" })];
    renderModal(list, list[0]);

    expect(screen.getAllByText("Thanh toán đợt 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("Thanh toán đợt 2")).toBeNull();
  });

  it("mở hóa đơn thứ hai thì ra 'đợt 2'", () => {
    const list = [invoice({ id: "inv-1" }), invoice({ id: "inv-2" })];
    renderModal(list, list[1]);

    expect(screen.getAllByText("Thanh toán đợt 2").length).toBeGreaterThan(0);
  });

  it("hóa đơn đã gửi mà không kèm ghi chú thì NÓI THẲNG, không bày thư mẫu", () => {
    const list = [invoice({ id: "inv-1", status: "sent" })];
    renderModal(list, list[0]);

    expect(screen.getByText(/gửi đi không kèm nội dung riêng/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kính gửi Hỏa Quốc huynh/)).toBeNull();
  });

  it("nhãn nói rõ đây là nội dung ĐÃ gửi, không phải nội dung có thể gửi", () => {
    const list = [invoice({ id: "inv-1", status: "sent", notes: "Hóa đơn: Đợt 1\n\nCảm ơn anh." })];
    renderModal(list, list[0]);

    expect(screen.getByText(/đúng thứ khách nhận được/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cảm ơn anh.")).toBeInTheDocument();
  });
});

describe("xem lại trước khi gửi", () => {
  it("bản nháp có nút gửi, và nội dung được điền sẵn để đọc lại", () => {
    // Lỗi thật: bấm "Tạo & gửi hóa đơn" ở bảng việc là thư bay đi ngay, freelancer không đọc
    // được một chữ nào trong thứ mang tên mình gửi cho khách — nên thư tới nơi chỉ có số
    // tiền, không lời nhắn.
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByRole("button", { name: /lưu & gửi cho khách/i })).toBeInTheDocument();
    // Tên hóa đơn và lời nhắn điền sẵn — freelancer chỉ việc đọc lại rồi sửa.
    expect(screen.getByDisplayValue("Thanh toán đợt 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/)).toBeInTheDocument();
  });

  it("bấm gửi CHƯA gửi gì — hỏi lại đã, vì thư đi rồi thì không thu hồi được", async () => {
    const onSaveAndSend = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));

    expect(onSaveAndSend).not.toHaveBeenCalled();
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent("INV-20260817-649C");
    expect(hopThoai).toHaveTextContent(/37\.199\.000/);
    expect(hopThoai).toHaveTextContent("a@b.c");
  });

  it("xác nhận xong thì đưa ra ĐÚNG nội dung đang hiện trên màn hình", async () => {
    const onSaveAndSend = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: "Lưu & gửi" }));

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
    const [invoiceId, payload] = onSaveAndSend.mock.calls[0];
    expect(invoiceId).toBe("inv-1");
    expect((payload as { notes: string }).notes).toContain("Kính gửi Hỏa Quốc huynh");
  });

  it("hóa đơn ĐÃ gửi thì không còn nút gửi nữa", () => {
    const list = [invoice({ id: "inv-1", status: "sent" })];
    renderModal(list, list[0], { onSaveAndSend: vi.fn() });
    expect(screen.queryByRole("button", { name: /lưu & gửi cho khách/i })).toBeNull();
  });
});

/**
 * Hoá đơn nháp để quá hạn thanh toán.
 *
 * Bản nháp do hệ thống sinh mang hạn +7 ngày tính từ lúc sinh ra. Freelancer làm xong mốc
 * vài tuần sau mới mở ra gửi: `isPastDate` thấy hạn nằm trong quá khứ nên chặn CẢ "Lưu nháp"
 * lẫn "Lưu & gửi cho khách" — hoá đơn đóng băng, tiền không thu được, cho tới khi người dùng
 * tự mò ra ô ngày giữa form mà gõ lại.  #Huynh
 */
describe("hoá đơn nháp quá hạn", () => {
  it("mở ra thì đề xuất hạn mới, không để nguyên hạn đã chết", () => {
    const list = [invoice({ id: "inv-1", status: "draft", due_date: daysFromNow(-30) })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByText(/Hạn cũ đã qua/i)).toBeInTheDocument();
    // Ô ngày phải mang hạn mới (hôm nay + 7), không phải hạn đã trôi qua.
    const hanMoi = new Date();
    hanMoi.setDate(hanMoi.getDate() + 7);
    const dd = String(hanMoi.getDate()).padStart(2, "0");
    const mm = String(hanMoi.getMonth() + 1).padStart(2, "0");
    expect(screen.getByDisplayValue(`${dd}/${mm}/${hanMoi.getFullYear()}`)).toBeInTheDocument();
  });

  it("vẫn gửi được — không còn bị chặn bởi hạn cũ", async () => {
    const onSaveAndSend = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft", due_date: daysFromNow(-30) })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: "Lưu & gửi" }));

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
  });

  it("lưu nháp cũng không bị đóng băng", async () => {
    const onUpdate = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft", due_date: daysFromNow(-30) })];
    render(
      <InvoiceComposerModal
        mode="edit"
        deal={deal}
        suggestedInvoiceIndex={list.length + 1}
        existingInvoices={list}
        client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
        invoice={list[0]}
        isLoading={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

/**
 * Đang gửi thì nút phải KHOÁ và phải nói là đang gửi.
 *
 * "Lưu & gửi cho khách" là chuỗi HAI chặng: PATCH /invoices/{id} rồi POST /invoices/{id}/send
 * (chặng sau đi qua SMTP, mất vài giây). Bản cũ chỉ khoá theo chặng đầu nên nút SÁNG LẠI giữa
 * chừng, cửa sổ vẫn mở, không toast, không chữ "Đang gửi" — người dùng tưởng hỏng nên bấm
 * lại, và khách nhận HAI email hoá đơn cùng số tiền.  #Huynh
 */
describe("trạng thái đang gửi", () => {
  it("đang gửi thì nút khoá lại và đổi chữ thành 'Đang gửi...'", () => {
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn(), isLoading: true });

    const nut = screen.getByRole("button", { name: /đang gửi/i });
    expect(nut).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^lưu & gửi cho khách$/i })).toBeNull();
  });

  it("gửi xong (hết loading) thì nút trở lại bình thường", () => {
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByRole("button", { name: /lưu & gửi cho khách/i })).toBeEnabled();
  });
});

/**
 * Lỗi thật khi soạn hóa đơn nhiều đợt: API trả hóa đơn MỚI NHẤT TRƯỚC nên hóa đơn vừa tạo luôn ra
 * "Thanh toán đợt 1", trùng đợt 1 đã gửi, "Lưu & gửi" bị chặn vì trùng tên — freelancer phải gõ tay
 * "2", "3"... mỗi lần.
 */
describe("tên hóa đơn khi danh sách trả MỚI NHẤT TRƯỚC", () => {
  const cu = invoice({
    id: "inv-cu",
    status: "sent",
    created_at: "2026-10-02T08:00:00Z",
    notes: "Hóa đơn: Thanh toán đợt 1\n\nCảm ơn anh.",
  });
  const moi = invoice({ id: "inv-moi", status: "draft", created_at: "2026-10-02T09:00:00Z", notes: null });

  it("hóa đơn vừa tạo ra 'đợt 2' và gửi được ngay, không bị chặn vì trùng tên", async () => {
    const onSaveAndSend = vi.fn();
    const list = [moi, cu]; // đúng thứ tự API
    renderModal(list, moi, { mode: "edit", onSaveAndSend });

    expect(screen.getByDisplayValue("Thanh toán đợt 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    const hopThoai = screen.getByRole("alertdialog");
    await userEvent.click(within(hopThoai).getByRole("button", { name: "Lưu & gửi" }));

    expect(onSaveAndSend).toHaveBeenCalledTimes(1);
    expect((onSaveAndSend.mock.calls[0][1] as { notes: string }).notes).toContain("Hóa đơn: Thanh toán đợt 2");
  });
});

/**
 * Số tiền trong lời nhắn phải khớp ô "Tổng cần thanh toán" bên trái.
 *
 * Lỗi thật: ô số tiền 521.900.000 nhưng văn bản gõ 511.900.000 — thư tới khách mang hai tổng khác
 * nhau, khách chuyển theo chữ là hóa đơn thành "thanh toán một phần". Giá là của HỢP ĐỒNG, nên nay:
 * ô số tiền và VAT bị KHÓA; câu mẫu ghi SỐ THẬT; gõ thêm một số tiền lạ vào lời nhắn bị TỪ CHỐI;
 * bản nháp cũ còn lệch thì báo ĐỎ và chặn cả Lưu lẫn Lưu & gửi (backend cũng chặn).
 */
describe("lời nhắn mẫu ghi số thật của hóa đơn", () => {
  it("bản nháp mới mở: lời nhắn ghi đúng Tổng cần thanh toán, không có chỗ giữ chỗ", () => {
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    const loiNhan = screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/) as HTMLTextAreaElement;
    expect(loiNhan.value).toContain("Tổng số tiền cần thanh toán là 37.199.000");
    expect(loiNhan.value).not.toContain("{{");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hóa đơn ĐÃ gửi hiện đúng chữ khách nhận (bản cũ còn chỗ giữ chỗ thì điền số thật)", () => {
    const list = [
      invoice({
        id: "inv-1",
        status: "sent",
        total: 521_900_000,
        notes: "Hóa đơn: Đợt 1\n\nCần trả {{tong_tien}} nhé.",
      }),
    ];
    renderModal(list, list[0]);

    const loiNhan = screen.getByDisplayValue(/Cần trả/) as HTMLTextAreaElement;
    expect(loiNhan.value).toContain("521.900.000");
    expect(loiNhan.value).not.toContain("{{");
  });
});

describe("giá bị khóa theo hợp đồng", () => {
  const nhap = () => invoice({ id: "inv-1", status: "draft" });

  it("bản nháp đang mở: ô Số tiền BỊ KHÓA kèm một dòng nói vì sao, và KHÔNG còn ô Thuế/VAT", () => {
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByDisplayValue("37199000")).toBeDisabled();
    expect(screen.getByText(/lấy từ hợp đồng nên không sửa được/i)).toBeInTheDocument();
    expect(screen.queryByText(/Thuế\/VAT/)).toBeNull();
    expect(screen.queryByPlaceholderText("0")).toBeNull();
  });

  it("gõ thử vào ô Số tiền thì không đổi gì, và gửi đi vẫn đúng giá hợp đồng", async () => {
    const onSaveAndSend = vi.fn();
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    const soTien = screen.getByDisplayValue("37199000") as HTMLInputElement;
    await userEvent.type(soTien, "9");

    expect(soTien.value).toBe("37199000");
    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Lưu & gửi" }));
    const payload = onSaveAndSend.mock.calls[0][1] as { subtotal: number; tax_rate: number };
    expect(payload.subtotal).toBe(37_199_000);
    expect(payload.tax_rate).toBe(0);
  });

  it("hóa đơn cũ còn mang VAT: không có ô nhập thuế, Tóm tắt vẫn cộng đủ và lưu giữ nguyên thuế", async () => {
    const onSaveAndSend = vi.fn();
    const list = [
      invoice({ id: "inv-1", status: "draft", subtotal: 100_000_000, total: 108_000_000, tax_rate: 0.08 }),
    ];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    expect(screen.queryByText(/Thuế\/VAT/)).toBeNull();
    const tomTat = screen.getByText("Tóm tắt").parentElement as HTMLElement;
    expect(tomTat).toHaveTextContent("Tạm tính");
    expect(tomTat).toHaveTextContent("8.000.000");
    expect(tomTat).toHaveTextContent("108.000.000");

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Lưu & gửi" }));
    expect((onSaveAndSend.mock.calls[0][1] as { tax_rate: number }).tax_rate).toBeCloseTo(0.08);
  });

  it("hóa đơn không thuế: Tóm tắt chỉ có đúng một dòng Tổng cần thanh toán", () => {
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    const tomTat = screen.getByText("Tóm tắt").parentElement as HTMLElement;
    expect(tomTat).toHaveTextContent("Tổng cần thanh toán");
    expect(tomTat).toHaveTextContent("37.199.000");
    expect(tomTat).not.toHaveTextContent("Tạm tính");
    expect(tomTat).not.toHaveTextContent("Thuế");
  });

  it("chưa có hóa đơn nào (tạo mới) thì chưa có hợp đồng để bám: ô Số tiền gõ được, không có dòng khóa", () => {
    renderModal([], null, { mode: "create" });

    expect(screen.getByDisplayValue("37199000")).not.toBeDisabled();
    expect(screen.queryByText(/lấy từ hợp đồng/i)).toBeNull();
    expect(screen.queryByText(/Thuế\/VAT/)).toBeNull();
  });

  it("hóa đơn ĐÃ gửi chỉ xem: không có dòng khóa giá (cả cửa sổ đã là chỉ đọc)", () => {
    const list = [invoice({ id: "inv-1", status: "sent" })];
    renderModal(list, list[0]);

    expect(screen.queryByText(/lấy từ hợp đồng nên không sửa được/i)).toBeNull();
  });

  it("gõ thêm một số tiền lạ vào lời nhắn bị TỪ CHỐI: chữ giữ nguyên, báo lý do", () => {
    vi.mocked(toast.error).mockClear();
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });
    const loiNhan = screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/) as HTMLTextAreaElement;
    const truoc = loiNhan.value;

    fireEvent.change(loiNhan, { target: { value: `${truoc}\nBớt còn 500k nhé.` } });

    expect(loiNhan.value).toBe(truoc);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/500\.000.*37\.199\.000/));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("chữ khác (không phải tiền) gõ bình thường", () => {
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });
    const loiNhan = screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/) as HTMLTextAreaElement;

    fireEvent.change(loiNhan, { target: { value: `${loiNhan.value}\nGọi 0352015349 trước 16/10/2026 nhé.` } });

    expect(loiNhan.value).toContain("Gọi 0352015349");
  });

  it("dán lại ĐÚNG Tổng cần thanh toán thì được", () => {
    const list = [nhap()];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });
    const loiNhan = screen.getByDisplayValue(/Kính gửi Hỏa Quốc huynh/) as HTMLTextAreaElement;

    fireEvent.change(loiNhan, { target: { value: `${loiNhan.value}\nChuyển 37.199.000 ₫ nhé.` } });

    expect(loiNhan.value).toContain("Chuyển 37.199.000 ₫ nhé.");
  });

  it("bản nháp CŨ còn lệch: vẫn gõ tiếp phần khác được — chỉ số lạ MỚI bị từ chối", () => {
    vi.mocked(toast.error).mockClear();
    const list = [invoice({ id: "inv-1", status: "draft", notes: "Hóa đơn: Thanh toán đợt 1\n\nTổng cộng 511.900.000 ₫." })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });
    const loiNhan = screen.getByDisplayValue(/Tổng cộng 511\.900\.000/) as HTMLTextAreaElement;

    fireEvent.change(loiNhan, { target: { value: `${loiNhan.value} Cảm ơn anh.` } });

    expect(loiNhan.value).toContain("Cảm ơn anh.");
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument(); // vẫn báo đỏ, vẫn chưa lưu/gửi được
  });
});

describe("bản nháp CŨ còn lời nhắn lệch giá: báo đỏ, chặn lưu, chặn gửi", () => {
  const nhap = (notes: string) => invoice({ id: "inv-1", status: "draft", notes });
  const lech = "Hóa đơn: Thanh toán đợt 1\n\nTổng cộng 511.900.000 ₫.";

  it("lệch thì hiện khung ĐỎ nêu cả số gõ tay lẫn Tổng cần thanh toán", () => {
    const list = [nhap(lech)];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    const canhBao = screen.getByRole("alert");
    expect(canhBao).toHaveTextContent("Giá trong lời nhắn đang lệch");
    expect(canhBao).toHaveTextContent("511.900.000");
    expect(canhBao).toHaveTextContent("37.199.000");
  });

  it("'Lưu nháp' khi đang lệch: KHÔNG lưu, báo số lệch và Tổng cần thanh toán", () => {
    vi.mocked(toast.error).mockClear();
    const onUpdate = vi.fn();
    const list = [nhap(lech)];
    render(
      <InvoiceComposerModal
        mode="edit"
        deal={deal}
        suggestedInvoiceIndex={list.length + 1}
        existingInvoices={list}
        client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
        invoice={list[0]}
        isLoading={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/lệch.*511\.900\.000.*37\.199\.000/));
  });

  it("'Lưu & gửi cho khách' khi đang lệch: nhắc giá lệch và CHƯA gửi", async () => {
    vi.mocked(toast.error).mockClear();
    const onSaveAndSend = vi.fn();
    const list = [nhap(lech)];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend });

    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/lệch.*511\.900\.000/));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onSaveAndSend).not.toHaveBeenCalled();
  });

  it("gõ đúng số của hóa đơn thì không báo gì và gửi được", async () => {
    const list = [nhap("Hóa đơn: Thanh toán đợt 1\n\nTổng cộng 37.199.000 ₫, cảm ơn anh.")];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.queryByRole("alert")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /lưu & gửi cho khách/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("xóa số lạ khỏi chữ thì khung đỏ biến mất và lưu được", () => {
    const onUpdate = vi.fn();
    const list = [nhap(lech)];
    render(
      <InvoiceComposerModal
        mode="edit"
        deal={deal}
        suggestedInvoiceIndex={list.length + 1}
        existingInvoices={list}
        client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
        invoice={list[0]}
        isLoading={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    const loiNhan = screen.getByDisplayValue(/Tổng cộng 511\.900\.000/) as HTMLTextAreaElement;
    fireEvent.change(loiNhan, { target: { value: "Cảm ơn anh." } });

    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("số trần (điện thoại, ngày, mã đợt) không bị coi là số tiền", () => {
    const list = [nhap("Hóa đơn: Thanh toán đợt 2\n\nGọi 0352015349 trước 16/10/2026 nhé.")];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("bản nháp CŨ còn câu in cứng số đã lệch (99.999.000 khác 37.199.000) thì bị báo đỏ", () => {
    const list = [nhap("Hóa đơn: Thanh toán đợt 1\n\nTổng số tiền cần thanh toán là 99.999.000 ₫.")];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getByRole("alert")).toHaveTextContent("99.999.000");
  });

  it("hóa đơn ĐÃ gửi thì không báo gì (chỉ xem)", () => {
    const list = [invoice({ id: "inv-1", status: "sent", notes: lech })];
    renderModal(list, list[0]);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("chân cửa sổ soạn hóa đơn", () => {
  it("chỉ còn MỘT nút Đóng (dấu X góc trên bên phải), không lặp thêm nút 'Đóng' ở chân", () => {
    const list = [invoice({ id: "inv-1", status: "draft" })];
    renderModal(list, list[0], { mode: "edit", onSaveAndSend: vi.fn() });

    expect(screen.getAllByRole("button", { name: "Đóng" })).toHaveLength(1);
    // Các nút còn lại ở chân vẫn đủ.
    expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lưu & gửi cho khách/i })).toBeInTheDocument();
  });

  it("nút X ở góc trên vẫn đóng được cửa sổ", async () => {
    const onClose = vi.fn();
    const list = [invoice({ id: "inv-1", status: "draft" })];
    render(
      <InvoiceComposerModal
        mode="edit"
        deal={deal}
        suggestedInvoiceIndex={2}
        existingInvoices={list}
        client={{ name: "Hỏa Quốc huynh", email: "a@b.c", phone: "0352015349" }}
        invoice={list[0]}
        isLoading={false}
        onClose={onClose}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Đóng" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
