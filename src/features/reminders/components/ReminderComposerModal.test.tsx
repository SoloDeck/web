import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReminderComposerModal } from "./ReminderComposerModal";
import {
  previewReminder,
  uploadReminderImage,
  type ReminderRecord,
} from "@/services/remindersService";
import type { Deal } from "@/features/deals/types";
import { toast } from "sonner";

/**
 * Cửa sổ soạn lời nhắc — nơi freelancer duyệt một lá thư CÓ TIỀN trước khi nó đi ra ngoài.
 *
 * Hai thứ được chốt ở đây: (1) bản xem trước phải là thứ SERVER dựng, không phải bản frontend
 * tự vẽ; (2) giọng văn được truyền xuống AI, vì phiếu đòi chọn trang trọng/thân mật.  #Huynh
 */

const mockGenerate = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/services/remindersService", () => ({
  previewReminder: vi.fn(),
  uploadReminderImage: vi.fn(),
}));
vi.mock("@/features/ai/hooks/useFollowUp", () => ({
  useGenerateFollowUp: () => ({ mutate: mockGenerate, isPending: false }),
}));
vi.mock("@/features/reminders/hooks/useReminders", () => ({
  useCreateReminder: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateReminder: () => ({ mutate: mockUpdate, isPending: false }),
}));
vi.mock("@/features/profile/hooks/useZalo", () => ({
  useZaloStatus: () => ({ data: { connected: false } }),
}));
vi.mock("@/features/profile/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      reminderChannel: "email",
      reminderHour: 9,
      bankCode: "",
      momoPhone: "",
    },
  }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const deal = {
  id: "deal-1",
  client: "Quán cà phê Nắng",
  projectType: "Website bán hàng",
} as unknown as Deal;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(previewReminder).mockResolvedValue({
    subject: "Nhắc thanh toán",
    html: "<p>Thư mẫu có 1027123456</p>",
    recipient: "khach@example.com",
  });
});

/**
 * Ô "Loại nhắc" giờ là <Select> dùng chung (base-ui), không còn là <select> thuần: danh
 * sách nằm trong portal và chỉ dựng ra sau khi bấm mở, nên `selectOptions` không dùng được
 * nữa. Phải mở rồi bấm đúng dòng, đúng như người dùng làm.
 */
async function chonLoaiNhac(
  user: ReturnType<typeof userEvent.setup>,
  nhanDong: string,
) {
  await user.click(screen.getByRole("combobox", { name: /loại nhắc/i }));
  const danhSach = await screen.findByRole("listbox");
  await user.click(within(danhSach).getByRole("option", { name: nhanDong }));
}

