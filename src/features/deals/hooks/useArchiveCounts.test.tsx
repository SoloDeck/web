import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useArchiveCounts } from "@/features/deals/hooks/useArchiveCounts";
import { countArchivedDeals, countLostDeals } from "@/services/dealsService";

vi.mock("@/services/dealsService", () => ({
  countArchivedDeals: vi.fn(),
  countLostDeals: vi.fn(),
}));

/**
 * Kho lưu trữ có hai mục. Lối vào kho ở chân cột "Hoàn Thành" chỉ hiện khi con số > 0, nên nếu chỉ
 * đếm mục "Đã hoàn thành" thì freelancer chỉ có dự án không thành công sẽ không có lối nào vào kho.
 */

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useArchiveCounts", () => {
  it("tổng là cộng cả hai mục — chỉ có dự án không thành công vẫn thấy lối vào kho", async () => {
    vi.mocked(countArchivedDeals).mockResolvedValue(0);
    vi.mocked(countLostDeals).mockResolvedValue(3);
    const { wrapper } = setup();

    const { result } = renderHook(() => useArchiveCounts(), { wrapper });

    await waitFor(() => expect(result.current.total).toBe(3));
    expect(result.current.completed).toBe(0);
    expect(result.current.lost).toBe(3);
  });

  it("có dự án ở cả hai mục thì cộng lại", async () => {
    vi.mocked(countArchivedDeals).mockResolvedValue(12);
    vi.mocked(countLostDeals).mockResolvedValue(3);
    const { wrapper } = setup();

    const { result } = renderHook(() => useArchiveCounts(), { wrapper });

    await waitFor(() => expect(result.current.total).toBe(15));
  });

  it("chưa tải xong thì từng mục là undefined (không hiện số 0 giả) và tổng là 0", () => {
    vi.mocked(countArchivedDeals).mockReturnValue(new Promise(() => undefined));
    vi.mocked(countLostDeals).mockReturnValue(new Promise(() => undefined));
    const { wrapper } = setup();

    const { result } = renderHook(() => useArchiveCounts(), { wrapper });

    expect(result.current.completed).toBeUndefined();
    expect(result.current.lost).toBeUndefined();
    expect(result.current.total).toBe(0);
  });
});
