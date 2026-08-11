import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

/**
 * Kiểm CÂY ROUTE THẬT trong `routeTree.gen.ts`.
 *
 * Vì sao cần: file đó mở đầu bằng `/* eslint-disable *\/` và `// @ts-nocheck`, nên
 * TypeScript lẫn ESLint đều bỏ qua hoàn toàn. Sửa sai trong đó KHÔNG có công cụ nào bắt —
 * nó chỉ lộ ra khi có người bấm thử đúng cái tab bị hỏng.
 *
 * Cái bẫy cụ thể mà bộ test này canh: route con dưới cha `/admin` phải khai `path` TƯƠNG
 * ĐỐI (`/plans`). Để nguyên `/admin/plans` thì URL thật trở thành `/admin/admin/plans` —
 * không lỗi build, không cảnh báo, chỉ 404 im lặng.  #Huynh
 */

vi.mock("@/features/auth/hooks/useAuthStore", () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      isAuthenticated: true,
      user: { id: "admin-1", email: "admin@solodesk.dev", role: "admin" },
    })),
  },
}));

async function matchRoute(pathname: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });
  await router.load();
  return {
    pathname: router.state.location.pathname,
    routeIds: router.state.matches.map((match) => match.routeId),
  };
}

beforeEach(() => {
  vi.mocked(useAuthStore.getState).mockReturnValue({
    isAuthenticated: true,
    user: { id: "admin-1", email: "admin@solodesk.dev", role: "admin" },
  } as unknown as ReturnType<typeof useAuthStore.getState>);
});

describe("cây route khu quản trị", () => {
  it.each([
    ["/admin/users", "/admin/users"],
    ["/admin/plans", "/admin/plans"],
    ["/admin/templates", "/admin/templates"],
    ["/admin/ai-config", "/admin/ai-config"],
    ["/admin/ai-costs", "/admin/ai-costs"],
    ["/admin/audit", "/admin/audit"],
  ])("%s khớp đúng route con, không nhân đôi tiền tố", async (input, expected) => {
    const { pathname, routeIds } = await matchRoute(input);

    expect(pathname).toBe(expected);
    expect(routeIds).toContain(expected);
  });

  it.each([
    "/admin/users",
    "/admin/plans",
    "/admin/templates",
    "/admin/ai-config",
    "/admin/ai-costs",
    "/admin/audit",
  ])("%s nằm DƯỚI khung /admin, không phải anh em ở gốc", async (input) => {
    const { routeIds } = await matchRoute(input);

    // Thiếu `/admin` trong chuỗi khớp nghĩa là route con vẫn treo ở gốc: khung không
    // render, `<Outlet />` rỗng, và thanh bên biến mất khỏi tab đó.
    expect(routeIds).toContain("/admin");
  });

  it("/admin có route index nên không ra khung rỗng", async () => {
    const { routeIds } = await matchRoute("/admin");

    expect(routeIds).toContain("/admin");
    expect(routeIds).toContain("/admin/");
  });

  it("/admin/ai-config tồn tại — trước đây file route rỗng nên tab này 404", async () => {
    const { routeIds } = await matchRoute("/admin/ai-config");

    expect(routeIds).toContain("/admin/ai-config");
  });

  it("người không phải admin bị chặn ở khung, không lọt vào tab con", async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      isAuthenticated: true,
      user: { id: "u-2", email: "freelancer@solodesk.dev", role: "freelancer" },
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    // `beforeLoad` giờ chỉ khai ở route cha. Nếu việc lồng route sai thì sáu tab con mất
    // luôn lớp gác này — trang quản trị hở cho freelancer mà không ai hay.
    const { pathname } = await matchRoute("/admin/users");

    expect(pathname).toBe("/");
  });

  it("chưa đăng nhập thì bị đá về trang giới thiệu", async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    const { pathname } = await matchRoute("/admin/plans");

    expect(pathname).toBe("/home");
  });
});
