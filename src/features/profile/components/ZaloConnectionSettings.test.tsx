import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ZaloConnectionSettings } from "./ZaloConnectionSettings";
import { getZaloStatus, disconnectZalo } from "@/services/zaloService";
import type { ZaloStatus } from "@/services/zaloService";

vi.mock("@/services/zaloService", () => ({
  getZaloStatus: vi.fn(),
  getZaloConnectUrl: vi.fn(),
  disconnectZalo: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function status(overrides: Partial<ZaloStatus> = {}): ZaloStatus {
  return { connected: false, oa_id: null, mode: "mock", ...overrides };
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ZaloConnectionSettings />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());
beforeEach(() => {
  vi.mocked(disconnectZalo).mockResolvedValue(status({ connected: false }));
});

describe("<ZaloConnectionSettings />", () => {
  it("chưa kết nối (mock): hiện nút Kết nối + nhãn chế độ phát triển", async () => {
    vi.mocked(getZaloStatus).mockResolvedValue(status({ connected: false, mode: "mock" }));
    renderPanel();

    expect(await screen.findByRole("button", { name: /Kết nối Zalo OA/ })).toBeInTheDocument();
    expect(screen.getByText(/chế độ phát triển/)).toBeInTheDocument();
  });

  it("đã kết nối: hiện OA id + nút Ngắt kết nối, bấm thì gọi disconnect", async () => {
    vi.mocked(getZaloStatus).mockResolvedValue(
      status({ connected: true, oa_id: "mock-oa-000", mode: "mock" }),
    );
    renderPanel();

    expect(await screen.findByText(/Đã kết nối/)).toBeInTheDocument();
    expect(screen.getByText(/mock-oa-000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ngắt kết nối/ }));
    await waitFor(() => expect(disconnectZalo).toHaveBeenCalledTimes(1));
  });
});
