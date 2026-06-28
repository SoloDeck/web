import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { ProposalModal } from "./ProposalModal";
import type { Deal } from "@/features/deals/types";

const mockGenerateMutate = vi.fn();
const mockSendMutate = vi.fn();

vi.mock("@/features/deals/hooks/useProposals", () => ({
  useAiGenerateProposal: () => ({ mutate: mockGenerateMutate }),
  useSendProposal: () => ({ mutate: mockSendMutate, isPending: false }),
}));

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: () => ({ fullName: "Freelancer Test" }),
}));

vi.mock("@/services/dealsService", () => ({
  updateDealStage: vi.fn().mockResolvedValue({}),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

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

  it("shows loading state while AI is generating", () => {
    mockGenerateMutate.mockImplementation(() => {});
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    expect(screen.getByRole("status", { name: /đang tạo báo giá/i })).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText(/Thiết kế logo chuyên nghiệp/i)).toBeInTheDocument();
    });
  });

  it("shows toast.error when AI generation receives a client error", async () => {
    const { toast } = await import("sonner");
    mockGenerateMutate.mockImplementation((_payload: unknown, callbacks: { onError: (err: unknown) => void }) => {
      callbacks.onError({ response: { status: 400 } });
    });

    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Tạo báo giá thất bại (400). Vui lòng thử lại.");
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

  it("closes modal when close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProposalModal deal={makeDeal()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /đóng/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
