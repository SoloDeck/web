import { describe, expect, it } from "vitest";
import { missingUpfrontPayments, shouldOfferStartProject } from "@/features/deals/taskActionGuards";
import type { ProjectTask } from "@/features/deals/types";

/**
 * Luật "cọc trước, làm sau" ở tab Công việc.
 *
 * Quy trình đúng: thu khoản "thu ngay" (cọc / tạm ứng) TRƯỚC, rồi mới làm và đòi các khoản
 * "thu khi xong". Tick một khoản "thu khi xong" khi cọc chưa ghi nhận là đi ngược quy trình.
 */

function task(over: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: "t",
    title: "Hạng mục",
    note: "",
    status: "todo",
    dueDate: null,
    completed: false,
    createdAt: "2026-10-01T00:00:00Z",
    completedAt: null,
    ...over,
  };
}

const coc = task({
  id: "coc",
  title: "Tạm ứng khi ký hợp đồng",
  billingAmount: 51_900_000,
  billingDueType: "on_signing",
});
const tuVan = task({
  id: "tu-van",
  title: "Tư vấn và lên ý tưởng",
  billingAmount: 18_200_000,
  billingDueType: "on_completion",
});
const chupAnh = task({
  id: "chup-anh",
  title: "Chụp ảnh sản phẩm",
  billingAmount: 36_400_000,
  billingDueType: "on_completion",
});

describe("missingUpfrontPayments", () => {
  it("khoản thu khi xong mà cọc chưa ghi nhận thì trả về đúng khoản cọc còn thiếu", () => {
    expect(missingUpfrontPayments(tuVan, [coc, tuVan, chupAnh])).toEqual([coc]);
  });

  it("cọc đã ghi nhận (done) thì không còn thiếu gì", () => {
    const cocDaThu = { ...coc, status: "done" as const, completed: true };
    expect(missingUpfrontPayments(tuVan, [cocDaThu, tuVan, chupAnh])).toEqual([]);
  });

  it("liệt kê đủ MỌI khoản thu ngay còn thiếu, không chỉ khoản đầu", () => {
    const phuThu = task({
      id: "phu-thu",
      title: "Phụ thu ký hợp đồng",
      billingAmount: 1_000_000,
      billingDueType: "on_signing",
    });
    const missing = missingUpfrontPayments(chupAnh, [coc, phuThu, tuVan, chupAnh]);
    expect(missing.map((item) => item.id)).toEqual(["coc", "phu-thu"]);
  });

  it("chỉ chặn việc thuộc nhóm thu khi xong; chính khoản thu ngay thì không bị chặn", () => {
    expect(missingUpfrontPayments(coc, [coc, tuVan])).toEqual([]);
  });

  it("task thường hoặc task không rõ thời điểm thu thì im lặng, không đoán", () => {
    const viecThuong = task({ id: "viec-thuong", title: "Dọn thư mục" });
    const khongRoHan = task({ id: "cu", billingAmount: 5_000_000, billingDueType: null });
    expect(missingUpfrontPayments(viecThuong, [coc, viecThuong])).toEqual([]);
    expect(missingUpfrontPayments(khongRoHan, [coc, khongRoHan])).toEqual([]);
  });

  it("deal không có khoản thu ngay nào thì không có gì để nhắc", () => {
    expect(missingUpfrontPayments(tuVan, [tuVan, chupAnh])).toEqual([]);
  });

  it("task có billingAmount nhưng đặt tên tự do vẫn được tính là khoản thu ngay", () => {
    const cocDoiTen = { ...coc, title: "Đặt cọc 30%" };
    expect(missingUpfrontPayments(tuVan, [cocDoiTen, tuVan])).toEqual([cocDoiTen]);
  });
});

describe("shouldOfferStartProject", () => {
  it("đang đàm phán và hợp đồng đã ký thì hỏi chuyển sang triển khai", () => {
    expect(shouldOfferStartProject("in_negotiation", true)).toBe(true);
  });

  it("chưa ghi nhận hợp đồng đã ký thì không hỏi — nút Bắt đầu triển khai cũng đang khoá", () => {
    expect(shouldOfferStartProject("in_negotiation", false)).toBe(false);
  });

  it("đã triển khai hoặc đã hoàn thành thì khỏi hỏi", () => {
    expect(shouldOfferStartProject("active", true)).toBe(false);
    expect(shouldOfferStartProject("completed_and_billed", true)).toBe(false);
  });

  it("các giai đoạn không có đường chuyển thẳng sang triển khai thì không hỏi", () => {
    for (const stage of ["new_lead", "qualified", "proposal_sent", "lost"] as const) {
      expect(shouldOfferStartProject(stage, true)).toBe(false);
    }
  });
});
