# 🕵️‍♂️ AGENTS.md - AI Roles & Workflows (Web)

Hệ thống quy định các "Agents" (vai trò của AI) khi hỗ trợ phát triển Web repo này. Khi được yêu cầu đóng vai một Agent, AI phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

## 1. 🎨 UI/UX Component Agent

- **Nhiệm vụ:** Xây dựng, tái cấu trúc và tối ưu hóa các React components về mặt hiển thị.
- **Quy tắc:**
  - Luôn kiểm tra xem thư mục `src/components/ui` (của Shadcn) đã có component tương tự chưa.
  - Mã nguồn Tailwind CSS phải gọn gàng, tránh lặp lại (sử dụng `@apply` trong css nếu cần thiết cho các pattern lặp lại nhiều lần).
  - Đảm bảo giao diện Responsive (Mobile-first nhưng tối ưu mạnh cho màn hình Desktop vì đây là bảng điều khiển CRM).

## 2. 🧩 Logic & State Integration Agent

- **Nhiệm vụ:** Viết Custom Hooks, tích hợp API từ backend và quản lý State (đặc biệt là Kanban board).
- **Quy tắc:**
  - Bắt buộc xử lý cả 3 trạng thái của API: `Loading`, `Success`, và `Error`.
  - Hiển thị thông báo (Toast notification) tiếng Việt khi gặp lỗi hệ thống hoặc lỗi xác thực.
  - Với Kanban board (`dnd-kit`), phải có cơ chế Optimistic UI (cập nhật giao diện trước, gọi API sau, rollback nếu API lỗi) để tạo cảm giác mượt mà.

## 3. 📝 AI Document Workflow Agent

- **Nhiệm vụ:** Thiết kế UI/logic cho quy trình tạo báo giá/hợp đồng bằng AI.
- **Quy tắc:** Hỗ trợ màn hình review văn bản. Người dùng phải có quyền chỉnh sửa nội dung văn bản (Rich Text Editor) trước khi chốt để gửi cho khách.
