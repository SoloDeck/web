import { describe, expect, it } from "vitest";
import { buildClientTimeline } from "@/features/clients/clientTimeline";
import type { Deal } from "@/features/deals/types";

/**
 * Dòng thời gian của một khách hàng.
 *
 * Trước đây "Lịch sử tương tác" chỉ hiện những dòng freelancer tự gõ tay, còn mọi việc THẬT SỰ
 * đã làm với khách — gửi báo giá, khách chấp nhận, ký hợp đồng, thu tiền — nằm rải trong lịch
 * sử của từng deal. Hồ sơ khách nhìn vào gần như trống dù đã chạy với họ ba dự án.  #Huynh
 */

function deal(id: string, projectType: string, createdAt: string) {
  return { id, projectType, createdAt } as Pick<Deal, "id" | "projectType" | "createdAt">;
}

describe("buildClientTimeline", () => {
  it("gộp dòng tự ghi với lịch sử của các deal, mới nhất lên đầu", () => {
    const items = buildClientTimeline({
      commLogs: [
        {
          id: "c1",
          channel: "phone",
          summary: "Gọi xác nhận phạm vi.",
          communicated_at: "2026-08-02T09:00:00Z",
        },
      ],
      deals: [deal("d1", "Thiết kế logo", "2026-08-01T08:00:00Z")],
      dealHistories: {
        d1: [{ id: "h1", date: "2026-08-03T14:20:00Z", text: "Đã gửi báo giá cho khách." }],
      },
    });

    expect(items.map((i) => i.text)).toEqual([
      "Đã gửi báo giá cho khách.",
      "Gọi xác nhận phạm vi.",
      "Mở dự án mới với khách hàng này.",
    ]);
  });

  it("MỘT khách NHIỀU deal thì mỗi dòng nói rõ thuộc dự án nào", () => {
    // Không có nhãn này thì hai dự án chạy song song trộn thành một mớ không đọc được.
    const items = buildClientTimeline({
      commLogs: [],
      deals: [
        deal("d1", "Thiết kế logo", "2026-08-01T08:00:00Z"),
        deal("d2", "Website bán hàng", "2026-08-05T08:00:00Z"),
      ],
      dealHistories: {
        d1: [{ id: "h1", date: "2026-08-02T10:00:00Z", text: "Khách đã ký hợp đồng." }],
        d2: [{ id: "h2", date: "2026-08-06T10:00:00Z", text: "Đã gửi báo giá cho khách." }],
      },
    });

    const theoDuAn = Object.fromEntries(
      items.filter((i) => i.dealTitle).map((i) => [i.text, i.dealTitle])
    );
    expect(theoDuAn["Khách đã ký hợp đồng."]).toBe("Thiết kế logo");
    expect(theoDuAn["Đã gửi báo giá cho khách."]).toBe("Website bán hàng");
  });

  it("xếp theo MỐC THỜI GIAN thật, không so chuỗi", () => {
    // Hai nguồn không cùng định dạng ISO (một cái có mili giây, một cái không). So chuỗi là
    // xếp sai ngay khi chúng trộn vào nhau.
    const items = buildClientTimeline({
      commLogs: [
        {
          id: "c1",
          channel: "email",
          summary: "Muộn hơn",
          communicated_at: "2026-08-10T10:00:00.500Z",
        },
      ],
      deals: [],
      dealHistories: {},
    });
    const items2 = buildClientTimeline({
      commLogs: [
        { id: "c1", channel: "email", summary: "Sớm", communicated_at: "2026-08-10T09:00:00.500Z" },
      ],
      deals: [deal("d1", "Dự án", "2026-08-10T10:00:00Z")],
      dealHistories: {},
    });

    expect(items).toHaveLength(1);
    expect(items2[0].text).toBe("Mở dự án mới với khách hàng này.");
    expect(items2[1].text).toBe("Sớm");
  });

  it("bỏ qua mốc thời gian rác thay vì đẩy cả danh sách lộn xộn", () => {
    const items = buildClientTimeline({
      commLogs: [{ id: "c1", channel: "email", summary: "Hỏng", communicated_at: "khong-phai-ngay" }],
      deals: [deal("d1", "Dự án", "2026-08-01T08:00:00Z")],
      dealHistories: {
        d1: [{ id: "h1", date: "", text: "Cũng hỏng" }],
      },
    });

    expect(items.map((i) => i.text)).toEqual(["Mở dự án mới với khách hàng này."]);
  });

  it("phân biệt được dòng tự ghi và dòng tự động", () => {
    const items = buildClientTimeline({
      commLogs: [
        { id: "c1", channel: "zalo", summary: "Tự ghi", communicated_at: "2026-08-02T09:00:00Z" },
      ],
      deals: [deal("d1", "Dự án", "2026-08-01T08:00:00Z")],
      dealHistories: {},
    });

    expect(items.find((i) => i.text === "Tự ghi")?.source).toBe("comm_log");
    expect(items.find((i) => i.dealId === "d1")?.source).toBe("deal");
  });

  it("khách chưa có deal nào thì vẫn chạy, chỉ còn dòng tự ghi", () => {
    const items = buildClientTimeline({
      commLogs: [
        { id: "c1", channel: "email", summary: "Chào hỏi", communicated_at: "2026-08-02T09:00:00Z" },
      ],
      deals: [],
      dealHistories: {},
    });
    expect(items).toHaveLength(1);
    expect(items[0].dealTitle).toBeUndefined();
  });

  it("deal không có lịch sử cục bộ vẫn góp mốc mở dự án", () => {
    // Đổi máy là localStorage trống, nhưng mốc mở dự án lấy từ API nên không mất.
    const items = buildClientTimeline({
      commLogs: [],
      deals: [deal("d1", "Thiết kế logo", "2026-08-01T08:00:00Z")],
      dealHistories: {},
    });
    expect(items).toHaveLength(1);
    expect(items[0].dealTitle).toBe("Thiết kế logo");
  });
});
