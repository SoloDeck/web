/**
 * Luật đặt tên đường dẫn riêng (`/{slug}`) — bản sao của luật phía backend.
 *
 * Bản gốc là `backend/src/modules/users/schemas/request.py` (`_SLUG`, `_RESERVED_SLUGS`,
 * `_valid_profile_slug`). Chép sang đây vì hai repo không có gói dùng chung, và người dùng
 * cần biết mình gõ sai NGAY lúc gõ chứ không phải sau khi bấm Lưu rồi ăn 422.
 *
 * Lệch nhau thì sao:
 * - FE thiếu một tên so với BE → người dùng vẫn bị chặn, chỉ là chặn muộn ở bước Lưu, và
 *   thông điệp lấy từ `error.details` của BE. Xấu chứ không nguy hiểm.
 * - FE thừa một tên → từ chối oan một tên hợp lệ. Nhẹ.
 * - **BE nhận một slug trùng route gốc của FE** → trang của người đó vĩnh viễn không mở
 *   được bằng link ngắn, vì route tĩnh luôn thắng `/$slug`, mà chẳng có lỗi nào hiện ra.
 *   Đây là trường hợp thật sự nguy hiểm, và chép danh sách không tự bắt được — nên có
 *   `slugRules.test.ts` duyệt thẳng thư mục `src/routes/` để canh.
 */

/** 3–32 ký tự, chỉ chữ thường/số/gạch ngang, không mở đầu hay kết thúc bằng gạch. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Route gốc của frontend — chiếm được là chiếm luôn màn hình đó.
  "admin", "bieu-mau", "ho-so", "intake", "clients", "deals", "login", "register",
  "onboarding", "home", "forgot-password", "reset-password", "settings", "dashboard",
  "profile", "account",
  // Tên hạ tầng hay bị trỏ tới.
  "api", "app", "assets", "static", "www", "cdn", "mail", "smtp", "ftp",
  // Trang giới thiệu / hỗ trợ có thể mở sau này.
  "billing", "help", "support", "about", "terms", "privacy", "blog", "docs",
  "status", "health", "zalo", "solodesk",
]);

/**
 * Trả về lời giải thích khi tên đường dẫn không dùng được, hoặc `null` khi dùng được.
 *
 * Chuỗi rỗng là HỢP LỆ: bỏ trống nghĩa là xoá tên đường dẫn, và backend cũng hiểu như vậy
 * (`_valid_profile_slug` trả `None`). Chặn ở đây là người dùng hết đường bỏ tên đã đặt.
 */
export function validateSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (slug === "") return null;
  if (!SLUG_PATTERN.test(slug)) {
    return "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang; dài 3–32 ký tự, không bắt đầu hay kết thúc bằng gạch ngang.";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `'${slug}' là tên dành riêng cho hệ thống, bạn chọn tên khác nhé.`;
  }
  return null;
}
