/**
 * Cửa duy nhất để router vào khu quản trị.
 *
 * Cả tám route admin (khung + bảy tab) đều `import()` đúng module này, nên trình gói nhét
 * khung lẫn bảy màn vào MỘT chunk (`dist/assets/adminPages-*.js`, ~115 KB). Vào được một
 * tab là có sẵn mã của cả khu; từ đó đổi tab không tốn thêm lượt mạng nào.
 *
 * Tách khung ra chunk riêng chỉ thêm một lượt tải cho thứ mà tab nào cũng cần. Còn nhét
 * khung vào gói khởi động thì bắt cả khách lạ ở trang giới thiệu gánh mã quản trị — đúng
 * thứ mà lần tách mã theo route vừa dọn xong.
 *
 * File chỉ xuất component, không xuất gì khác — `react-refresh/only-export-components`.  #Huynh
 */
export { AdminLayout } from "./AdminLayout";
export {
  AdminDashboardPage,
  AdminUsersPage,
  AdminPlansPage,
  AdminTemplatesPage,
  AdminAiConfigPage,
  AdminAiCostsPage,
  AdminAuditPage,
} from "./AdminDashboard";
export { AdminPaymentTransactionsPage } from "./AdminPaymentTransactionsPage";
