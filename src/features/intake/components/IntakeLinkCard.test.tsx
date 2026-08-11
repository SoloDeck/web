import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntakeLinkCard } from "./IntakeLinkCard";
import { getMe } from "@/services/usersService";
import type { UserResponse } from "@/services/usersService";

vi.mock("@/services/usersService", () => ({
  getMe: vi.fn(),
  usersKeys: { me: ["users", "me"] as const },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeMe(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: "u1",
    email: "me@example.com",
    full_name: "Tôi",
    role: "freelancer",
    status: "active",
    payment_info: {
      bank_code: null,
      bank_account_number: null,
      bank_account_holder: null,
      momo_phone_number: null,
      bank_account_info: null,
    },
    reminder_defaults: {
      reminder_signature: null,
      reminder_default_channel: null,
      reminder_default_hour: null,
    },
    phone: null,
    avatar_url: null,
    bio: null,
    professional_title: null,
    cover_url: null,
    brand_color: null,
    profile_slug: null,
    profession: null,
    has_password: true,
    intake_share_token: "tok-abc123",
    professional_profile: {
      skills: null,
      specialization: null,
      default_hourly_rate: null,
      currency: "VND",
      portfolio_url: null,
      business_name: null,
    },
    preferences: {
      locale: "vi",
      timezone: "Asia/Ho_Chi_Minh",
      notification_channel: "email",
      theme: "light",
    },
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
  it("chưa đặt tên riêng thì đưa link token của trang công khai", async () => {
    // Đây là chỗ DUY NHẤT trong app lộ link trang công khai — bỏ danh bạ rồi thì không còn
    // đường nào khác để freelancer lấy link của chính mình.
    vi.mocked(getMe).mockResolvedValue(
      makeMe({ intake_share_token: "tok-abc123", profile_slug: null }),
    );
    renderCard();

    const buttons = await screen.findAllByRole("button", { name: /Sao chép link/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0] as string).toContain("/ho-so/tok-abc123");
  });

  it("đã đặt tên riêng thì CHỈ đưa link ngắn, không bày kèm link dài", async () => {
    // Hai link cạnh nhau cho cùng một trang chỉ bắt người dùng chọn giữa hai thứ y hệt nhau.
    // Link dài vẫn chạy song song ở backend, chỉ là không cần hiện ra.
    vi.mocked(getMe).mockResolvedValue(
      makeMe({ intake_share_token: "tok-abc123", profile_slug: "thu-thuy" }),
    );
    renderCard();

    const buttons = await screen.findAllByRole("button", { name: /Sao chép link/ });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0] as string).toMatch(/\/thu-thuy$/);
    expect(screen.queryByDisplayValue(/\/ho-so\//)).not.toBeInTheDocument();
  });

  it("shows a fallback (no copy button) when the token is null", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe({ intake_share_token: null }));
    renderCard();

    await waitFor(() => expect(getMe).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Sao chép link/ })).not.toBeInTheDocument();
  });
});
