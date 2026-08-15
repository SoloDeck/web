import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import type React from "react";
import { ProposalModal } from "./ProposalModal";
import { useTermTemplates } from "@/features/deals/hooks/useTermTemplates";
import type { Deal } from "@/features/deals/types";

const mockProposalList = vi.fn(() => ({ data: undefined, isFetched: true }) as {
  data?: { data: unknown[] };
  isFetched: boolean;
});
const mockOpenPanel = vi.fn();
const mockGenerateMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockSendMutate = vi.fn();
const mockDownloadPdfMutate = vi.fn();

vi.mock("@/features/deals/hooks/useProposals", () => ({
  useAiGenerateProposal: () => ({ mutateAsync: mockGenerateMutate }),
  useCreateProposal: () => ({ mutate: mockCreateMutate }),
  useUpdateProposal: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useSendProposal: () => ({ mutate: mockSendMutate, isPending: false }),
  useDownloadProposalPdf: () => ({ mutate: mockDownloadPdfMutate, isPending: false }),
  // Chỉ dùng khi mở lại một báo giá ĐÃ có (existingProposalId). Các test ở đây đều là
  // luồng tạo mới nên không có dữ liệu.
  useProposal: () => ({ data: undefined, isLoading: false }),
  // Màn chọn đọc danh sách bản nháp của deal. Mặc định KHÔNG có bản nháp nào → modal đi
  // thẳng đường tự sinh (đúng như các test cũ mong đợi). Test riêng tự override.
  useProposalList: () => mockProposalList(),
}));

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: () => ({ fullName: "Freelancer Test" }),
}));

// Mặc định KHÔNG có mẫu điều khoản → modal đi thẳng đường tự sinh (đúng như các test này
// mong đợi). Test riêng cho màn chọn mẫu tự override mock này.
vi.mock("@/features/deals/hooks/useTermTemplates", () => ({
  useTermTemplates: vi.fn(),
}));

const noTemplates = { data: [], isFetched: true } as unknown as ReturnType<typeof useTermTemplates>;

vi.mock("@/services/dealsService", () => ({
  updateDealStage: vi.fn().mockResolvedValue({}),
}));

