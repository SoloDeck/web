# Tiêu chuẩn Hoàn thành (Definition of Done) - Web

Mọi Task (Feature, Fix bug) trên giao diện Web chỉ được xem là hoàn thành (Done) khi đáp ứng toàn bộ các tiêu chí sau:

## 1. Chức năng (Functionality)
- [ ] Chức năng hoạt động đúng theo yêu cầu (Acceptance Criteria).
- [ ] Mọi luồng API (Loading, Success, Error) đều được xử lý và hiển thị phản hồi rõ ràng cho người dùng.
- [ ] Không có lỗi runtime trên Console trình duyệt.
- [ ] Văn bản trên giao diện (UI Text) phải bằng **tiếng Việt**, không được hard-code tiếng Anh.

## 2. Mã nguồn (Code Quality)
- [ ] Vượt qua kiểm tra kiểu tĩnh (TypeScript `tsc --noEmit` không báo lỗi).
- [ ] Không có các khối `any` bừa bãi. Mọi dữ liệu từ API (`useQuery`) phải được định nghĩa `type`/`interface` rõ ràng (`[Entity]Dto`).
- [ ] Bám sát kiến trúc Feature-driven: logic đặc thù nằm trong `features/`, UI tái sử dụng nằm trong `components/ui/`.
- [ ] Không sử dụng `useEffect` để fetch data trực tiếp (phải dùng TanStack Query).
- [ ] Code được định dạng chuẩn bằng Prettier/ESLint.

## 3. Giao diện (UI/UX)
- [ ] Styling hoàn toàn bằng TailwindCSS, không dùng CSS inline (trừ khi cần thiết cho thuộc tính động tính toán bằng JS).
- [ ] Các thành phần UI có trạng thái phản hồi rõ ràng (Hover, Active, Focus, Disabled).
- [ ] Tích hợp mượt mà (Optimistic Update) cho các thao tác nhanh (như Drag & Drop Kanban hoặc Toggle Checkbox).
- [ ] Responsive cơ bản: Không bị vỡ layout trên màn hình hẹp (mặc dù trọng tâm là Desktop).

## 4. Kiểm thử (Testing)
- [ ] Viết Unit Test cho các file logic quan trọng (các hook tính toán phức tạp, hàm util format).
- [ ] Mọi cảnh báo lỗi (Error Toast) đã được giả lập kiểm tra (ví dụ: test case gọi API trả về 422, 500).

## 5. Tích hợp (Integration)
- [ ] Đã định nghĩa API trong `src/services/` và hook trong `hooks/`.
- [ ] Đảm bảo Request/Response data model khớp hoàn toàn với Backend (đối chiếu với `openapi.yaml` nếu có).

---
*Lưu ý: Tiêu chuẩn này được áp dụng cho mọi Pull Request vào nhánh `develop` hoặc `main` của thư mục `web`.*