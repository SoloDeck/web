/**
 * Dựng sẵn HTML cho ba đường dẫn tĩnh, chạy NGAY SAU `vite build`.
 *
 * Vì sao cần: đây là SPA dựng hoàn toàn bằng JS, nên thứ máy chủ trả về cho mọi đường dẫn
 * là một `<div id="root">` rỗng. Googlebot có chạy JS nhưng xếp việc đó vào hàng đợi riêng
 * và làm sau; bộ xem trước link của Zalo/Facebook/Slack thì không chạy JS bao giờ. Cả hai
 * đều cần chữ có sẵn trong HTML.
 *
 * Cách ghi: mỗi đường dẫn ra một thư mục có `index.html` (`dist/home/index.html`), khớp
 * đúng `try_files $uri $uri/ /index.html` sẵn có của nginx — không phải sửa gì thêm ở khối
 * `location`. Gói JS vẫn nạp bình thường sau đó và hydrate lại toàn bộ ứng dụng, nên người
 * dùng thật không mất tương tác nào.
 *
 * KHÔNG dựng sẵn `/{slug}`: dữ liệu đổi theo từng freelancer và thay đổi sau mỗi lần sửa
 * hồ sơ, nên bản đó do backend dựng lúc có yêu cầu (`/internal/render/profile/{slug}`).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SSR_ENTRY = path.join(ROOT, "dist-ssr", "entry-server.js");

const ROUTES = ["/home", "/login", "/register"];

/**
 * React 19 tự đưa `<title>`, `<meta>` và `<link>` lên ĐẦU chuỗi kết quả của
 * `renderToString` (đây là cơ chế hoisting sẵn có; `react-helmet-async` v3 chỉ render ra
 * JSX rồi để React lo). Cắt đúng cụm đầu chuỗi đó ra để nhét vào `<head>`.
 */
const HOISTED_TAG = /^(<title>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>)/;

function splitHoistedHead(markup: string): { head: string; body: string } {
  let head = "";
  let body = markup;

  for (;;) {
    const match = HOISTED_TAG.exec(body);
    if (!match) break;
    head += match[0];
    body = body.slice(match[0].length);
  }

  return { head, body };
}

/**
 * Chuẩn bị các global mà mã ứng dụng đọc NGAY LÚC NẠP MODULE — `authService` gọi
 * `getStoredSession()` ở cấp module, tức chạm `localStorage` trước cả khi có ai render.
 * Dựng bằng jsdom (đã có sẵn cho Vitest) thay vì tự chế stub để không phải đoán xem còn
 * thiếu API nào.
 */
function installBrowserGlobals(): void {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://solodesk.space/",
  });

  // `self` là bắt buộc, không phải cho chắc: TanStack Router gán `self.__TSR_ROUTER__`
  // ngay trong constructor để devtools bắt được router.
  const globals = [
    "self",
    "window",
    "document",
    "navigator",
    "location",
    "localStorage",
    "sessionStorage",
    "HTMLElement",
    "Element",
    "Node",
    "CustomEvent",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "matchMedia",
  ] as const;
  for (const key of globals) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
  }
}

async function main(): Promise<void> {
  installBrowserGlobals();

  const shell = await readFile(path.join(DIST, "index.html"), "utf8");
  const { renderRoute } = (await import(pathToFileURL(SSR_ENTRY).href)) as {
    renderRoute: (url: string) => Promise<string>;
  };

  for (const route of ROUTES) {
    const markup = await renderRoute(route);
    const { head, body } = splitHoistedHead(markup);

    if (!body.includes("<")) {
      throw new Error(`Prerender ${route}: không dựng ra thẻ HTML nào.`);
    }

    // Thay hẳn `<title>` tĩnh của vỏ chứ không thêm vào: hai thẻ title trong một trang thì
    // crawler lấy cái đầu, tức luôn lấy nhầm cái "SoloDesk" trống nghĩa.
    const html = shell
      .replace(/<title>[\s\S]*?<\/title>/, head)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

    const outDir = path.join(DIST, route.slice(1));
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`prerendered ${route} -> dist${route}/index.html`);
  }
}

await main();
