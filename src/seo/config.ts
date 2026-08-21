/**
 * Hằng số dùng chung cho mọi thẻ SEO.
 *
 * Canonical và OG bắt buộc URL TUYỆT ĐỐI — crawler đọc `og:url` dạng đường dẫn tương đối
 * sẽ bỏ qua thẻ đó, và bản xem trước link ở Zalo/Messenger im lặng rơi về ảnh mặc định của
 * chính nền tảng. Tên miền để ở đây, không rải trong từng route.  #Huynh
 */
export const SITE_URL = "https://solodesk.space";

export const SITE_NAME = "SoloDesk";

/** Ảnh mặc định cho bản xem trước link khi trang không có ảnh riêng. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
