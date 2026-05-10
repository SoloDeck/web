# 🤖 CLAUDE.md - SoloDesk Web Repository

## 1. Bối cảnh dự án (Project Context)

- **Tên dự án:** SoloDesk Web Application.
- **Mục tiêu:** Hệ thống quản lý khách hàng (CRM) dạng Kanban tích hợp AI, dành riêng cho freelancer và chuyên gia dịch vụ độc lập tại Việt Nam.
- **Tech Stack cốt lõi:**
  - Framework: ReactJS (Vite).
  - UI/Styling: Tailwind CSS, Shadcn/ui.
  - Kanban Board: dnd-kit.
  - Giao tiếp API: Axios / Fetch.
  - Quản lý State: Zustand hoặc React Context (tùy module).

## 2. Quy tắc lập trình (Coding Guidelines)

- **Kiến trúc Component:** Ưu tiên Functional Components và React Hooks. Tách biệt logic (Custom Hooks) và UI (Dumb Components).
- **UI/UX:** Mọi component giao diện phải sử dụng các class của Tailwind CSS. Nếu cần component phức tạp (như Modal, Select, Table), hãy ưu tiên sử dụng/tùy biến từ thư viện `Shadcn/ui` trước khi tự code mới.
- **Tính năng Kéo-Thả (Drag & Drop):** Module Kanban board phải sử dụng thư viện `dnd-kit`, đảm bảo xử lý mượt mà trạng thái (stage) của Deal khi kéo thả.
- **Naming Conventions:**
  - Thư mục/File logic: `camelCase` (vd: `useDealLogic.ts`, `apiService.ts`).
  - File Component: `PascalCase` (vd: `KanbanBoard.tsx`, `LeadCard.tsx`).
- **Ngôn ngữ hiển thị:** Toàn bộ giao diện người dùng (UI text) phải là **Tiếng Việt**.

## 3. Cấu trúc thư mục (Directory Structure)

- `src/components`: UI components dùng chung (Button, Input, Layout...).
- `src/features`: Các module chức năng chính (vd: `kanban`, `invoices`, `clients`).
- `src/hooks`: Custom React hooks xử lý logic dùng chung.
- `src/services`: Cấu hình API endpoints và gọi data từ Backend.
- `src/configs`: Cấu hình toàn cục (axios instances, environment variables).
- `src/utils`: Các hàm helper (format tiền tệ VNĐ, format ngày tháng).

## 4. Các lệnh cơ bản (Commands)

- Cài đặt: `bun install`
- Chạy môi trường Dev: `bun run dev`
- Build production: `bun run build`