describe("<ReminderComposerModal />", () => {
  it("xem trước lấy từ SERVER, không phải frontend tự vẽ", async () => {
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    await waitFor(() => expect(previewReminder).toHaveBeenCalled(), { timeout: 3000 });
    const frame = await screen.findByTitle(/xem trước thư nhắc/i);
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("1027123456"));
  });

  it("đổi giọng thì AI được gọi kèm giọng đó", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Thân mật" }));
    await user.click(screen.getByRole("button", { name: /AI soạn tin/i }));

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "friendly", target_id: "deal-1" }),
      expect.anything(),
    );
  });

  it("bấm 'Dùng mẫu có sẵn' thì đổ mẫu vào ô nội dung", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    await chonLoaiNhac(user, "Nhắc thanh toán quá hạn");
    await user.click(screen.getByRole("button", { name: /dùng mẫu có sẵn/i }));

    // Mẫu quá hạn nói đúng việc, và KHÔNG tự viết số tài khoản — khối thanh toán do server
    // chèn, viết tay vào đây là hai nguồn dễ lệch nhau.
    // `getByRole("textbox")` không dùng được nữa: ô ngày (dd/mm/yyyy) cũng là textbox.
    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(box.value).toMatch(/quá hạn/i);
    expect(box.value).toContain("Quán cà phê Nắng");
  });

  it("đổi giọng thì CHỮ TRONG Ô ĐỔI NGAY, không phải chờ gọi AI", async () => {
    // Lỗi thật user báo: bấm "Trang trọng"/"Thân mật" mà nội dung không nhúc nhích gì —
    // trông như nút hỏng. Giọng phải thấy được ngay, không bắt chờ AI.  #Huynh
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    const before = box.value;
    expect(before).toMatch(/Kính gửi/); // mặc định là trang trọng

    await user.click(screen.getByRole("button", { name: "Thân mật" }));
    expect(box.value).not.toBe(before);
    expect(box.value).toMatch(/^Chào /);
  });

  it("đã gõ tay rồi thì đổi giọng KHÔNG xoá công của người dùng", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    await user.clear(box);
    await user.type(box, "Nội dung tôi tự viết");

    await user.click(screen.getByRole("button", { name: "Thân mật" }));
    expect(box.value).toBe("Nội dung tôi tự viết");
  });

  it("nhắc thanh toán mà thư chưa có cách trả tiền thì mách chèn ảnh QR", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    await chonLoaiNhac(user, "Nhắc thanh toán đến hạn");

    expect(screen.getByText(/chưa có thông tin chuyển khoản/i)).toBeInTheDocument();
  });

  it("ảnh chèn vào được gửi kèm sang XEM TRƯỚC — không phải nhìn một đằng gửi một nẻo", async () => {
    // Cả điểm của việc chèn ảnh là thấy trước mã QR nằm ở đâu trong thư. Nếu xem trước bỏ
    // qua `attachments` thì freelancer duyệt một lá thư không có QR rồi gửi đi lá có.  #Huynh
    const user = userEvent.setup();
    vi.mocked(uploadReminderImage).mockResolvedValue({
      key: "reminders/u1/qr.png",
      filename: "qr.png",
      content_type: "image/png",
    });
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(picker, new File(["x"], "qr.png", { type: "image/png" }));

    expect(await screen.findByText("qr.png")).toBeInTheDocument();
    await waitFor(
      () =>
        expect(previewReminder).toHaveBeenLastCalledWith(
          expect.objectContaining({
            attachments: [expect.objectContaining({ key: "reminders/u1/qr.png" })],
          }),
        ),
      { timeout: 3000 },
    );
  });

  it("bỏ ảnh ra thì lưu đi không còn ảnh đó", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadReminderImage).mockResolvedValue({
      key: "reminders/u1/qr.png",
      filename: "qr.png",
      content_type: "image/png",
    });
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(picker, new File(["x"], "qr.png", { type: "image/png" }));
    await screen.findByText("qr.png");

    await user.click(screen.getByRole("button", { name: /bỏ ảnh qr\.png/i }));
    await user.click(screen.getByRole("button", { name: /đặt lịch nhắc/i }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [] }),
      expect.anything(),
    );
  });
});

/**
 * Đóng cửa sổ soạn — nơi mất trắng công gõ.
 *
 * Người dùng chọn loại nhắc, chọn kênh, đặt ngày giờ, gõ nội dung, bấm AI soạn giúp, tải cả
 * ảnh QR chuyển khoản lên. Bấm trượt ra nền tối một cái là mất sạch, không một câu hỏi. Tệ
 * hơn: nút gắn nhãn "Thu nhỏ" — nhãn hứa nội dung vẫn còn — lại gọi đúng `onClose`, mà bên
 * gọi thì gỡ hẳn component nên mọi `useState` biến mất. Chưa bấm "Đặt lịch nhắc" thì không
 * có gì nằm trên máy chủ.  #Huynh
 */
