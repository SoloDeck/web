import { describe, expect, it } from "vitest";
import {
  invoiceReminderText,
  isPaymentTask,
  needsInvoiceReminder,
  paymentMilestoneLabel,
  shouldTickAfterInvoiceSent,
} from "@/features/deals/paymentTasks";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Nhận diện CÔNG VIỆC THU TIỀN.
 *
 * Dấu nhận biết đã đổi từ TÊN TASK (tiền tố "Thu tiền:") sang cột `billingAmount`. Lý do:
 * freelancer sửa tên task một chữ là hàng task mất sạch nút hoá đơn và khoản đó biến khỏi
 * bảng doanh thu — im lặng, không báo gì.
 *
 * Ba chỗ dựa vào hàm này: guard "hoàn thành dự án" (`DealDetailPage`), nút hoá đơn và nút xoá
 * (`ProjectTaskList`). Sai ở đây nghĩa là đóng deal được trong khi tiền chưa về.  #Huynh
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t1",
    title: "Dựng giao diện",
    note: "",
    status: "todo",
    dueDate: null,
    completed: false,
    createdAt: "2026-08-13T00:00:00Z",
    completedAt: null,
    ...over,
  };
}

describe("isPaymentTask", () => {
  it("có billingAmount thì là công việc thu tiền, tên gì cũng được", () => {
    expect(isPaymentTask(task({ title: "Dựng giao diện", billingAmount: 12_000_000 }))).toBe(
      true
    );
  });

  it("đổi tên task KHÔNG làm mất nhận diện — cả điểm của việc thêm cột", () => {
    expect(
      isPaymentTask(task({ title: "Sửa lại theo ý khách", billingAmount: 5_000_000 }))
    ).toBe(true);
  });

  it("hạng mục 0 đồng vẫn là khoản phải thu", () => {
    // `billingAmount != null` chứ không `Number(x) ||` — số 0 phải giữ, không thì dòng đó
    // rơi khỏi guard đóng dự án mà không ai biết.
    expect(isPaymentTask(task({ billingAmount: 0 }))).toBe(true);
  });

  it("task thường thì không", () => {
    expect(isPaymentTask(task({ title: "Sửa lại logo" }))).toBe(false);
    expect(isPaymentTask(task({ title: "Sửa lại logo", billingAmount: null }))).toBe(false);
  });

  it("task CŨ theo tiền tố vẫn nhận ra, dù backfill bỏ sót", () => {
    // Migration cố ý để NULL các task mà nó không chắc số tiền. Chúng vẫn phải chặn được
    // việc đóng dự án — fail an toàn.
    expect(isPaymentTask(task({ title: "Thu tiền: Đặt cọc khi ký hợp đồng" }))).toBe(true);
  });
});

describe("paymentMilestoneLabel", () => {
  it("task mới: tên đã là nhãn hạng mục, giữ nguyên", () => {
    expect(paymentMilestoneLabel(task({ title: "Tích hợp ngân hàng" }))).toBe(
      "Tích hợp ngân hàng"
    );
  });

  it("task cũ: bỏ tiền tố", () => {
    expect(paymentMilestoneLabel(task({ title: "Thu tiền: Đặt cọc" }))).toBe("Đặt cọc");
  });

  it("tiền tố mà không có gì phía sau thì trả nguyên tên, không trả chuỗi rỗng", () => {
    expect(paymentMilestoneLabel(task({ title: "Thu tiền:" }))).toBe("Thu tiền:");
  });
});


