import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSaveProfile } from "@/features/profile/hooks/useSaveProfile";
import { DEFAULT_PROFILE } from "@/features/profile/types";

const mockUpdateMe = vi.fn();
const mockUpdateFreelancer = vi.fn();

vi.mock("@/services/usersService", () => ({
  updateMe: (...args: unknown[]) => mockUpdateMe(...args),
  updateFreelancerProfile: (...args: unknown[]) => mockUpdateFreelancer(...args),
  usersKeys: { me: ["users", "me"] as const },
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ updateUser: vi.fn() }),
}));

/** Lỗi đúng hình dạng envelope của backend, để `getApiError*` bóc được. */
function apiError(status: number, message?: string, details?: { field: string; message: string }[]) {
  return { response: { status, data: { error: { message, details } } } };
}

let qc: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function render() {
  return renderHook(() => useSaveProfile(vi.fn()), { wrapper });
}

describe("useSaveProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockUpdateMe.mockResolvedValue({});
    mockUpdateFreelancer.mockResolvedValue({});
  });

  it("lưu xong thì dọn cache ['users','me'] để link ngắn hiện ra ngay", async () => {
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = render();

    await result.current(DEFAULT_PROFILE);

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users", "me"] }),
    );
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("số điện thoại trùng thì báo đúng số điện thoại và DỪNG, không ghi tiếp", async () => {
    mockUpdateMe.mockRejectedValue(apiError(409, "Số 09xx đã có người dùng"));
    const { result } = render();

    await result.current(DEFAULT_PROFILE);

    expect(mockToastError).toHaveBeenCalledWith("Số 09xx đã có người dùng");
    // Dừng lại là có chủ đích: ghi tiếp thì hồ sơ lưu nửa vời mà người dùng không biết.
    expect(mockUpdateFreelancer).not.toHaveBeenCalled();
  });

  it("tên đường dẫn trùng thì KHÔNG được đổ cho số điện thoại", async () => {
    // Lượt ghi số điện thoại đã xong từ trước, nên 409 ở đây chỉ có thể là tên đường dẫn.
    mockUpdateFreelancer.mockRejectedValue(apiError(409));
    const { result } = render();

    await result.current(DEFAULT_PROFILE);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Tên đường dẫn"),
    );
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("Số điện thoại"));
  });

  it("422 thì lấy lời giải thích của đúng trường trong error.details", async () => {
    // `error.message` của 422 luôn là câu chung, chữ hữu ích chỉ nằm trong `details`.
    mockUpdateFreelancer.mockRejectedValue(
      apiError(422, "Request validation failed", [
        // Pydantic dán sẵn tiền tố "Value error, " — không được để nó lên màn hình.
        { field: "profile_slug", message: "Value error, 'login' là tên dành riêng cho hệ thống" },
      ]),
    );
    const { result } = render();

    await result.current(DEFAULT_PROFILE);

    expect(mockToastError).toHaveBeenCalledWith("'login' là tên dành riêng cho hệ thống");
  });

  it("lỗi mạng thì nói rõ là bản cục bộ vẫn còn", async () => {
    mockUpdateMe.mockRejectedValue(new Error("network down"));
    const { result } = render();

    await result.current(DEFAULT_PROFILE);

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("lưu cục bộ"));
  });
});