describe("<ReminderComposerModal /> — đóng và thu nhỏ", () => {
  function nenToi(): HTMLElement {
    return document.querySelector(".fixed.inset-0") as HTMLElement;
  }

  it("bấm ra nền tối là THU NHỎ, không đóng và không mất nội dung", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReminderComposerModal deal={deal} onClose={onClose} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    await user.clear(box);
    await user.type(box, "Nội dung tôi tự viết");

    await user.click(nenToi());

    expect(onClose).not.toHaveBeenCalled();
    // Cửa sổ thu nhỏ lại nhưng vẫn còn đó — mở lại là chữ vẫn nguyên.
    await user.click(screen.getByRole("button", { name: /mở lại/i }));
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "Nội dung tôi tự viết",
    );
  });

  it("nút 'Thu nhỏ' đúng là thu nhỏ, không phải đóng trá hình", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReminderComposerModal deal={deal} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /thu nhỏ/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /mở lại/i })).toBeInTheDocument();
  });

  it("gõ dở mà bấm Đóng thì hỏi lại, nói rõ sẽ mất gì", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReminderComposerModal deal={deal} onClose={onClose} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    await user.clear(box);
    await user.type(box, "Nội dung tôi tự viết");

    await user.click(screen.getByRole("button", { name: /^đóng$/i }));

    expect(onClose).not.toHaveBeenCalled();
    const hopThoai = screen.getByRole("alertdialog");
    expect(hopThoai).toHaveTextContent(/sẽ mất/i);
    expect(hopThoai).toHaveTextContent(/chưa lưu gì cả/i);

    await user.click(within(hopThoai).getByRole("button", { name: /bỏ nội dung, đóng lại/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("quay lại soạn tiếp thì giữ nguyên chữ, không đóng", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReminderComposerModal deal={deal} onClose={onClose} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    await user.clear(box);
    await user.type(box, "Nội dung tôi tự viết");

    await user.click(screen.getByRole("button", { name: /^đóng$/i }));
    await user.click(screen.getByRole("button", { name: /quay lại soạn tiếp/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "Nội dung tôi tự viết",
    );
  });

  it("chưa gõ gì thì đóng luôn, đừng hỏi thừa", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReminderComposerModal deal={deal} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /^đóng$/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * Giờ hẹn khi SỬA lời nhắc. Lời nhắc quy tắc tự sinh nằm "Chờ bạn duyệt" thường đã quá giờ
 * hẹn; bản cũ luôn gửi lại giờ cũ nên backend từ chối, sửa một chữ cũng không lưu được.
 */
describe("<ReminderComposerModal /> — giờ hẹn", () => {
  const quaGio = {
    id: "rem-1",
    target_type: "deal",
    target_id: "deal-1",
    reminder_type: "payment_due",
    channel: "email",
    status: "pending",
    requires_approval: true,
    scheduled_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    message_preview: "Nội dung quy tắc soạn sẵn",
    attachments: [{ key: "reminders/u1/qr.png", filename: "qr.png", content_type: "image/png" }],
  } as unknown as ReminderRecord;

  it("sửa nội dung lời nhắc đã quá giờ mà không đổi giờ thì KHÔNG gửi giờ lên", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} reminder={quaGio} onClose={vi.fn()} />);

    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    await user.type(box, " — thêm một câu");
    await user.click(screen.getByRole("button", { name: /cập nhật lời nhắc/i }));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const { payload } = mockUpdate.mock.calls[0][0];
    expect(payload).not.toHaveProperty("scheduled_at");
    // Ảnh vẫn đi kèm — backend giờ nhận `attachments` khi sửa.
    expect(payload.attachments).toEqual(quaGio.attachments);
    // Không gửi thứ backend không cho sửa.
    expect(payload).not.toHaveProperty("reminder_type");
    expect(payload).not.toHaveProperty("target_id");
  });

  it("đổi sang một giờ tương lai thì gửi giờ mới", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} reminder={quaGio} onClose={vi.fn()} />);

    const ngay = screen.getByPlaceholderText("dd/mm/yyyy");
    await user.clear(ngay);
    await user.type(ngay, "01/01/2099");
    await user.click(screen.getByRole("button", { name: /cập nhật lời nhắc/i }));

    const { payload } = mockUpdate.mock.calls[0][0];
    expect(new Date(payload.scheduled_at).getFullYear()).toBe(2099);
  });

  it("đặt lịch mới vào giờ đã qua thì chặn ngay, không gọi API", async () => {
    const user = userEvent.setup();
    render(<ReminderComposerModal deal={deal} onClose={vi.fn()} />);

    const ngay = screen.getByPlaceholderText("dd/mm/yyyy");
    await user.clear(ngay);
    await user.type(ngay, "01/01/2020");

    expect(screen.getByText(/giờ này đã qua/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /đặt lịch nhắc/i }));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/đã qua/i));
  });

  it("đang sửa thì khoá ô Loại nhắc — backend không cho đổi loại", () => {
    render(<ReminderComposerModal deal={deal} reminder={quaGio} onClose={vi.fn()} />);
    const combobox = screen.getByRole("combobox", { name: /loại nhắc/i });
    expect(
      combobox.hasAttribute("disabled") || combobox.getAttribute("data-disabled") !== null,
    ).toBe(true);
  });
});
