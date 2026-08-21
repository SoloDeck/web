import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";

import { getRouter } from "./router";

/**
 * Điểm vào cho bước dựng sẵn HTML — chỉ chạy trong Node lúc build, KHÔNG vào gói của
 * trình duyệt (xem `scripts/prerender.ts`).
 *
 * Dựng qua router thật thay vì render trần từng component: `/login` và `/home` đều có
 * `<Link>`, mà `Link` đọc context của router — thiếu context là ném lỗi ngay. Đi qua
 * router cũng có nghĩa HTML dựng sẵn khớp đúng thứ React sẽ dựng lại lúc hydrate.
 *
 * Router mới cho MỖI đường dẫn: router giữ trạng thái đường dẫn hiện tại, dùng lại một
 * instance cho ba route thì route sau đọc phải state của route trước.
 *
 * KHÔNG bọc `Providers`: nó kéo theo `ReactQueryDevtools` và `Toaster` — hai thứ chỉ có
 * việc ở trình duyệt và không đóng góp chữ nào cho crawler. Ba trang được dựng sẵn cũng
 * không có `useQuery` nào cần chạy.
 */
export async function renderRoute(url: string): Promise<string> {
  const router = getRouter(createMemoryHistory({ initialEntries: [url] }));
  await router.load();

  return renderToString(
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>,
  );
}
