# Tính năng Web (Web Features Catalog)

Tài liệu này liệt kê các mô-đun tính năng (features) chính trong frontend của SoloDesk Web. Mỗi feature tương ứng với một thư mục trong `src/features/`.

## 1. Xác thực (`auth`)
- **Nhiệm vụ:** Hiển thị giao diện đăng nhập (Email/Password & Google OAuth), đăng ký, quên mật khẩu.
- **Components chính:** `LoginForm`, `RegisterForm`.
- **State:** Lưu trữ JWT Token vào Local Storage / Memory (thông qua utils bảo mật).

## 2. Quản lý Khách hàng (`clients`)
- **Nhiệm vụ:** Danh sách khách hàng, thêm/sửa/xóa khách hàng, xem chi tiết lịch sử tương tác.
- **Components chính:** `ClientListTable`, `ClientFormModal`, `ClientDetailView`.

## 3. Quản lý Deal & Kanban (`deals`)
- **Nhiệm vụ:** Cung cấp bảng Kanban kéo thả (Drag & Drop) để quản lý luồng kinh doanh (Pipeline).
- **Components chính:** `KanbanBoard` (dùng dnd-kit), `KanbanColumn`, `DealCard`, `DealDetailModal`.
- **Logic đặc thù:** Optimistic update khi kéo thả thẻ Deal giữa các cột. Tính toán tổng giá trị (Pipeline Value) của từng cột.

## 4. Quản lý Đề xuất (`proposals`)
- **Nhiệm vụ:** Hiển thị danh sách đề xuất, tạo đề xuất mới (có hỗ trợ từ AI), chia sẻ link cho khách.
- **Components chính:** `ProposalEditor`, `ProposalPreview`, `AIProposalGeneratorModal`.
- **Logic đặc thù:** Xử lý hiển thị nội dung Rich Text/Markdown được trả về từ AI.

## 5. Quản lý Hợp đồng (`contracts`)
- **Nhiệm vụ:** Hiển thị chi tiết hợp đồng, các điều khoản, mốc thanh toán.
- **Components chính:** `ContractViewer`, `MilestoneTracker`.

## 6. Hóa đơn & Thanh toán (`invoices`)
- **Nhiệm vụ:** Liệt kê hóa đơn, hiển thị trạng thái thanh toán (Paid, Overdue).
- **Components chính:** `InvoiceList`, `PaymentStatusBadge`.

## 7. Báo cáo & Thống kê (`analytics`)
- **Nhiệm vụ:** Hiển thị các biểu đồ (Charts) về doanh thu, Win Rate, thống kê sử dụng AI.
- **Components chính:** `RevenueChart`, `WinRateWidget` (thường dùng thư viện như Recharts).

## 8. Nhắc nhở (`reminders`)
- **Nhiệm vụ:** Hiển thị thông báo, danh sách các công việc cần làm sắp tới (theo dõi hóa đơn quá hạn, deal cần follow-up).
- **Components chính:** `ReminderPopover`, `TaskListItem`.