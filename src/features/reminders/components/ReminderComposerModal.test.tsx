import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReminderComposerModal } from "./ReminderComposerModal";
import { previewReminder, uploadReminderImage } from "@/services/remindersService";
import type { Deal } from "@/features/deals/types";

/**
 * Cửa sổ soạn lời nhắc — nơi freelancer duyệt một lá thư CÓ TIỀN trước khi nó đi ra ngoài.
 *
 * Hai thứ được chốt ở đây: (1) bản xem trước phải là thứ SERVER dựng, không phải bản frontend
 * tự vẽ; (2) giọng văn được truyền xuống AI, vì phiếu đòi chọn trang trọng/thân mật.  #Huynh
 */

const mockGenerate = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/services/remindersService", () => ({
  previewReminder: vi.fn(),
  uploadReminderImage: vi.fn(),
}));
vi.mock("@/features/ai/hooks/useFollowUp", () => ({
  useGenerateFollowUp: () => ({ mutate: mockGenerate, isPending: false }),
}));
vi.mock("@/features/reminders/hooks/useReminders", () => ({
  useCreateReminder: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateReminder: () => ({ mutate: vi.fn(), isPending: false }),
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
