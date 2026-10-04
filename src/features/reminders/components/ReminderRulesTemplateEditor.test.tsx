import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ReminderRule } from "@/services/remindersService";

/**
 * Ô soạn nội dung mẫu: người dùng đọc `[Tên khách hàng]`, `[Tên dự án]` chứ không phải
 * `{client_name}`, `{deal_title}`; có dòng giải thích, nút chèn, và khung xem trước tô màu chỗ tự điền.
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

const variables = [
  { token: "{client_name}", label: "Tên khách hàng" },
  { token: "{deal_title}", label: "Tên dự án" },
];
const template = 'Chào anh/chị {client_name}, em gửi báo giá dự án "{deal_title}".';

function rule(over: Partial<ReminderRule> = {}): ReminderRule {
  return {
    rule_type: "proposal_follow_up",
    label: "Báo giá",
    is_enabled: true,
    offset_days: 3,
    repeat_every_days: null,
    supports_repeat: false,
    channel: "email",
    send_at_hour: 9,
    message_template: template,
    is_custom_template: false,
    template_variables: variables,
    ...over,
  } as ReminderRule;
}

async function openEditor(over: Partial<ReminderRule> = {}) {
  patched.calls.length = 0;
  rulesState.current = [rule(over)];
  render(<ReminderRulesSettings />);
  await userEvent.click(screen.getByText("Báo giá"));
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

describe("<ReminderRulesSettings /> — ô nội dung dùng chữ tiếng Việt", () => {
  it("ô hiện chữ tiếng Việt trong ngoặc vuông, không còn ngoặc nhọn hay tên kỹ thuật", async () => {
    const box = await openEditor();

    expect(box.value).toBe('Chào anh/chị [Tên khách hàng], em gửi báo giá dự án "[Tên dự án]".');
    expect(box.value).not.toMatch(/[{}]|client_name|deal_title/);
  });

  it("có dòng giải thích ngắn về ngoặc vuông và nút chèn ghi rõ là thông tin tự động", async () => {
    await openEditor();

    const huongDan = screen.getByText(/SoloDesk tự điền khi gửi/);
    expect(huongDan).toHaveTextContent("[ngoặc vuông]");
    expect(huongDan).toHaveTextContent("[Tên khách hàng]"); // ví dụ lấy từ chính biến của quy tắc
    expect(screen.getByText("Chèn thông tin tự động:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Tên khách hàng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Tên dự án" })).toBeInTheDocument();
  });

  it("khung xem trước điền thông tin mẫu và tô màu đúng chỗ tên khách, tên dự án", async () => {
    await openEditor();

    const preview = screen.getByTestId("template-preview");
    expect(preview).toHaveTextContent(
      'Chào anh/chị Nguyễn Văn An, em gửi báo giá dự án "Website bán hàng".'
    );
    const marks = Array.from(preview.querySelectorAll("mark"));
    expect(marks.map((m) => m.textContent)).toEqual(["Nguyễn Văn An", "Website bán hàng"]);
    expect(marks.map((m) => m.getAttribute("title"))).toEqual(["Tên khách hàng", "Tên dự án"]);
  });

  it("sửa chữ thì xem trước đổi theo ngay", async () => {
    const box = await openEditor();

    await userEvent.clear(box);
    await userEvent.type(box, "Hi [[Tên khách hàng]");

    expect(screen.getByTestId("template-preview")).toHaveTextContent("Hi Nguyễn Văn An");
  });

  it("gõ sai tên trong ngoặc thì xem trước giữ nguyên ngoặc — nhìn là biết chưa đúng", async () => {
    const box = await openEditor();

    await userEvent.clear(box);
    await userEvent.type(box, "Chào [[Tên khach]");

    const preview = screen.getByTestId("template-preview");
    expect(preview).toHaveTextContent("Chào [Tên khach]");
    expect(preview.querySelectorAll("mark")).toHaveLength(0);
  });

  it("bấm nút chèn thì chèn [Nhãn] đúng chỗ con trỏ", async () => {
    const box = await openEditor();

    box.setSelectionRange(0, 0);
    await userEvent.click(screen.getByRole("button", { name: "+ Tên dự án" }));

    expect(box.value.startsWith("[Tên dự án]Chào anh/chị")).toBe(true);
  });

  it("lưu thì gửi lên server dạng {biến}, KHÔNG gửi chữ tiếng Việt trong ngoặc vuông", async () => {
    const box = await openEditor();

    await userEvent.type(box, " Cảm ơn [[tên khách hàng].");
    await userEvent.click(screen.getByRole("button", { name: "Lưu nội dung" }));

    expect(patched.calls).toEqual([
      {
        ruleType: "proposal_follow_up",
        payload: {
          message_template:
            'Chào anh/chị {client_name}, em gửi báo giá dự án "{deal_title}". Cảm ơn {client_name}.',
        },
      },
    ]);
  });

  it("chưa sửa gì thì nút Lưu nội dung bị khóa (so ở dạng server, không bị lệch vì đổi chữ)", async () => {
    await openEditor();

    expect(screen.getByRole("button", { name: "Lưu nội dung" })).toBeDisabled();
  });

  it("server đổi nội dung (sau khi lưu hoặc khôi phục mặc định) thì ô vẫn hiện chữ tiếng Việt", async () => {
    patched.calls.length = 0;
    rulesState.current = [rule()];
    const { rerender } = render(<ReminderRulesSettings />);
    await userEvent.click(screen.getByText("Báo giá"));

    rulesState.current = [
      rule({ message_template: "Mẫu mới cho {client_name} về {deal_title}", is_custom_template: true }),
    ];
    rerender(<ReminderRulesSettings />);

    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(box.value).toBe("Mẫu mới cho [Tên khách hàng] về [Tên dự án]");
    expect(box.value).not.toMatch(/[{}]/);
    // Vừa đồng bộ xong thì không có gì chưa lưu.
    expect(screen.getByRole("button", { name: "Lưu nội dung" })).toBeDisabled();
  });

  it("quy tắc không có biến nào thì không hiện dòng giải thích hay nút chèn", async () => {
    await openEditor({ template_variables: [], message_template: "Chào bạn" });

    expect(screen.queryByText("Chèn thông tin tự động:")).toBeNull();
    expect(screen.queryByText(/SoloDesk tự điền khi gửi/)).toBeNull();
  });
});
