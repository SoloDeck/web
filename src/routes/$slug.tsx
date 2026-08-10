import { createFileRoute } from "@tanstack/react-router";
import { PublicSharePage } from "@/features/intake/components/PublicSharePage";

/**
 * Địa chỉ riêng của freelancer: `/thuthuy` thay cho link token 43 ký tự.
 *
 * Đây là route BẮT TẤT CẢ ở cấp gốc, nhưng route tĩnh luôn thắng route tham số nên
 * `/login`, `/admin`, `/register`… vẫn vào đúng màn của chúng. Danh sách tên bị cấm nằm ở
 * backend (`users/schemas/request.py`) và phải phủ hết mọi route gốc — thiếu một cái là có
 * người đăng ký chiếm được đường dẫn của hệ thống.
 *
 * Backend tra slug và token bằng cùng một truy vấn nên trang không cần biết mình nhận cái
 * nào. Đường dẫn gõ sai (ví dụ /loginn) sẽ ra "Không tìm thấy hồ sơ" thay vì trang 404
 * chung — chấp nhận được, và cũng không lộ thông tin gì.  #Huynh
 */
export const Route = createFileRoute("/$slug")({
  component: SlugPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function SlugPage() {
  const { slug } = Route.useParams();
  return <PublicSharePage shareToken={slug} />;
}
