import { getRouteApi } from "@tanstack/react-router";

import { PublicSharePage } from "@/features/intake/components/PublicSharePage";

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

export function SlugPage() {
  const { slug } = slugRoute.useParams();
  return <PublicSharePage shareToken={slug} />;
}

export function HoSoPage() {
  const { token } = hoSoRoute.useParams();
  return <PublicSharePage shareToken={token} />;
}

export function BieuMauPage() {
  const { token } = bieuMauRoute.useParams();
  return <PublicSharePage shareToken={token} />;
}

export function IntakePage() {
  const { token } = intakeRoute.useParams();
  return <PublicSharePage shareToken={token} />;
}
