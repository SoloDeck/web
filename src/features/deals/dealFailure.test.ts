import { describe, expect, it } from "vitest";
import {
  canMarkDealLost,
  composeFailureReason,
  FAILURE_REASONS,
  OTHER_REASON,
} from "@/features/deals/dealFailure";
import { STAGES } from "@/features/deals/types";

describe("composeFailureReason", () => {
  it("chỉ chọn nhanh thì lý do chính là lựa chọn đó", () => {
    expect(composeFailureReason("Khách chọn bên khác", "")).toBe("Khách chọn bên khác");
  });

  it("chọn nhanh kèm ghi chú thì ghép bằng dấu hai chấm và bỏ khoảng trắng thừa", () => {
    expect(composeFailureReason("Khách chọn bên khác", "  giá thấp hơn 30%  ")).toBe(
      "Khách chọn bên khác: giá thấp hơn 30%"
    );
  });

  it("chọn 'Khác' thì ghi chú CHÍNH LÀ lý do, không kèm chữ 'Khác'", () => {
    expect(composeFailureReason("Khác", "  khách đổi ý  ")).toBe("khách đổi ý");
  });

  it("chọn 'Khác' mà ghi chú trống hoặc chỉ khoảng trắng thì chưa có lý do", () => {
    expect(composeFailureReason("Khác", "")).toBe("");
    expect(composeFailureReason("Khác", "   ")).toBe("");
  });

  it("chưa chọn gì thì chưa có lý do, dù đã gõ ghi chú", () => {
    expect(composeFailureReason(null, "ghi chú lẻ loi")).toBe("");
  });

  it("lựa chọn 'Khác' nằm trong danh sách chọn nhanh", () => {
    expect(FAILURE_REASONS).toContain(OTHER_REASON);
  });
});

describe("canMarkDealLost — deal nào còn 'Loại bỏ' được", () => {
  it("mọi giai đoạn đang chạy đều loại bỏ được, từ lead mới tới đang triển khai", () => {
    for (const stage of [
      "new_lead",
      "qualified",
      "proposal_sent",
      "in_negotiation",
      "active",
    ] as const) {
      expect(canMarkDealLost(stage), stage).toBe(true);
    }
  });

  it("deal đã hoàn thành thì KHÔNG — thắng rồi không thể 'thất bại'", () => {
    expect(canMarkDealLost("completed_and_billed")).toBe(false);
  });

  it("deal đã không thành công thì KHÔNG — chỉ còn xóa vĩnh viễn trong Kho lưu trữ", () => {
    expect(canMarkDealLost("lost")).toBe(false);
  });

  it("chỉ đúng hai giai đoạn cuối bị chặn — không giai đoạn nào khác bị khóa nhầm", () => {
    const biChan = STAGES.filter((s) => !canMarkDealLost(s.id)).map((s) => s.id);
    expect(biChan.sort()).toEqual(["completed_and_billed", "lost"]);
  });
});
