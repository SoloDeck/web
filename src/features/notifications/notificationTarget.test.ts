import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContract } from "@/services/contractsService";
import { getDeal } from "@/services/dealsService";
import { getInvoice } from "@/services/invoicesService";
import { getReminder, listReminders } from "@/services/remindersService";
import { resolveNotificationTarget } from "./notificationTarget";

/**
 * Bấm thông báo phải dẫn tới ĐÚNG CHỖ CẦN LÀM — không chỉ trang deal, mà đúng tab và đúng mục.
 * Trước đây chỉ loại "deal" đi được đâu đó; hoá đơn quá hạn, bốn loại lời nhắc và "N lời nhắc
 * chờ duyệt" bấm vào chỉ đóng chuông lại.  #Huynh
 */

vi.mock("@/services/invoicesService", () => ({ getInvoice: vi.fn() }));
vi.mock("@/services/remindersService", () => ({ getReminder: vi.fn(), listReminders: vi.fn() }));
vi.mock("@/services/contractsService", () => ({ getContract: vi.fn() }));
vi.mock("@/services/dealsService", () => ({ getDeal: vi.fn() }));

beforeEach(() => {
  vi.mocked(getInvoice).mockReset();
  vi.mocked(getReminder).mockReset();
  vi.mocked(listReminders).mockReset();
  vi.mocked(getContract).mockReset();
  vi.mocked(getDeal).mockReset().mockResolvedValue({} as never);
});

const tb = (type: string, entity_type: string | null, entity_id: string | null) =>
  ({ type, entity_type, entity_id }) as Parameters<typeof resolveNotificationTarget>[0];

