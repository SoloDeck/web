# Kiến trúc Web SoloDesk (SoloDesk Web Architecture)

## Cấu trúc Tổng quan (Top-Level Structure)

`src/`
├── `assets/`        # Hình ảnh, SVG, fonts tĩnh
├── `components/`    # UI Components dùng chung
│   ├── `ui/`        # Design System (Shadcn UI, Radix UI - KHÔNG có business logic)
│   └── `solodesk/`  # Các thành phần UI đặc thù của dự án (ví dụ: Logo, Sidebar)
├── `configs/`       # Cấu hình toàn cục (Axios Client, TanStack QueryClient)
├── `features/`      # Các module tính năng kinh doanh (Business Features)
├── `hooks/`         # Custom hooks dùng chung (ví dụ: useWindowSize)
├── `lib/`           # Các hàm tiện ích thuần túy (formatDate, formatCurrency, cn)
├── `routes/`        # Định nghĩa routing và layout (TanStack Router)
└── `services/`      # Khai báo các API client (thường phân theo feature/domain)

---

## Kiến trúc Hướng tính năng (Feature-Driven UI)

SoloDesk Web KHÔNG nhóm mã nguồn theo kỹ thuật (không dồn toàn bộ components vào một thư mục). Thay vào đó, mã nguồn được nhóm theo **Feature** (Tính năng).

Một Feature Module tiêu chuẩn:

`src/features/deals/`
├── `components/`    # UI riêng của tính năng này (ví dụ: KanbanBoard, DealCard)
├── `hooks/`         # Hooks chứa logic hoặc gọi API (ví dụ: useDealsQuery, useKanbanDnd)
└── `store/`         # Trạng thái cục bộ của tính năng (ví dụ: useDealStore với Zustand)

### Lợi ích:
- Tính đóng gói cao: Sửa tính năng A ít nguy cơ làm hỏng tính năng B.
- Dễ tìm kiếm: Mọi thứ liên quan đến "Deals" đều nằm trong một thư mục.

---

## Quản lý Trạng thái (State Management)

Hệ thống phân chia rạch ròi 4 loại trạng thái:

1. **Trạng thái Máy chủ (Server State):**
   - Quản lý bởi **TanStack Query** (`useQuery`, `useMutation`).
   - Mọi dữ liệu lấy từ API phải đi qua đây. Hệ thống tự lo việc caching, deduplication, và background refetch.
   - Tránh lưu dữ liệu API vào `useState` hay `Zustand` trừ khi cần biến đổi cực kỳ phức tạp trên client.

2. **Trạng thái Client Toàn cục (Global Client State):**
   - Quản lý bởi **Zustand**.
   - Dùng cho các trạng thái cần chia sẻ giữa nhiều tính năng mà không phù hợp lưu trên URL (ví dụ: trạng thái mở/đóng của một Modal đặc biệt dùng chung, trạng thái Theme).

3. **Trạng thái Cục bộ (Local UI State):**
   - Quản lý bởi React `useState` / `useReducer`.
   - Dùng cho logic thuần UI (ví dụ: chuỗi input đang gõ, trạng thái hover, accordion đang mở).

4. **Trạng thái URL (URL State):**
   - Quản lý bởi **TanStack Router** (Search Params).
   - Dùng cho các trạng thái cần chia sẻ/lưu URL (ví dụ: bộ lọc danh sách, từ khóa tìm kiếm, trang hiện tại).

---

## Tầng Dữ liệu (Data Fetching Layer)

1. Giao tiếp với backend thông qua **Axios** (cấu hình tại `src/configs/axios.ts`).
2. Khai báo hàm gọi API trong `src/services/` hoặc `src/features/<feature>/services/`.
3. Wrap hàm gọi API bằng hook của **TanStack Query** (`useQuery`/`useMutation`) bên trong thư mục `hooks` của feature đó.
4. Xử lý Lỗi (Error Handling): Bắt lỗi API chung qua Interceptor của Axios và hiển thị Toast notification (bằng tiếng Việt) trên UI.

---

## Tích hợp AI (AI Integrations on Frontend)

AI không có module UI riêng biệt ở mức top-level, mà được "nhúng" (embedded) vào các feature dưới dạng các công cụ hỗ trợ:
- **Lead Qualifier Panel:** Nằm trong `features/deals/`.
- **Proposal Generator Modal:** Nằm trong `features/proposals/`.

Khi người dùng kích hoạt AI, Web gọi mutation (TanStack Query) đến API AI tương ứng của backend. Hiển thị UI Skeleton hoặc Loading text để mô phỏng cảm giác "AI đang suy nghĩ". Dữ liệu trả về (dạng Draft) sẽ được điền vào Form để người dùng xác nhận trước khi lưu.