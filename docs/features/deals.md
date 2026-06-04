# Quản lý Deal & Kanban (Deals Feature)

## Mục đích
Cung cấp giao diện trực quan (Kanban Board) giúp freelancer quản lý quy trình bán hàng (Sales Pipeline) từ lúc nhận Lead mới cho đến khi chốt Deal thành công.

## Trách nhiệm (Responsibilities)
- Hiển thị danh sách Deal dưới dạng các cột Kanban tương ứng với các Stage.
- Cho phép Kéo - Thả (Drag & Drop) thẻ Deal giữa các cột để chuyển đổi trạng thái.
- Lọc (Filter) và Tìm kiếm (Search) Deal.
- Xem chi tiết Deal (mở Modal/Drawer).
- Tích hợp công cụ AI (Lead Qualifier) để chấm điểm tiềm năng của Lead.

## Cấu trúc Cột (Pipeline Stages)
Cột trên UI phải khớp 100% với danh sách stage từ Backend:
1. **Khách hàng mới** (`new_lead`)
2. **Đã đánh giá** (`qualified`)
3. **Đã gửi đề xuất** (`proposal_sent`)
4. **Đang thương lượng** (`in_negotiation`)
5. **Đang hoạt động** (`active`)
6. **Hoàn thành & Billed** (`completed_and_billed`)
*Lưu ý:* Trạng thái **Thất bại** (`lost`) thường không hiển thị dưới dạng cột Kanban mà nằm ở màn hình chi tiết hoặc tab lưu trữ riêng.

## Kiến trúc Triển khai (Implementation Details)

- **Drag & Drop:** Sử dụng `@dnd-kit/core` và `@dnd-kit/sortable` để quản lý sự kiện kéo thả.
- **State Management:**
  - **Server State:** `useDealsQuery()` gọi API `/api/v1/deals` lấy dữ liệu dạng mảng. UI có trách nhiệm chia mảng này vào các giỏ (columns) dựa trên field `stage`.
  - **Mutation:** `useMoveDealMutation()` gọi API `/api/v1/deals/{id}/stage-transition`.
  - **Optimistic Update:** Khi user thả thẻ vào cột mới, UI cập nhật ngay lập tức (chuyển stage trên UI). Nếu API trả về lỗi (do validation rule của Backend từ chối transition), UI rollback lại trạng thái cũ và hiện Toast thông báo lỗi.

## AI Tích hợp (AI Qualifier)
Nằm trong `DealDetailModal`, có nút "Phân tích bằng AI".
- Khi bấm, gọi `useAIQualifyMutation()`.
- Hiển thị UI loading (Sketelon) sinh động.
- Kết quả (Điểm, Phân tích, Khuyến nghị phản hồi) hiển thị trực quan bằng các thẻ màu sắc (Xanh cho Hot, Đỏ cho Cold).