import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { ProposalModal } from "./ProposalModal";
import type { Deal } from "@/features/deals/types";

const mockGenerateMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockSendMutate = vi.fn();
const mockDownloadPdfMutate = vi.fn();

vi.mock("@/features/deals/hooks/useProposals", () => ({
  useAiGenerateProposal: () => ({ mutate: mockGenerateMutate }),
  useCreateProposal: () => ({ mutate: mockCreateMutate }),
  useUpdateProposal: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useSendProposal: () => ({ mutate: mockSendMutate, isPending: false }),
  useDownloadProposalPdf: () => ({ mutate: mockDownloadPdfMutate, isPending: false }),
  // Chỉ dùng khi mở lại một báo giá ĐÃ có (existingProposalId). Các test ở đây đều là
  // luồng tạo mới nên không có dữ liệu.
  useProposal: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: () => ({ fullName: "Freelancer Test" }),
}));

vi.mock("@/services/dealsService", () => ({
  updateDealStage: vi.fn().mockResolvedValue({}),
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
  });

  it("returns null when deal is null", () => {
    const { container } = renderWithClient(<ProposalModal deal={null} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls aiGenerateProposal with a complete deal payload on mount", () => {
    const deal = makeDeal();
    renderWithClient(<ProposalModal deal={deal} onClose={onClose} />);

    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-123",
        client_name: "Nguyễn Văn A",
        project_type: "Thiết kế logo",
      }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it("shows loading state while AI is generating", async () => {
    mockGenerateMutate.mockImplementation(() => {});
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    expect(await screen.findByRole("status", { name: /đang tạo báo giá/i })).toBeInTheDocument();
    expect(screen.getByText(/AI đang soạn báo giá/i)).toBeInTheDocument();
  });

  it("renders draft content after successful generation", async () => {
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: (res: unknown) => void }) => {
      callbacks.onSuccess({
        id: "proposal-456",
        content: {
          title: "Thiết kế logo chuyên nghiệp",
          executive_summary: "Dịch vụ thiết kế logo cao cấp.",
          scope_of_work: "Thiết kế 3 phương án logo.",
          pricing: { total: 5_000_000, currency: "VND", line_items: [] },
        },
      });
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Tiêu đề báo giá hiện trong bản nháp (có thể lặp ở cả phần đầu và bảng hạng mục).
    await waitFor(() => {
      expect(screen.getAllByText(/Thiết kế logo chuyên nghiệp/i).length).toBeGreaterThan(0);
    });
  });

  it("falls back to a manual draft when AI generation fails with a client error", async () => {
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onError: (err: unknown) => void }) => {
      callbacks.onError({ response: { status: 400 } });
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    // Lỗi phía client (400) → không báo lỗi, mà tạo bản nháp thường để freelancer chỉnh tiếp.
    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ deal_id: "deal-123" }),
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });
  });

  it("sends the generated proposal and closes on success", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: (res: unknown) => void }) => {
      callbacks.onSuccess({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      });
    });
    // Gửi báo giá: lưu nội dung (updateDraft) rồi mới gọi send — nên updateDraft phải chạy onSuccess.
    mockUpdateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });
    mockSendMutate.mockImplementation((_id: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: /gửi báo giá/i }));

    expect(mockSendMutate).toHaveBeenCalledWith(
      "proposal-456",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
    expect(toast.success).toHaveBeenCalledWith("Đã gửi báo giá cho khách hàng.");
    expect(onClose).toHaveBeenCalled();
  });

  it("lưu bản nháp TRƯỚC khi tải PDF", async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: (res: unknown) => void }) => {
      callbacks.onSuccess({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      });
    });
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

  it("closes modal when close button is clicked", async () => {
    const user = userEvent.setup();
    // Hoàn tất generate để hết trạng thái đang chạy — khi đó nút X mới đóng modal (không phải thu nhỏ).
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: (res: unknown) => void }) => {
      callbacks.onSuccess({
        id: "proposal-456",
        content: { title: "Logo", pricing: { total: 5_000_000, currency: "VND" } },
      });
    });
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: /đóng/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