describe("resolveNotificationTarget", () => {
  it("khách gửi yêu cầu / AI chấm điểm → trang deal, không gọi API", async () => {
    await expect(resolveNotificationTarget(tb("deal_qualified", "deal", "d1"))).resolves.toEqual({
      kind: "deal",
      dealId: "d1",
    });
    expect(getInvoice).not.toHaveBeenCalled();
  });

  it("N lời nhắc chờ duyệt (gộp theo deal) → mở tab Nhắc nhở của deal đó", async () => {
    await expect(resolveNotificationTarget(tb("reminder_drafted", "deal", "d1"))).resolves.toEqual({
      kind: "deal",
      dealId: "d1",
      tab: "reminders",
    });
  });

  it("chờ duyệt thuộc khách (không có deal) → trang khách", async () => {
    await expect(
      resolveNotificationTarget(tb("reminder_drafted", "client", "cl1"))
    ).resolves.toEqual({ kind: "client", clientId: "cl1" });
  });

  it("hoá đơn quá hạn → tab Tài liệu và bật sẵn chính hoá đơn đó", async () => {
    vi.mocked(getInvoice).mockResolvedValue({ deal_id: "d2", contract_id: null } as never);
    await expect(
      resolveNotificationTarget(tb("invoice_overdue", "invoice", "inv1"))
    ).resolves.toEqual({ kind: "deal", dealId: "d2", tab: "documents", invoiceId: "inv1" });
  });

  it("hoá đơn chỉ gắn hợp đồng → đi qua hợp đồng để lấy deal", async () => {
    vi.mocked(getInvoice).mockResolvedValue({ deal_id: null, contract_id: "c1" } as never);
    vi.mocked(getContract).mockResolvedValue({ deal_id: "d3" } as never);
    await expect(
      resolveNotificationTarget(tb("invoice_overdue", "invoice", "inv1"))
    ).resolves.toMatchObject({ kind: "deal", dealId: "d3", invoiceId: "inv1" });
  });

  it("lời nhắc về hoá đơn gửi hỏng → tab Nhắc nhở của deal, tô sáng đúng lời nhắc", async () => {
    vi.mocked(getReminder).mockResolvedValue({
      id: "r1",
      target_type: "invoice",
      target_id: "inv9",
    } as never);
    vi.mocked(getInvoice).mockResolvedValue({ deal_id: "d9", contract_id: null } as never);
    await expect(
      resolveNotificationTarget(tb("reminder_failed", "reminder", "r1"))
    ).resolves.toEqual({ kind: "deal", dealId: "d9", tab: "reminders", reminderId: "r1" });
  });

  it("lời nhắc về hợp đồng → deal của hợp đồng", async () => {
    vi.mocked(getReminder).mockResolvedValue({
      id: "r2",
      target_type: "contract",
      target_id: "c5",
    } as never);
    vi.mocked(getContract).mockResolvedValue({ deal_id: "d5" } as never);
    await expect(
      resolveNotificationTarget(tb("reminder_sent", "reminder", "r2"))
    ).resolves.toEqual({ kind: "deal", dealId: "d5", tab: "reminders", reminderId: "r2" });
  });

  it("lời nhắc về khách → trang khách", async () => {
    vi.mocked(getReminder).mockResolvedValue({
      id: "r3",
      target_type: "client",
      target_id: "cl1",
    } as never);
    await expect(
      resolveNotificationTarget(tb("reminder_due", "reminder", "r3"))
    ).resolves.toEqual({ kind: "client", clientId: "cl1" });
  });

  it("thông báo chờ duyệt KIỂU CŨ (không id) → lời nhắc chờ duyệt lâu nhất", async () => {
    vi.mocked(listReminders).mockResolvedValue([
      { id: "moi", requires_approval: true, scheduled_at: "2026-09-10T02:00:00Z", target_type: "deal", target_id: "dB" },
      { id: "da-duyet", requires_approval: false, scheduled_at: "2026-08-01T02:00:00Z", target_type: "deal", target_id: "dX" },
      { id: "cu", requires_approval: true, scheduled_at: "2026-08-20T02:00:00Z", target_type: "deal", target_id: "dA" },
    ] as never);

    await expect(
      resolveNotificationTarget(tb("reminder_drafted", "reminder", null))
    ).resolves.toEqual({ kind: "deal", dealId: "dA", tab: "reminders", reminderId: "cu" });
    expect(listReminders).toHaveBeenCalledWith({ status: "pending" });
  });

  it("kiểu cũ: lời nhắc lâu nhất thuộc deal ĐÃ XOÁ thì bỏ qua, lấy cái kế tiếp", async () => {
    vi.mocked(listReminders).mockResolvedValue([
      { id: "cua-deal-da-xoa", requires_approval: true, scheduled_at: "2026-07-01T02:00:00Z", target_type: "deal", target_id: "dXoa" },
      { id: "con-song", requires_approval: true, scheduled_at: "2026-08-01T02:00:00Z", target_type: "deal", target_id: "dSong" },
    ] as never);
    vi.mocked(getDeal).mockImplementation(async (id: string) => {
      if (id === "dXoa") throw { response: { status: 404 } };
      return {} as never;
    });

    await expect(
      resolveNotificationTarget(tb("reminder_drafted", "reminder", null))
    ).resolves.toEqual({ kind: "deal", dealId: "dSong", tab: "reminders", reminderId: "con-song" });
  });

  it("kiểu cũ mà không còn lời nhắc nào chờ duyệt → không đi đâu", async () => {
    vi.mocked(listReminders).mockResolvedValue([] as never);
    await expect(
      resolveNotificationTarget(tb("reminder_drafted", "reminder", null))
    ).resolves.toBeNull();
  });

  it("thứ được nhắc đã bị xoá thì ném lỗi để chuông báo cho người dùng", async () => {
    vi.mocked(getReminder).mockRejectedValue({ response: { status: 404 } });
    await expect(
      resolveNotificationTarget(tb("reminder_failed", "reminder", "r1"))
    ).rejects.toBeTruthy();
  });

  it("không có entity thì không đi đâu", async () => {
    await expect(resolveNotificationTarget(tb("intake_submitted", null, null))).resolves.toBeNull();
  });
});
