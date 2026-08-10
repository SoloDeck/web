import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, validateSlug } from "@/features/profile/slugRules";

describe("validateSlug", () => {
  it("nhận tên hợp lệ", () => {
    for (const ok of ["thu-thuy", "abc", "a-1-b", "nguyen123", "a".repeat(32)]) {
      expect(validateSlug(ok), ok).toBeNull();
    }
  });

  it("bỏ trống là hợp lệ — đó là cách xoá tên đường dẫn đã đặt", () => {
    expect(validateSlug("")).toBeNull();
    expect(validateSlug("   ")).toBeNull();
  });

  it("từ chối tên sai định dạng", () => {
    for (const bad of ["Có Dấu", "-abc", "abc-", "ab", "a".repeat(33), "co khoang trang"]) {
      expect(validateSlug(bad), bad).not.toBeNull();
    }
  });

  it("từ chối tên dành riêng cho hệ thống", () => {
    for (const reserved of ["login", "admin", "ho-so", "bieu-mau", "deals", "api"]) {
      expect(validateSlug(reserved), reserved).toMatch(/dành riêng/);
    }
  });
});

describe("RESERVED_SLUGS phủ hết route gốc", () => {
  /**
   * Vì sao phải có bài này: slug thành đường dẫn gốc `/{slug}`, mà TanStack Router luôn ưu
   * tiên route tĩnh hơn `/$slug`. Ai lỡ đặt slug trùng tên một route gốc thì trang của họ
   * vĩnh viễn không mở được bằng link ngắn — và KHÔNG có lỗi nào hiện ra ở đâu cả.
   *
   * Đọc thẳng thư mục `src/routes/` chứ không đọc `routeTree.gen.ts`: file đó là bản sinh
   * tự động có `@ts-nocheck`, thò tay vào ruột nó là tự chuốc lấy phiền.
   *
   * Thêm `src/routes/settings.tsx` là bài này đỏ ngay — đúng lúc cần nhớ rằng danh sách bên
   * backend cũng phải cập nhật theo.
   */
  const topLevelRouteSegments = Object.keys(import.meta.glob("/src/routes/*.tsx"))
    .map((path) => path.split("/").pop()!.replace(/\.tsx$/, "").split(".")[0])
    .filter((seg) => seg !== "__root" && seg !== "index" && !seg.startsWith("$"));

  it("có ít nhất vài route để kiểm (bản thân phép duyệt phải chạy được)", () => {
    expect(topLevelRouteSegments.length).toBeGreaterThan(3);
  });

  it.each(topLevelRouteSegments)("route gốc /%s nằm trong danh sách cấm", (segment) => {
    expect(
      RESERVED_SLUGS.has(segment),
      `Route gốc "/${segment}" chưa có trong RESERVED_SLUGS. Thêm vào đây VÀ vào ` +
        `_RESERVED_SLUGS ở backend/src/modules/users/schemas/request.py — thiếu một trong ` +
        `hai chỗ là có người đăng ký chiếm được đường dẫn đó.`,
    ).toBe(true);
  });
});
