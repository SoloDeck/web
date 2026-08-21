import { getRouteApi } from "@tanstack/react-router";

import { PublicSharePage } from "@/features/intake/components/PublicSharePage";
import { NoIndexHead } from "@/seo/NoIndexHead";

/**
 * Bốn đường dẫn công khai cùng dẫn tới một trang.
 *
 * `/{slug}` là địa chỉ riêng hiện dùng; ba đường còn lại là link token đã phát cho khách
 * hàng từ trước nên phải giữ chạy. Backend tra slug và token bằng cùng một truy vấn, nên
 * trang không cần biết mình đang nhận cái nào.
 *
 * Gom vào một file để bốn route dùng chung một chunk — khách mở link chỉ tải đúng phần
 * trang công khai, không kéo theo cả workspace.
 *
 * `getRouteApi` thay cho `Route.useParams()`: file này nằm trong `features/`, đọc `Route`
 * từ file route sẽ tạo phụ thuộc vòng đúng thứ mà tách mã đang muốn cắt.  #Huynh
 */
const slugRoute = getRouteApi("/$slug");
const hoSoRoute = getRouteApi("/ho-so/$token");
const bieuMauRoute = getRouteApi("/bieu-mau/$token");
const intakeRoute = getRouteApi("/intake/$token");

/** Chỉ MỘT trong bốn đường được lên chỉ mục — ba đường token là link riêng đã phát cho khách. */
const TOKEN_PAGE_TITLE = "Gửi yêu cầu dự án · SoloDesk";

export function SlugPage() {
  const { slug } = slugRoute.useParams();
  return <PublicSharePage shareToken={slug} seoSlug={slug} />;
}

export function HoSoPage() {
  const { token } = hoSoRoute.useParams();
  return (
    <>
      <NoIndexHead title={TOKEN_PAGE_TITLE} />
      <PublicSharePage shareToken={token} />
    </>
  );
}

export function BieuMauPage() {
  const { token } = bieuMauRoute.useParams();
  return (
    <>
      <NoIndexHead title={TOKEN_PAGE_TITLE} />
      <PublicSharePage shareToken={token} />
    </>
  );
}

export function IntakePage() {
  const { token } = intakeRoute.useParams();
  return (
    <>
      <NoIndexHead title={TOKEN_PAGE_TITLE} />
      <PublicSharePage shareToken={token} />
    </>
  );
}
