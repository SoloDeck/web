import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { useDeleteDeal, useMarkDealLost } from "@/features/deals/hooks/useDeals";
import type { Deal } from "@/features/deals/types";
import * as dealsService from "@/services/dealsService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/dealsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/dealsService")>()),
  updateDealStage: vi.fn(),
  deleteDeal: vi.fn(),
}));

/**
 * "Loại bỏ dự án" đánh dấu dự án KHÔNG THÀNH CÔNG kèm lý do; "xóa vĩnh viễn" (chỉ ở mục Không thành
 * công của kho) bỏ hẳn nó. Cả hai đổi con số tiền và tỷ lệ thắng, nên phải làm mới số liệu — thiếu
 * bước đó thì trang doanh thu vẫn hiện "Còn phải thu" cũ cho tới khi tải lại.
 */

function deal(over: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    clientId: "c1",
    client: "Hoa Huynh",
    projectType: "Logo thương hiệu",
    value: 15_000_000,
    score: "warm",
    stage: "active",
    contact: "0900000000",
    channel: "Zalo",
    createdAt: "2026-09-01",
    notes: "",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [],
    tasks: [],
    ...over,
  };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

function invalidated(invalidate: ReturnType<typeof setup>["invalidate"], key: string[]): boolean {
  return invalidate.mock.calls.some(
    ([filters]) =>
      JSON.stringify((filters as { queryKey?: unknown }).queryKey) === JSON.stringify(key)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useDealStore.getState().reset();
  useDealStore.getState().hydrate([deal(), deal({ id: "d2", projectType: "Website" })]);
  vi.mocked(dealsService.updateDealStage).mockResolvedValue(deal({ stage: "lost" }));
  vi.mocked(dealsService.deleteDeal).mockResolvedValue(undefined);
});

describe("useMarkDealLost", () => {
  it("chuyển sang giai đoạn lost kèm lý do", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "Khách chọn bên khác" }));

    expect(dealsService.updateDealStage).toHaveBeenCalledWith("d1", "lost", "Khách chọn bên khác");
  });

  it("deal chuyển giai đoạn lost ngay trong store, deal khác không bị đụng tới", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "Khách im lặng" }));

    const stages = Object.fromEntries(useDealStore.getState().deals.map((d) => [d.id, d.stage]));
    expect(stages).toEqual({ d1: "lost", d2: "active" });
  });

  it("làm mới danh sách deal VÀ số liệu tiền (còn phải thu, tỷ lệ thắng)", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "Khách im lặng" }));

    expect(invalidated(invalidate, ["deals"])).toBe(true);
    expect(invalidated(invalidate, ["analytics"])).toBe(true);
  });

  it("báo thành công và nói dự án đã vào Kho lưu trữ", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "Khách im lặng" }));

    expect(toast.success).toHaveBeenCalledWith("Đã chuyển dự án vào Kho lưu trữ (không thành công).");
  });

  it("backend từ chối thì hiện đúng câu backend nói, deal ở yên giai đoạn cũ", async () => {
    vi.mocked(dealsService.updateDealStage).mockRejectedValue({
      response: {
        status: 422,
        data: { error: { message: "Vui lòng nhập lý do dự án không thành công." } },
      },
    });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "x" }).catch(() => undefined));

    expect(toast.error).toHaveBeenCalledWith("Vui lòng nhập lý do dự án không thành công.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(useDealStore.getState().deals.find((d) => d.id === "d1")?.stage).toBe("active");
    expect(invalidated(invalidate, ["analytics"])).toBe(false);
  });

  it("lỗi mạng không có câu của backend thì hiện câu dự phòng", async () => {
    vi.mocked(dealsService.updateDealStage).mockRejectedValue(new Error("Network Error"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useMarkDealLost(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "d1", reason: "x" }).catch(() => undefined));

    expect(toast.error).toHaveBeenCalledWith("Không thể loại bỏ dự án. Vui lòng thử lại.");
  });
});

describe("useDeleteDeal — xóa vĩnh viễn", () => {
  it("xóa đúng dự án, bỏ nó khỏi store và nói là xóa vĩnh viễn", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteDeal(), { wrapper });

    await act(() => result.current.mutateAsync("d1"));

    expect(dealsService.deleteDeal).toHaveBeenCalledWith("d1");
    expect(useDealStore.getState().deals.map((d) => d.id)).toEqual(["d2"]);
    expect(toast.success).toHaveBeenCalledWith("Đã xóa vĩnh viễn dự án.");
  });

  it("làm mới cả số liệu tiền: deal đã xóa không còn nằm trong tỷ lệ thắng và các số tiền", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteDeal(), { wrapper });

    await act(() => result.current.mutateAsync("d1"));

    expect(invalidated(invalidate, ["deals"])).toBe(true);
    expect(invalidated(invalidate, ["analytics"])).toBe(true);
  });

  it("xóa không được thì báo lỗi và giữ nguyên deal", async () => {
    vi.mocked(dealsService.deleteDeal).mockRejectedValue(new Error("boom"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteDeal(), { wrapper });

    await act(() => result.current.mutateAsync("d1").catch(() => undefined));

    expect(toast.error).toHaveBeenCalledWith("Không thể xóa dự án. Vui lòng thử lại.");
    expect(useDealStore.getState().deals.map((d) => d.id)).toEqual(["d1", "d2"]);
  });
});
