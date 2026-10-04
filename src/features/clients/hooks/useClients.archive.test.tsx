import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateClient } from "@/features/clients/hooks/useClients";
import * as clientsService from "@/services/clientsService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/clientsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/clientsService")>()),
  updateClient: vi.fn(),
}));

/**
 * Lưu trữ khách kéo theo các dự án đang chạy của khách vào Kho lưu trữ (backend tự làm). Màn hình
 * chỉ thấy điều đó nếu danh sách dự án, kho và số liệu tiền được làm mới — thiếu bước này thì bảng
 * Kanban vẫn bày các dự án vừa bị đóng cho tới khi tải lại trang.
 */

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

function daLamMoi(invalidate: ReturnType<typeof setup>["invalidate"], key: string[]): boolean {
  return invalidate.mock.calls.some(
    ([filters]) =>
      JSON.stringify((filters as { queryKey?: unknown }).queryKey) === JSON.stringify(key)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clientsService.updateClient).mockResolvedValue({} as never);
});

describe("useUpdateClient — lưu trữ khách", () => {
  it("chuyển sang lưu trữ thì làm mới khách, dự án VÀ số liệu tiền", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: "c1",
        payload: { name: "Khách A", status: "archived" },
        archiving: true,
      })
    );

    expect(daLamMoi(invalidate, ["clients"])).toBe(true);
    expect(daLamMoi(invalidate, ["deals"])).toBe(true);
    expect(daLamMoi(invalidate, ["analytics"])).toBe(true);
  });

  it("báo rõ là các dự án đang chạy đã vào Kho lưu trữ", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: "c1",
        payload: { name: "Khách A", status: "archived" },
        archiving: true,
      })
    );

    expect(toast.success).toHaveBeenCalledWith(
      "Đã lưu trữ khách hàng. Các dự án đang chạy của khách đã chuyển vào Kho lưu trữ."
    );
  });

  it("sửa thông tin thường thì chỉ làm mới danh sách khách, không đụng dự án hay số tiền", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ id: "c1", payload: { name: "Tên mới", status: "prospect" } })
    );

    expect(daLamMoi(invalidate, ["clients"])).toBe(true);
    expect(daLamMoi(invalidate, ["deals"])).toBe(false);
    expect(daLamMoi(invalidate, ["analytics"])).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Đã cập nhật thông tin khách hàng.");
  });

  it("sửa ghi chú của khách ĐÃ lưu trữ (archiving=false) thì không báo 'đã lưu trữ' lần nữa", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: "c1",
        payload: { name: "Khách A", status: "archived", notes: "ghi chú" },
        archiving: false,
      })
    );

    expect(toast.success).toHaveBeenCalledWith("Đã cập nhật thông tin khách hàng.");
    expect(daLamMoi(invalidate, ["deals"])).toBe(false);
  });

  it("lưu trữ không được thì báo lỗi, không báo thành công", async () => {
    vi.mocked(clientsService.updateClient).mockRejectedValue(new Error("boom"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current
        .mutateAsync({ id: "c1", payload: { name: "A", status: "archived" }, archiving: true })
        .catch(() => undefined)
    );

    expect(toast.error).toHaveBeenCalledWith("Không thể cập nhật khách hàng. Vui lòng thử lại.");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