describe("shouldTickAfterInvoiceSent", () => {
  /**
   * Gửi hóa đơn xong thì tick luôn mốc đó.
   *
   * Lỗi thật thấy trên màn hình: mốc "Thiết kế giao diện người dùng" còn nhãn "Chưa làm"
   * trong khi ngay dưới nó hóa đơn đã "Đã thanh toán". Hai thứ vốn rời nhau nên freelancer
   * phải nhớ tick tay, quên thì guard "Hoàn thành dự án" chặn dù tiền đã về đủ.  #Huynh
   */
  it("mốc chưa xong thì tick", () => {
    expect(shouldTickAfterInvoiceSent(task({ status: "todo", completed: false }))).toBe(true);
  });

  it("mốc đang làm dở cũng tick — gửi hóa đơn là đã coi như xong", () => {
    // Backend có 4 trạng thái (todo/in_progress/review/done) nhưng `mapTask` gộp về hai:
    // mọi thứ chưa `done` đều thành `todo` phía web. Nên "đang làm dở" tới đây là `todo`.
    expect(shouldTickAfterInvoiceSent(task({ status: "todo", completed: false }))).toBe(true);
  });

  it("mốc đã xong rồi thì thôi, đừng ghi thừa một lượt", () => {
    // Gửi LẠI hóa đơn cho một mốc đã tick là chuyện thường; tick lại chỉ tổ bắn thêm một
    // lượt ghi xuống server và làm bảng việc nháy một cái không vì lý do gì.
    expect(shouldTickAfterInvoiceSent(task({ status: "done", completed: true }))).toBe(false);
  });

  it("hai trường lệch nhau thì coi như đã xong — thà thiếu một lượt ghi còn hơn ghi nhầm", () => {
    // `mapTask` luôn giữ `status` và `completed` khớp nhau, nên cảnh này không xảy ra qua
    // đường API. Khoá lại để nếu sau này có nguồn dữ liệu khác thì vẫn nghiêng về "đừng ghi".
    expect(shouldTickAfterInvoiceSent(task({ status: "done", completed: false }))).toBe(false);
    expect(shouldTickAfterInvoiceSent(task({ status: "todo", completed: true }))).toBe(false);
  });
});


describe("needsInvoiceReminder", () => {
  /**
   * Mốc đã tick xong mà khách chưa nhận được hóa đơn nào.
   *
   * Cảnh này rơi ra từ chính lối thoát ở hộp thoại tick: bấm tick rồi chọn "Để sau". Không
   * nhắc thì mốc đó nằm im giữa những mốc đã xong, trông y hệt các mốc đã thu tiền —
   * freelancer làm xong việc rồi quên đòi tiền.  #Huynh
   */
  const inv = (status: string, over: Record<string, unknown> = {}) => ({
    id: "inv-1",
    invoiceNumber: "INV-1",
    status,
    total: 10_000_000,
    amountPaid: 0,
    ...over,
  });

  const moc = (over: Partial<ProjectTask> = {}) =>
    task({ completed: true, status: "done", billingAmount: 10_000_000, ...over });

  it("mốc xong mà chưa có hóa đơn thì nhắc", () => {
    expect(needsInvoiceReminder(moc())).toBe(true);
  });

  it("hóa đơn mới ở bản nháp cũng nhắc — khách vẫn chưa nhận được gì", () => {
    const t = moc({ invoice: inv("draft") as never });
    expect(needsInvoiceReminder(t)).toBe(true);
    expect(invoiceReminderText(t)).toMatch(/bản nháp/);
  });

  it("đã gửi rồi thì thôi", () => {
    expect(needsInvoiceReminder(moc({ invoice: inv("sent") as never }))).toBe(false);
  });

  it("mốc chưa tick xong thì chưa nhắc — chưa tới lúc đòi tiền", () => {
    expect(needsInvoiceReminder(moc({ completed: false, status: "todo" }))).toBe(false);
  });

  it("công việc thường (không phải mốc thu tiền) thì không dính", () => {
    expect(
      needsInvoiceReminder(
        task({ completed: true, status: "done", title: "Họp với khách", billingAmount: null })
      )
    ).toBe(false);
  });

  it("câu nhắc gọi đúng tên mốc, bỏ tiền tố của task cũ", () => {
    const t = moc({ title: "Thu tiền: Đặt cọc" });
    expect(invoiceReminderText(t)).toBe("Đặt cọc — chưa tạo & gửi hóa đơn");
  });
});
