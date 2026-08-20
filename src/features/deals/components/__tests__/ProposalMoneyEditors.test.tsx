import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LineItemsEditor } from "@/features/deals/components/ProposalMoneyEditors";
import { splitDeposit, type CostItem } from "@/features/deals/proposalHtml";

/**
 * Panel "Chi phí & Thanh toán (mục 7)".
 *
 * Hai thứ khoá ở đây, cùng sinh ra từ một lỗi thật: AI xếp hạng mục sai trình tự nghiệp vụ
 * (đặt "Phát triển ứng dụng" TRƯỚC "Thiết kế giao diện"), mà bản cũ vừa không cho đổi thứ tự,
 * vừa lấy VỊ TRÍ làm khoản cọc — nên kể cả có kéo được thì kéo một cái là dòng tiền nhảy theo.
 *
 * dnd-kit được giả lập theo đúng khuôn `TaskKanban.test.tsx`: jsdom không canh được hình học
 * nên thao tác kéo thật phải kiểm bằng Playwright, ở đây chỉ kiểm phần tách hàng và dựng cây.
 */

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  closestCenter: () => [],
  useSensor: () => undefined,
  useSensors: () => [],
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: <T,>(list: T[], from: number, to: number) => {
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  },
  sortableKeyboardCoordinates: () => undefined,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

const AGREED = 156_000_000;

const ROWS: CostItem[] = [
  { id: "a", label: "Phát triển ứng dụng di động", amount: 62_500_000 },
  { id: "b", label: "Tích hợp chức năng đặt lịch", amount: 47_000_000 },
  { id: "c", label: "Thiết kế giao diện người dùng", amount: 46_500_000 },
];

const WITH_DEPOSIT = splitDeposit(ROWS, AGREED, 30);

function renderEditor(items: CostItem[]) {
  const onChange = vi.fn();
  render(<LineItemsEditor items={items} agreedTotal={AGREED} onChange={onChange} />);
  return onChange;
}

