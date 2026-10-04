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

/**
 * Công tắc "Tự động gửi, không cần tôi duyệt" đã bỏ khỏi MỌI quy tắc: lời nhắc do quy tắc tạo luôn
 * nằm chờ người dùng duyệt. Dữ liệu cũ còn trả `auto_send` cũng không được làm nó hiện lại.
 */
describe("<ReminderRulesSettings /> — không có công tắc 'Tự động gửi'", () => {
  const legacy = { auto_send: true } as unknown as Partial<ReminderRule>;

  it("cả năm quy tắc: mở ra đều không có công tắc 'Tự động gửi'", async () => {
    const types = [
      "proposal_follow_up",
      "contract_signing_nudge",
      "payment_due",
      "payment_overdue",
      "re_engagement",
    ] as const;
    rulesState.current = types.map((type, index) =>
      rule({ rule_type: type, label: `Quy tắc ${index + 1}` })
    );
    render(<ReminderRulesSettings />);

    for (let index = 1; index <= types.length; index++) {
      await userEvent.click(screen.getByText(`Quy tắc ${index}`));
      const row = rowOf(`Quy tắc ${index}`);
      expect(within(row).getByRole("spinbutton")).toBeInTheDocument(); // đúng là đang mở cấu hình
      expect(within(row).queryByText(/tự động gửi/i)).toBeNull();
      expect(within(row).queryByText(/không cần tôi duyệt/i)).toBeNull();
      expect(within(row).queryByLabelText(/tự động gửi/i)).toBeNull();
      // Chỉ còn đúng một công tắc: bật/tắt chính quy tắc đó.
      expect(within(row).getAllByRole("switch")).toHaveLength(1);
    }
  });

  it("dữ liệu cũ còn auto_send=true cũng không hiện '· tự gửi' ở dòng tóm tắt", () => {
    rulesState.current = [rule({ label: "Quá hạn", offset_days: 5, send_at_hour: 14, ...legacy })];
    render(<ReminderRulesSettings />);

    expect(screen.getByText("5 ngày · gửi email cho khách · 14:00")).toBeInTheDocument();
    expect(screen.queryByText(/tự gửi/i)).toBeNull();
  });

  it("mở quy tắc cũ còn auto_send=true cũng không có cảnh báo 'email sẽ gửi thẳng tới khách'", async () => {
    rulesState.current = [rule({ label: "Quá hạn", ...legacy })];
    render(<ReminderRulesSettings />);

    await userEvent.click(screen.getByText("Quá hạn"));

    expect(screen.queryByText(/gửi thẳng tới khách/i)).toBeNull();
    expect(screen.queryByText(/không kịp xem lại/i)).toBeNull();
  });

  it("lời giới thiệu nói rõ bạn luôn duyệt trước khi gửi", () => {
    rulesState.current = [rule()];
    render(<ReminderRulesSettings />);

    expect(screen.getByText(/Bạn luôn duyệt trước khi gửi/)).toBeInTheDocument();
    expect(screen.queryByText(/Mặc định bạn duyệt/)).toBeNull();
  });
});
