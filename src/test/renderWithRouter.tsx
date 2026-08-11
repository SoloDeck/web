import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
} from "@tanstack/react-router";

type RenderLayoutRouteOptions = {
  /** Đường dẫn của route khung, ví dụ `/admin`. */
  layoutPath: string;
  layout: RouteComponent;
  /** Đường dẫn CON, tương đối với khung. `"/"` là route index. */
  childPaths: string[];
  /** URL bắt đầu, tuyệt đối, ví dụ `/admin/users`. */
  initialPath: string;
};

/**
 * Dựng một route KHUNG thật, chạy trên router bộ nhớ, kèm route con giả cho `<Outlet />`.
 *
 * Vì sao không mock `Link` như `LandingPage.test.tsx` đang làm: `Link` giả sẽ vẽ ra một
 * `<a href>` — mà `<a href>` trần CHÍNH LÀ con bug cần bắt (nó giao việc cho trình duyệt,
 * tải lại cả tài liệu). Test dựng trên mock kiểu đó vẫn xanh kể cả khi bản vá bị hoàn tác
 * sạch, tức là nó không kiểm được gì cả.
 *
 * `createMemoryHistory` thay cho history của jsdom: điều hướng diễn ra thật nhưng không
 * đụng `window.location` — jsdom sẽ ném "Not implemented: navigation" nếu bị đụng.
 *
 * Trả kèm `pathname()` để test khẳng định URL đã đổi TRONG ứng dụng.  #Huynh
 */
export async function renderLayoutRoute({
  layoutPath,
  layout,
  childPaths,
  initialPath,
}: RenderLayoutRouteOptions): Promise<RenderResult & { pathname: () => string }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: layoutPath,
    component: layout,
  });

  layoutRoute.addChildren(
    childPaths.map((childPath) =>
      createRoute({
        getParentRoute: () => layoutRoute,
        path: childPath,
        component: () => <div data-testid={`noi-dung:${childPath}`} />,
      }),
    ),
  );

  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  // Chờ router khớp xong route đầu tiên. Không có bước này thì `RouterProvider` render ra
  // rỗng ở lần đầu và mọi truy vấn `getByRole` đều trượt.
  await router.load();

  const result = render(
    <QueryClientProvider client={queryClient}>
      {/* Dự án không khai `interface Register` nên router dựng ở đây không cùng kiểu với
          router thật của app. Ép kiểu gọn ở ĐÚNG một chỗ này, thay vì rải ra mọi file test. */}
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );

  return { ...result, pathname: () => router.state.location.pathname };
}
