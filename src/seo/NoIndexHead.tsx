import { Helmet } from "react-helmet-async";

/**
 * Thẻ head cho các trang công khai nhưng KHÔNG muốn nằm trong kết quả tìm kiếm.
 *
 * Hai nhóm dùng: màn đăng nhập/đăng ký (không có nội dung để xếp hạng, lên Google chỉ tổ
 * cạnh tranh với chính `/home`) và ba đường link token phát riêng cho khách hàng — link
 * đoán không ra, nhưng đã lỡ lọt vào chỉ mục thì gỡ rất phiền.
 */
export function NoIndexHead({ title }: { title: string }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
