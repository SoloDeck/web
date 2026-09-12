import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceScreen } from "./WorkspaceScreen";
import type { Deal } from "@/features/deals/types";

/**
 * Màn hình chính hỏng thì phải NÓI RA.
 *
 * Kho deal rỗng là giá trị mặc định của store, nên khi `GET /deals` hỏng (mạng chập, token
 * hết hạn giữa chừng, backend 500) màn hình vẫn vẽ như thường: "0 deal · Tổng: 0 ₫" và năm
 * cột trống "Kéo dự án vào đây" — đúng giao diện của một tài khoản chưa có dự án nào. Người
 * dùng tin là toàn bộ deal và tiền của mình đã biến mất, mà không có nút nào để thử lại.
 *
 * Hook `useDeals` VỐN đã trả về `isError`; chỗ gọi chỉ lấy hai trường rồi bỏ nó.  #Huynh
 */

const deals: Deal[] = [];
let dealsState = { deals, isLoading: false, isError: false };

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useSearch: () => ({ tab: undefined }) }),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/features/deals/hooks/useDeals", () => ({
  dealKeys: { all: ["deals"] },
  useDeals: () => dealsState,
}));
vi.mock("@/services/dealsService", () => ({ countArchivedDeals: vi.fn().mockResolvedValue(0) }));
vi.mock("@/features/profile/hooks/useProfile", () => ({
  useProfile: () => ({ profile: {}, setProfile: vi.fn() }),
}));
vi.mock("@/features/profile/hooks/useSaveProfile", () => ({ useSaveProfile: () => vi.fn() }));
vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: (select: (state: { user: { role: string } }) => unknown) =>
    select({ user: { role: "freelancer" } }),
}));
vi.mock("@/features/ai/hooks/useAIActivityStore", () => ({
  useAIActivityStore: (select: (state: { openPanel: () => void }) => unknown) =>
    select({ openPanel: vi.fn() }),
}));

// Các màn con nặng — không liên quan tới thứ đang kiểm.
vi.mock("@/components/layout/Sidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/features/deals/components/KanbanBoard", () => ({
  KanbanBoard: () => <div>BẢNG KANBAN</div>,
}));
vi.mock("@/features/deals/components/ArchivedDealsDrawer", () => ({
  ArchivedDealsDrawer: () => null,
}));
vi.mock("@/features/deals/components/NewDealModal", () => ({ NewDealModal: () => null }));
vi.mock("@/features/ai/components/AIActivityCenter", () => ({ AIActivityCenter: () => null }));
vi.mock("@/features/profile/components/ProfileSettings", () => ({ ProfileSettings: () => null }));
vi.mock("@/features/clients/components/ClientRecords", () => ({ ClientRecords: () => null }));
vi.mock("@/features/revenue/components/RevenueDashboard", () => ({ RevenueDashboard: () => null }));
vi.mock("@/features/intake/components/IntakeFormConfig", () => ({ IntakeFormConfig: () => null }));
vi.mock("@/features/subscriptions/components/SubscriptionPage", () => ({
  SubscriptionPage: () => null,
}));
vi.mock("@/features/notifications/components/NotificationBell", () => ({
  NotificationBell: () => null,
}));

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WorkspaceScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  dealsState = { deals, isLoading: false, isError: false };
});

describe("<WorkspaceScreen /> — tải danh sách dự án hỏng", () => {
  it("nói rõ là KHÔNG TẢI ĐƯỢC, không bày bảng trống như tài khoản mới", () => {
    dealsState = { deals, isLoading: false, isError: true };
    renderScreen();

    expect(screen.getByText(/Không tải được danh sách dự án/i)).toBeInTheDocument();
    // Thứ gây hiểu nhầm chết người: con số 0 và bảng trống.
    expect(screen.queryByText(/0 deal/)).not.toBeInTheDocument();
    expect(screen.queryByText("BẢNG KANBAN")).not.toBeInTheDocument();
  });

  it("trấn an rằng dữ liệu còn nguyên, và cho một nút để thử lại", async () => {
    dealsState = { deals, isLoading: false, isError: true };
    renderScreen();

    expect(screen.getByText(/vẫn còn nguyên trên\s+máy chủ/i)).toBeInTheDocument();
    const nut = screen.getByRole("button", { name: /thử lại/i });
    await userEvent.click(nut);
    // Bấm được, không văng — việc tải lại do React Query lo.
    expect(nut).toBeInTheDocument();
  });

  it("tải bình thường thì vẫn vẽ bảng như cũ", () => {
    renderScreen();

    expect(screen.getByText("BẢNG KANBAN")).toBeInTheDocument();
    expect(screen.queryByText(/Không tải được danh sách dự án/i)).not.toBeInTheDocument();
  });
});
