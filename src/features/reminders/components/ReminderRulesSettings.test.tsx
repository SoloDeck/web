import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ReminderRule } from "@/services/remindersService";

/**
 * Người dùng nêu: bật hết năm quy tắc thì "mở hết ra rối mắt" — mỗi cái bung thêm 3-4 hàng ô
 * nhập giống hệt nhau, muốn sửa giờ gửi của quy tắc thứ tư phải cuộn qua ba khối y hệt.
 *
 * Chốt cách chữa: gấp mở, mỗi lúc chỉ MỘT quy tắc mở phần cấu hình. Danh sách năm dòng luôn
 * thấy đủ để nhìn một cái là biết đang bật cái nào.  #Huynh
 */

const rulesState = vi.hoisted(() => ({ current: [] as ReminderRule[] }));
const patched = vi.hoisted(() => ({ calls: [] as unknown[] }));

vi.mock("@/features/reminders/hooks/useReminders", () => ({
  useReminderRules: () => ({ data: rulesState.current, isLoading: false, isError: false }),
  useUpdateReminderRule: () => ({
    mutate: (args: unknown) => patched.calls.push(args),
    isPending: false,
  }),
}));

vi.mock("@/features/profile/hooks/useZalo", () => ({
  useZaloStatus: () => ({ data: { connected: false } }),
}));

const { ReminderRulesSettings } = await import("./ReminderRulesSettings");

function rule(over: Partial<ReminderRule> = {}): ReminderRule {
  return {
    rule_type: "payment_overdue",
    label: "Nhắc lại khi hoá đơn đã quá hạn",
    is_enabled: true,
    offset_days: 3,
    repeat_every_days: null,
    supports_repeat: false,
    channel: "email",
    send_at_hour: 9,
    auto_send: false,
    message_template: "",
    template_variables: [],
    ...over,
  } as ReminderRule;
}

function rowOf(label: string): HTMLElement {
  return screen.getByText(label).closest("article") as HTMLElement;
}

describe("<ReminderRulesSettings /> — gấp mở", () => {
  it("quy tắc đang bật thì mặc định GẤP LẠI, không bung ô nhập ra sẵn", () => {
    rulesState.current = [
      rule({ rule_type: "payment_overdue", label: "Quá hạn" }),
      rule({ rule_type: "payment_due", label: "Tới hạn" }),
    ];
    render(<ReminderRulesSettings />);

    // Không có ô nhập số ngày nào hiện ra — đây là điều trước đây sai.
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("gấp lại vẫn cho biết đang đặt gì, khỏi phải mở ra mới thấy", () => {
    rulesState.current = [rule({ label: "Quá hạn", offset_days: 5, send_at_hour: 14 })];
    render(<ReminderRulesSettings />);

    // "5 ngày · gửi email cho khách · 14:00"
    expect(screen.getByText(/5 ngày/)).toBeInTheDocument();
    expect(screen.getByText(/14:00/)).toBeInTheDocument();
  });

  it("bấm tên thì mở cấu hình của đúng hàng đó", async () => {
    rulesState.current = [rule({ label: "Quá hạn" })];
    render(<ReminderRulesSettings />);

    await userEvent.click(screen.getByText("Quá hạn"));
    expect(within(rowOf("Quá hạn")).getByRole("spinbutton")).toBeInTheDocument();
  });

  it("mở hàng thứ hai thì hàng thứ nhất TỰ ĐÓNG — chỉ một cái mở", async () => {
    rulesState.current = [
      rule({ rule_type: "payment_overdue", label: "Quá hạn" }),
      rule({ rule_type: "payment_due", label: "Tới hạn" }),
    ];
    render(<ReminderRulesSettings />);

    await userEvent.click(screen.getByText("Quá hạn"));
    expect(within(rowOf("Quá hạn")).getByRole("spinbutton")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Tới hạn"));
    // Đây là điểm cốt lõi: mở cái mới thì cái cũ phải đóng, không cộng dồn thành cột dài.
    expect(within(rowOf("Quá hạn")).queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(within(rowOf("Tới hạn")).getByRole("spinbutton")).toBeInTheDocument();
  });

  it("bấm lại chính hàng đang mở thì gấp nó lại", async () => {
    rulesState.current = [rule({ label: "Quá hạn" })];
    render(<ReminderRulesSettings />);

    await userEvent.click(screen.getByText("Quá hạn"));
    await userEvent.click(screen.getByText("Quá hạn"));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("quy tắc đang TẮT thì không mở được — chưa bật thì chẳng có gì để cấu hình", async () => {
    rulesState.current = [rule({ label: "Quá hạn", is_enabled: false })];
    render(<ReminderRulesSettings />);

    expect(screen.getByText("Đang tắt")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Quá hạn"));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