// Modal gọi thẳng hai hàm này (không qua hook): chốt giá ngay trước khi gửi, và tải bản xem
// trước do server render. Không mock thì test bắn axios thật.  #Huynh
vi.mock("@/services/proposalsService", () => ({
  setProposalPrice: vi.fn().mockResolvedValue({}),
  getProposalPreview: vi.fn().mockResolvedValue("<html><body>preview</body></html>"),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// Modal báo giá chạy nền: mặc định thu nhỏ, chỉ hiện khi viewRequestId === jobId.
// Mock store trả sẵn viewRequestId khớp job của deal-123 để test thấy được UI.
vi.mock("@/features/ai/hooks/useAIActivityStore", () => {
  const state = {
    upsertJob: vi.fn(),
    updateJob: vi.fn(),
    removeJob: vi.fn(),
    cancelJob: vi.fn(),
    requestView: vi.fn(),
    consumeViewRequest: vi.fn(),
    // Chọn một bản nháp ở màn chọn = mở lại chính panel này kèm proposalId.
    // Gọi vòng qua closure: factory của `vi.mock` chạy TRƯỚC khi các const ở đầu file được
    // khởi tạo (hoisting), tham chiếu thẳng `mockOpenPanel` là nổ ReferenceError.
    openPanel: (...args: unknown[]) => mockOpenPanel(...args),
    viewRequestId: "ai-proposal-deal-123",
  };
  return {
    useAIActivityStore: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-123",
    clientId: "client-1",
    client: "Nguyễn Văn A",
    projectType: "Thiết kế logo",
    value: 5_000_000,
    score: "warm",
    stage: "qualified",
    contact: "0901 234 567",
    channel: "Zalo",
    createdAt: "2026-06-23",
    notes: "",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ProposalModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mặc định mỗi test: không có mẫu → modal tự sinh. Test chọn-mẫu override sau.
    vi.mocked(useTermTemplates).mockReturnValue(noTemplates);
    // Mặc định: chưa có bản nháp nào cho deal này.
    mockProposalList.mockReturnValue({ data: undefined, isFetched: true });
  });

  it("returns null when deal is null", () => {
    const { container } = renderWithClient(<ProposalModal deal={null} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls aiGenerateProposal with a complete deal payload on mount", () => {
    // mutateAsync trả Promise; test này chỉ kiểm việc GỌI nên cho Promise treo (không resolve).
    mockGenerateMutate.mockImplementation(() => new Promise(() => {}));
    const deal = makeDeal();
    renderWithClient(<ProposalModal deal={deal} onClose={onClose} />);

    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-123",
        client_name: "Nguyễn Văn A",
        project_type: "Thiết kế logo",
      })
    );
  });

  it("shows loading state while AI is generating", async () => {
    mockGenerateMutate.mockImplementation(() => new Promise(() => {}));
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    expect(await screen.findByRole("status", { name: /đang tạo báo giá/i })).toBeInTheDocument();
    expect(screen.getByText(/AI đang soạn báo giá/i)).toBeInTheDocument();
  });

  it("có mẫu điều khoản thì hiện màn CHỌN trước, KHÔNG tự sinh ngay", async () => {
    // Admin có mẫu cho nghề này → phải cho freelancer chọn, không đốt lượt AI trước khi họ quyết.
    vi.mocked(useTermTemplates).mockReturnValue({
      data: [{ id: "tpl-1", name: "Mẫu điều khoản UX" }],
      isFetched: true,
    } as unknown as ReturnType<typeof useTermTemplates>);
    mockGenerateMutate.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    expect(await screen.findByText("AI tự viết")).toBeInTheDocument();
    expect(screen.getByText("Mẫu điều khoản UX")).toBeInTheDocument();
    // Chưa bấm "Tạo báo giá" thì chưa gọi AI.
    expect(mockGenerateMutate).not.toHaveBeenCalled();
  });

  it("có bản nháp thì màn chọn liệt kê ra, KHÔNG tự sinh bản mới", async () => {
    // Trước đây trang chi tiết tự nhét id bản nháp vào và nhảy thẳng vào bản đó — freelancer
    // không có đường ngó qua các bản nháp để chọn, cũng không có đường tạo bản mới khi đang
    // có nháp. Giờ mọi đường đều đi qua màn chọn.  #Huynh
    mockProposalList.mockReturnValue({
      data: {
        data: [
          {
            id: "proposal-draft-1",
            status: "draft",
            version_number: 2,
            created_at: "2026-07-27T10:00:00Z",
            content: { pricing: { total: 150_500_000, currency: "VND" } },
          },
        ],
      },
      isFetched: true,
    });
    mockGenerateMutate.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Bản nháp hiện ra ngay cả khi nghề này KHÔNG có mẫu điều khoản nào.
    const draftButton = await screen.findByRole("button", { name: /báo giá lần 2 · bản nháp/i });
    expect(draftButton).toBeInTheDocument();
    // Và tuyệt đối chưa đốt lượt AI nào.
    expect(mockGenerateMutate).not.toHaveBeenCalled();

    // Chọn bản nháp = mở lại chính panel này kèm proposalId — đi đúng đường "mở lại" có sẵn.
    await userEvent.setup().click(draftButton);
    expect(mockOpenPanel).toHaveBeenCalledWith({
      kind: "proposal_generation",
      dealId: "deal-123",
      proposalId: "proposal-draft-1",
    });
  });

  it("mở lại một bản nháp thì màn chọn phải BIẾN MẤT", async () => {
    // React tái dùng cùng component instance khi panel mở lại (cùng vị trí, cùng loại) nên
    // state `choosing` còn nguyên từ lần trước. Không tắt là màn chọn nằm đè lên bản nháp
    // vừa mở — bấm xong tưởng như không có gì xảy ra.  #Huynh
    mockProposalList.mockReturnValue({
      data: {
        data: [
          {
            id: "proposal-draft-1",
            status: "draft",
            version_number: 2,
            created_at: "2026-07-27T10:00:00Z",
            content: {},
          },
        ],
      },
      isFetched: true,
    });

    const { rerender } = renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);
    expect(await screen.findByRole("button", { name: /báo giá lần 2 · bản nháp/i })).toBeInTheDocument();

    // Đúng thứ AIJobViewer làm sau khi openPanel: cùng instance, thêm proposalId + nonce mới.
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ProposalModal
          deal={makeDeal()}
          onClose={onClose}
          existingProposalId="proposal-draft-1"
          openNonce={2}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /báo giá lần 2 · bản nháp/i })).toBeNull();
    });
  });

  it("hiện tờ báo giá do server dựng, không dựng lại bản riêng", async () => {
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          title: "Thiết kế logo chuyên nghiệp",
          executive_summary: "Dịch vụ thiết kế logo cao cấp.",
          scope_of_work: "Thiết kế 3 phương án logo.",
          pricing: { total: 5_000_000, currency: "VND", line_items: [] },
        },
      })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Không còn khối "Chỉnh sửa nội dung" riêng: câu chữ sửa THẲNG trên tờ báo giá. Nên thứ
    // phải kiểm ở tầng này là tờ báo giá đúng bản server dựng — cùng một template với PDF.
    // Việc bấm-gõ tại chỗ do `inlineEditPreview` lo và có test riêng, vì jsdom không dựng
    // hình nên không kiểm được bên trong iframe.  #Huynh
    const frame = await screen.findByTitle(/bấm vào chữ để sửa/i);
    await waitFor(() => {
      expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("preview"));
    });
  });

  it("AI vừa sinh xong báo giá CÓ khoảng giá thì KHÔNG được nói 'chưa chấm điểm'", async () => {
    // Dữ liệu THẬT lấy từ deal "Gym" của khách "Anh Ba Phi" (đã đo trong DB và qua
    // `GET /api/v1/proposals/{id}`): `pricing_detail.suggested = 450.000.000`, khoảng
    // 315tr–585tr. Backend tính đúng và trả về đủ — màn hình vẫn phán deal chưa được
    // chấm điểm, vì `triggerGenerate.onSuccess` quên ghi khối định giá vào state.  #Huynh
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          project_overview: "Ứng dụng di động cho phòng Gym.",
          scope_of_work: ["Thiết kế giao diện", "Phát triển tính năng chính"],
          deliverables: ["Ứng dụng chạy ổn định"],
          timeline: "12 tuần",
          pricing: "315.000.000 ₫ – 585.000.000 ₫ (đề xuất: 450.000.000 ₫)",
          payment_terms: "50% khi bắt đầu.",
          pricing_detail: {
            anchor: {
              value: 450_000_000,
              confidence: "low",
              source: "AI ước lượng giá thị trường",
              sample_size: 0,
            },
            factors: [],
            suggested: 450_000_000,
            range_min: 315_000_000,
            range_max: 585_000_000,
            line_items: [
              { label: "Thiết kế giao diện người dùng", weight_percent: 30, amount: 135_000_000 },
            ],
            warnings: [],
          },
        },
      })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Câu này chỉ được phép hiện khi THẬT SỰ không neo được giá (BE trả `pricing_detail:
    // null`). Hiện nó trong khi đang cầm 450 triệu là giao diện nói dối về TIỀN.
    await waitFor(() => {
      expect(screen.queryByText(/chưa được AI chấm điểm/i)).not.toBeInTheDocument();
    });
    // Và thanh giá phải hiện ra để freelancer chốt được giá.
    expect(await screen.findByText(/vì sao giá này/i)).toBeInTheDocument();
  });

  it("khu sửa tiền và tờ báo giá hiện CÙNG LÚC, không phải gập cái này mới thấy cái kia", async () => {
    // Lỗi user báo (27/07): mọi thứ xếp CHUNG MỘT CỘT DỌC, nên mở "Vì sao giá này?" hoặc panel
    // "Sửa chi phí & mốc thanh toán" là đẩy tờ báo giá xuống gần hết — phải gập lại mới review
    // được chính thứ vừa sửa. Giờ hai cột: khu quyết định bên trái (luôn mở, cuộn riêng), tờ
    // báo giá bên phải. Test này khoá đúng chỗ đó: KHÔNG click gì mà cả hai đều có mặt.  #Huynh
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          project_overview: "Ứng dụng di động cho phòng Gym.",
          pricing: "",
          payment_milestones: [
            { label: "Đặt cọc khi ký hợp đồng", percent: 50, amount: "", due: "Khi ký" },
            { label: "Thanh toán khi bàn giao", percent: 50, amount: "", due: "Khi nghiệm thu" },
          ],
          pricing_detail: {
            anchor: { value: 160_000_000, confidence: "medium", source: "Dự án đã chốt", sample_size: 2 },
            factors: [],
            suggested: 160_000_000,
            range_min: 128_000_000,
            range_max: 192_000_000,
            line_items: [{ label: "Tư vấn thiết kế", weight_percent: 100, amount: 160_000_000 }],
            warnings: [],
          },
        },
      })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Khu sửa tiền bày sẵn — không còn nút gập nào chắn trước. MỘT khu duy nhất từ khi mục 7
    // và 8 gộp làm một; thời điểm thu nằm ngay trên từng hạng mục.
    expect(await screen.findByText(/chi phí & thanh toán/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /thời điểm thu hạng mục 1/i })).toBeInTheDocument();
    // ...và tờ báo giá vẫn nằm đó cùng lúc, chứ không bị đẩy khỏi màn.
    expect(await screen.findByTitle(/bấm vào chữ để sửa/i)).toBeInTheDocument();
    // Nút gập cũ phải biến mất hẳn: còn nó là còn đường quay lại lỗi cũ.
    expect(screen.queryByRole("button", { name: /sửa chi phí/i })).toBeNull();
    // Báo giá này CÓ hạng mục nên khu soạn mốc % không được hiện — hai khu tiền tách nhau
    // chính là thứ đẻ ra cảnh panel nói một đằng, tờ giấy in một nẻo.
    expect(screen.queryByText(/mốc thanh toán \(báo giá cũ\)/i)).toBeNull();
  });

  it("tổng mốc thanh toán ≠ 100% thì KHÔNG gửi được cho khách", async () => {
    // Lỗi thật user báo (27/07): ba đợt 50% + 50% + 30% = 130% vẫn in ra tờ báo giá và vẫn
    // gửi được. Khách tự cộng ra 130% thì hoặc mình mất uy tín, hoặc cãi nhau lúc đòi tiền.
    // Backend cũng chặn — nút này chỉ là lớp lịch sự để biết trước lý do.  #Huynh
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          project_overview: "Phòng gym.",
          pricing: { total: 150_500_000, currency: "VND" },
          payment_milestones: [
            { label: "Đặt cọc khi ký hợp đồng", percent: 50 },
            { label: "Thanh toán khi bàn giao", percent: 50 },
            { label: "avc", percent: 30 },
          ],
        },
      })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    const sendButton = await screen.findByRole("button", { name: /mốc thanh toán đang 130%/i });
    expect(sendButton).toBeDisabled();
    // Và nói rõ lý do ngay trong panel sửa mốc, không bắt người dùng tự đoán.
    expect(screen.getByText(/dư 30%/i)).toBeInTheDocument();
  });

  it("tổng mốc đủ 100% thì gửi được bình thường", async () => {
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          project_overview: "Phòng gym.",
          pricing: { total: 150_500_000, currency: "VND" },
          payment_milestones: [
            { label: "Đặt cọc khi ký hợp đồng", percent: 50 },
            { label: "Thanh toán khi bàn giao", percent: 50 },
          ],
        },
      })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    const sendButton = await screen.findByRole("button", { name: /lưu & gửi cho khách hàng/i });
    expect(sendButton).toBeEnabled();
  });

  it("falls back to a manual draft when AI generation fails with a client error", async () => {
    mockGenerateMutate.mockImplementation(() => Promise.reject({ response: { status: 400 } }));

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Lỗi phía client (400) → không báo lỗi, mà tạo bản nháp thường để freelancer chỉnh tiếp.
    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ deal_id: "deal-123" }),
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });
  });

  it("StrictMode: phản hồi về SAU khi effect bị dọn — vòng xoay vẫn phải tắt", async () => {
    // Cảnh thật: request mất ~1,2s, nên phản hồi LUÔN về sau khi React (ở dev, StrictMode)
    // đã chạy xong effect → cleanup → effect. Mock cũ gọi `onSuccess` NGAY LẬP TỨC, tức là
    // trả lời trước cả khi cleanup kịp chạy — nên bộ test cũ mù hoàn toàn với lỗi này.
    //
    // Và mọi test khác đều render KHÔNG có StrictMode, trong khi app dev thì CÓ. Cleanup
    // của effect bật `cancelRef.current = true`, mà `onSuccess` mở đầu bằng
    // `if (cancelRef.current) return;` — trúng là vòng xoay quay vĩnh viễn dù dữ liệu đã
    // nằm sẵn trong trình duyệt.  #Huynh
    mockGenerateMutate.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ id: "proposal-456", content: { project_overview: "Xong." } }),
            // 300ms chứ không phải 20ms. Điều bài này kiểm là "phản hồi về SAU khi effect bị
            // dọn", 20ms vẫn thoả điều đó — nhưng khi chạy CẢ BỘ trên máy tải nặng thì
            // promise resolve xong trước cả lúc dòng `findByText` kịp chạy, nên test đỏ vì
            // không thấy vòng xoay chứ không phải vì lỗi thật. Đã đỏ ngẫu nhiên 2 lần.  #Huynh
            300
          )
        )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ProposalModal deal={makeDeal()} onClose={onClose} />
        </QueryClientProvider>
      </StrictMode>
    );

    expect(await screen.findByText(/AI đang soạn báo giá/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/AI đang soạn báo giá/i)).not.toBeInTheDocument();
    });
  });

  it("hết giờ chờ thì KHÔNG gọi lại — server có thể đã tạo xong bản nháp", async () => {
    const { toast } = await import("sonner");
    // Lỗi hết giờ chờ của axios không có `err.response` → không có status.
    mockGenerateMutate.mockImplementation(() =>
      Promise.reject({ code: "ECONNABORTED", message: "timeout of 60000ms exceeded" })
    );

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Gọi lại là tính tiền lần nữa và đẻ thêm một bản báo giá thứ hai — đúng lỗi "Tài liệu
    // cầm 2 bản" đã bị báo. Không biết server làm tới đâu thì phải HỎI, không được đoán.
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockGenerateMutate).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toMatch(/mở lại để kiểm tra/i);
  });

  it("5xx dai thì thử lại CÓ ĐIỂM DỪNG, không quay vòng vô tận", async () => {
    vi.useFakeTimers();
    try {
      mockGenerateMutate.mockImplementation(() => Promise.reject({ response: { status: 500 } }));

      renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);
      // Đẩy thời gian đi thật xa — nếu còn vòng lặp vô tận thì số lần gọi sẽ vọt lên.
      await vi.advanceTimersByTimeAsync(120_000);

      // Mỗi vòng đốt một lượt hạn mức AI và một khoản tiền thật. Trước đây không có điểm
      // dừng: hỏng dai là quay mãi, và chính nó làm cạn hạn mức tài khoản test.
      expect(mockGenerateMutate).toHaveBeenCalledTimes(3);
      // Hết lượt thì rơi về bản nháp thủ công, KHÔNG bỏ mặc người dùng với vòng xoay.
      expect(mockCreateMutate).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends the generated proposal and closes on success", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      })
    );
    // Gửi báo giá: lưu nội dung (updateDraft) rồi mới gọi send — nên updateDraft phải chạy onSuccess.
    mockUpdateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });
    mockSendMutate.mockImplementation((_id: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Gửi báo giá dính tới TIỀN và không lùi được — nút không gửi thẳng nữa mà mở hộp thoại
    // xác nhận, nhắc lại con số sắp gửi. Phải bấm xác nhận thì mới thật sự gửi.  #Huynh
    // Một hành động chính duy nhất: "Lưu & gửi cho khách hàng" → hộp thoại nhắc lại con số
    // → xác nhận. Không còn nút "Chốt giá này" riêng.  #Huynh
    await user.click(await screen.findByRole("button", { name: /lưu & gửi cho khách hàng/i }));
    await user.click(await screen.findByRole("button", { name: /^gửi\s/i }));

    expect(mockSendMutate).toHaveBeenCalledWith(
      "proposal-456",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
    expect(toast.success).toHaveBeenCalledWith("Đã gửi báo giá cho khách hàng.");
    expect(onClose).toHaveBeenCalled();
  });

  it("lưu nháp KHÔNG được làm rụng khoá nào của nội dung", async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: {
          project_overview: "Làm web bán cà phê.",
          scope_of_work: ["Dựng hệ thống"],
          deliverables: ["Hệ thống chạy ổn định", "Hướng dẫn sử dụng"],
          out_of_scope: ["Thiết kế lại logo"],
          valid_until: "2026-08-31",
          timeline: "8 tuần",
          pricing: "",
          payment_terms: "50% khi bắt đầu.",
          pricing_detail: null,
          pricing_items: [
            { label: "Dựng giao diện", amount: 30_000_000 },
            { label: "Nối thanh toán", amount: 20_000_000 },
          ],
        },
      })
    );
    mockUpdateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);
    await user.click(await screen.findByRole("button", { name: /tải pdf/i }));

    // Hai trường này TỪNG rụng âm thầm: `ProposalContentDTO` không có chỗ chứa chúng, nên
    // `normalizeProposalContentForApi` chuyển shape là mất luôn. AI soạn xong thì mục "6.
    // Sản Phẩm Bàn Giao" hiện đủ; sửa MỘT chữ rồi lưu là mục đó RỖNG trong bản gửi khách —
    // không có gì báo, vì backend đọc thiếu khoá thì trả danh sách rỗng chứ không nổ. Giờ
    // sửa câu chữ là gõ thẳng trên tờ báo giá nên lưu diễn ra liên tục, lỗi này sẽ dính vào
    // gần như mọi báo giá.  #Huynh
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          content: expect.objectContaining({
            deliverables: ["Hệ thống chạy ổn định", "Hướng dẫn sử dụng"],
            out_of_scope: ["Thiết kế lại logo"],
            // Lần thứ BA của cùng một cái bẫy (sau `pricing_detail` rồi `deliverables`):
            // DTO liệt kê từng khoá, khoá nào không có tên là bị vứt im lặng.
            valid_until: "2026-08-31",
            // Lần thứ TƯ, và là lần đã sập thật: hạng mục chi phí mục 7 kèm SỐ TIỀN
            // freelancer gõ tay. Không ai thấy vì backend thiếu khoá thì rơi về
            // `pricing_detail.line_items` chia lại theo giá chốt — trùng số y hệt chừng nào
            // freelancer chưa sửa. Gõ một ô tiền rồi lưu là số quay về như cũ, im lặng.
            pricing_items: [
              { label: "Dựng giao diện", amount: 30_000_000 },
              { label: "Nối thanh toán", amount: 20_000_000 },
            ],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it("lưu bản nháp TRƯỚC khi tải PDF", async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      })
    );
    mockUpdateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);
    await user.click(await screen.findByRole("button", { name: /tải pdf/i }));

    // BE render PDF từ nội dung ĐÃ LƯU trên server. Tải thẳng mà không lưu trước thì
    // người dùng nhận về bản PDF thiếu đúng phần họ vừa gõ trong editor.
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: "proposal-456" }),
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(mockDownloadPdfMutate).toHaveBeenCalledWith(
      // Tên khách "Nguyễn Văn A" phải được bỏ dấu để tên file không vỡ trên Windows.
      { proposalId: "proposal-456", filename: "bao-gia-nguyen-van-a.pdf" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it("bấm 'Thu nhỏ' rồi mở lại KHÔNG được vỡ", async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      })
    );

    const { container } = renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);
    await user.click(await screen.findByRole("button", { name: /thu nhỏ/i }));

    // "Thu nhỏ" đi qua `if (!deal || minimized) return null` — mọi hook PHẢI nằm trên câu đó.
    // Tôi từng khai hai `useRef` xuống dưới nó: bấm nút này là React chạy ít hook hơn lần
    // render trước và nổ trắng màn hình ("Rendered fewer hooks than expected"). Không test
    // nào bắt được, vì test cũ chỉ dựng modal với deal=null NGAY TỪ ĐẦU — số hook nhất quán
    // từ lần render đầu nên không có gì lệch. Lỗi chỉ hiện khi ĐANG mở rồi mới thu nhỏ.
    //  #Huynh
    expect(container).toBeEmptyDOMElement();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes modal when close button is clicked", async () => {
    const user = userEvent.setup();
    // Hoàn tất generate để hết trạng thái đang chạy — khi đó nút X mới đóng modal (không phải thu nhỏ).
    mockGenerateMutate.mockImplementation(() =>
      Promise.resolve({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      })
    );
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: /đóng/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