describe("LineItemsEditor — hàng phí trả trước", () => {
  it("hiện tỷ lệ và số tiền của khoản cọc", () => {
    renderEditor(WITH_DEPOSIT);
    expect(screen.getByLabelText("Tỷ lệ trả trước")).toHaveValue("30");
    expect(screen.getByLabelText("Số tiền trả trước")).toHaveValue("46.800.000");
  });

  it("hàng cọc KHÔNG có tay nắm kéo — nó phải luôn đứng đầu bảng", () => {
    renderEditor(WITH_DEPOSIT);
    // Ba hạng mục thường mới có tay nắm; hàng cọc nằm ngoài vùng kéo thả.
    expect(screen.getAllByTitle("Kéo để đổi vị trí")).toHaveLength(3);
  });

  it("hàng cọc không có ô chọn thời điểm thu — luôn là khi ký hợp đồng", () => {
    renderEditor(WITH_DEPOSIT);
    // Chỉ 3 ô chọn, đúng bằng số hạng mục thường.
    expect(screen.getAllByLabelText(/^Thời điểm thu hạng mục/)).toHaveLength(3);
  });

  it("gõ tỷ lệ thì giãn lại cả bảng mà tổng vẫn khớp giá chào", () => {
    const onChange = renderEditor(WITH_DEPOSIT);
    fireEvent.change(screen.getByLabelText("Tỷ lệ trả trước"), { target: { value: "50" } });

    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next[0].amount).toBe(78_000_000);
    expect(next.reduce((sum, row) => sum + row.amount, 0)).toBe(AGREED);
  });

  it("gõ số tiền ra đúng con số đó, không bị nắn đi vài nghìn", () => {
    // Lỗi đã dính khi làm: quy tiền → tỷ lệ mà làm tròn 2 chữ số thì với giá 156 triệu, gõ
    // 50.000.000 lại ra 49.998.000.
    const onChange = renderEditor(WITH_DEPOSIT);
    fireEvent.change(screen.getByLabelText("Số tiền trả trước"), {
      target: { value: "50.000.000" },
    });

    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next[0].amount).toBe(50_000_000);
    expect(next.reduce((sum, row) => sum + row.amount, 0)).toBe(AGREED);
  });

  it("bỏ cọc là XOÁ hàng chứ không đặt 0 đ", () => {
    // Đặt 0 đ thì cổng gửi báo giá chặn ("mỗi hạng mục là một đợt thu tiền"), deal kẹt.
    const onChange = renderEditor(WITH_DEPOSIT);
    fireEvent.click(screen.getByLabelText("Bỏ phí trả trước"));

    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next.some((row) => row.is_deposit)).toBe(false);
    expect(next.reduce((sum, row) => sum + row.amount, 0)).toBe(AGREED);
  });

  it("xoá trắng ô tỷ lệ KHÔNG làm mất hàng cọc", () => {
    // Lỗi người dùng báo: xoá hết chữ trong ô là ô nhập biến mất luôn. Vì mỗi phím gõ đều
    // tính lại ngay, mà tỷ lệ 0 nghĩa là "bỏ cọc" nên hàng bị gỡ giữa lúc đang nhập.
    const onChange = renderEditor(WITH_DEPOSIT);
    fireEvent.change(screen.getByLabelText("Tỷ lệ trả trước"), { target: { value: "" } });

    // Không đẩy thay đổi nào ra ngoài → hàng cọc còn nguyên.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tỷ lệ trả trước")).toBeInTheDocument();
  });

  it("gõ từng chữ số vào ô tiền KHÔNG làm mất hàng cọc giữa chừng", () => {
    // Gõ "50000000" thì ký tự đầu là 5 đồng — làm tròn về 0 và hàng biến mất, nên người dùng
    // gõ được đúng một ký tự rồi ô tự đóng.
    const onChange = renderEditor(WITH_DEPOSIT);
    const box = screen.getByLabelText("Số tiền trả trước");

    fireEvent.change(box, { target: { value: "" } });
    fireEvent.change(box, { target: { value: "5" } });
    fireEvent.change(box, { target: { value: "50" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Số tiền trả trước")).toBeInTheDocument();

    // Tới khi gõ đủ số thật thì mới áp dụng.
    fireEvent.change(box, { target: { value: "50000000" } });
    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next.find((row) => row.is_deposit)!.amount).toBe(50_000_000);
    expect(next.reduce((sum, row) => sum + row.amount, 0)).toBe(AGREED);
  });

  it("gõ 0 vào ô tỷ lệ cũng không bỏ cọc — muốn bỏ thì bấm nút xoá", () => {
    const onChange = renderEditor(WITH_DEPOSIT);
    fireEvent.change(screen.getByLabelText("Tỷ lệ trả trước"), { target: { value: "0" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rời ô khi đang gõ dở thì hiện lại đúng số đang có, không mất tiền", () => {
    renderEditor(WITH_DEPOSIT);
    const box = screen.getByLabelText("Số tiền trả trước");
    fireEvent.change(box, { target: { value: "5" } });
    fireEvent.blur(box);
    expect(box).toHaveValue("46.800.000");
  });

  it("không có cọc thì mời bật lại và nói rõ hậu quả", () => {
    renderEditor(ROWS);
    expect(screen.getByText(/Thêm phí trả trước 30%/)).toBeInTheDocument();
    expect(screen.getByText(/làm xong mới nhận được đồng đầu tiên/)).toBeInTheDocument();
  });

  it("chưa chốt giá thì khoá nút thêm cọc, không để nó bấm hụt", () => {
    // Không có giá thì không tính ra được đồng nào — nút sẽ bấm mà không xảy ra gì, người
    // dùng tưởng bấm trượt rồi bấm lại mấy lần.
    const onChange = vi.fn();
    render(<LineItemsEditor items={ROWS} agreedTotal={0} onChange={onChange} />);
    expect(screen.getByText(/Thêm phí trả trước 30%/).closest("button")).toBeDisabled();
  });
});

describe("LineItemsEditor — thời điểm thu của hạng mục thường", () => {
  /**
   * Ô chọn thời điểm thu giờ là <Select> dùng chung (base-ui): nó là một nút, danh sách nằm
   * trong portal và chỉ dựng ra sau khi bấm mở. Không còn <option> nào để đọc thẳng từ DOM
   * như thời <select> thuần — phải mở ra xem rồi đóng lại.
   */
  async function optionsOfRow(index: number): Promise<string[]> {
    const trigger = screen.getAllByLabelText(/^Thời điểm thu hạng mục/)[index];
    await userEvent.click(trigger);
    const danhSach = await screen.findByRole("listbox");
    const nhan = within(danhSach)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    // Đóng lại: mỗi test đọc nhiều hàng, để hở một danh sách là hàng sau tìm nhầm.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    return nhan;
  }

  it('không còn mời chọn "Khi ký hợp đồng" — khoản thu trước đã có hàng riêng', async () => {
    // Để lựa chọn này ở đây nữa là hai đường làm cùng một việc: freelancer đặt hai hạng mục
    // "khi ký" thì tờ báo giá có hai khoản đòi trước mà không dòng nào tên là tạm ứng.
    renderEditor(WITH_DEPOSIT);
    expect(await optionsOfRow(0)).toEqual(["Khi hoàn thành hạng mục", "Khác…"]);
  });

  it("báo giá CŨ đang để khi ký hợp đồng thì vẫn hiện, không âm thầm đổi", async () => {
    // Báo giá sinh dưới luật cũ ("hạng mục đầu mặc định thu khi ký") vẫn còn trong kho. Bỏ
    // hẳn khỏi danh sách là ô chọn hiện trống, rồi chạm vào một cái là đổi thời điểm thu của
    // một khoản tiền mà không ai chủ ý.
    const legacy: CostItem[] = [
      { id: "a", label: "Giai đoạn 1", amount: 100_000_000, due_type: "on_signing" },
      { id: "b", label: "Giai đoạn 2", amount: 56_000_000 },
    ];
    renderEditor(legacy);

    expect(await optionsOfRow(0)).toContain("Khi ký hợp đồng");
    // Ô chọn phải BÀY RA nhãn tiếng Việt của giá trị đang giữ. Đọc `.value` không còn nghĩa
    // gì (nó là một cái nút), mà thứ người dùng thấy mới là thứ cần khoá: hiện trống hay
    // hiện "on_signing" đều là mất dấu một khoản tiền.
    expect(screen.getAllByLabelText(/^Thời điểm thu hạng mục/)[0]).toHaveTextContent(
      "Khi ký hợp đồng",
    );
    // Hạng mục không dính luật cũ thì vẫn không được mời chọn.
    expect(await optionsOfRow(1)).toEqual(["Khi hoàn thành hạng mục", "Khác…"]);
  });
});

describe("LineItemsEditor — đổi thứ tự", () => {
  it("mỗi hạng mục thường có một tay nắm riêng", () => {
    renderEditor(ROWS);
    expect(screen.getAllByTitle("Kéo để đổi vị trí")).toHaveLength(3);
  });

  it("sửa hạng mục định vị theo ID chứ không theo vị trí", () => {
    // Chỗ vỡ THẬT: khi có hàng cọc, hạng mục thường thứ n nằm ở vị trí n+1 của mảng đầy đủ.
    // Định vị theo vị trí là lệch đúng một dòng — sửa hạng mục đầu thì trúng vào khoản cọc.
    const onChange = renderEditor(WITH_DEPOSIT);

    fireEvent.change(screen.getByLabelText("Số tiền hạng mục 1"), {
      target: { value: "1.000.000" },
    });

    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next.find((row) => row.id === "a")!.amount).toBe(1_000_000);
    // Khoản cọc KHÔNG được đụng tới.
    expect(next.find((row) => row.is_deposit)!.amount).toBe(46_800_000);
  });

  it("xoá hạng mục cũng bám theo ID, không xoá nhầm khoản cọc", () => {
    const onChange = renderEditor(WITH_DEPOSIT);

    fireEvent.click(screen.getAllByLabelText("Xoá hạng mục")[0]);

    const next: CostItem[] = onChange.mock.calls.at(-1)![0];
    expect(next.some((row) => row.is_deposit)).toBe(true);
    expect(next.filter((row) => !row.is_deposit).map((row) => row.id)).toEqual(["b", "c"]);
  });

  it("còn đúng một hạng mục thì không cho xoá nốt", () => {
    renderEditor([ROWS[0]]);
    expect(screen.getByLabelText("Xoá hạng mục")).toBeDisabled();
  });
});
