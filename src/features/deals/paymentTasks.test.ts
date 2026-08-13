import { describe, expect, it } from "vitest";
import { isPaymentTask, paymentMilestoneLabel } from "@/features/deals/paymentTasks";
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
