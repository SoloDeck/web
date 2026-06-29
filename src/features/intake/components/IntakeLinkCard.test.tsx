import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntakeLinkCard } from "./IntakeLinkCard";
import { getMe } from "@/services/usersService";
import type { UserResponse } from "@/services/usersService";

vi.mock("@/services/usersService", () => ({ getMe: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeMe(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: "u1",
    email: "me@example.com",
    full_name: "Tôi",
    role: "freelancer",
    status: "active",
    phone: null,
    avatar_url: null,
    intake_share_token: "tok-abc123",
    created_at: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <IntakeLinkCard />
    </QueryClientProvider>,
  );
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<IntakeLinkCard />", () => {
  it("copies the public intake URL (containing the token) to the clipboard", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe({ intake_share_token: "tok-abc123" }));
    renderCard();

    const copyBtn = await screen.findByRole("button", { name: /Sao chép link/ });
    fireEvent.click(copyBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("/bieu-mau/tok-abc123");
  });

  it("shows a fallback (no copy button) when the token is null", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe({ intake_share_token: null }));
    renderCard();

    await waitFor(() => expect(getMe).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Sao chép link/ })).not.toBeInTheDocument();
  });
});
