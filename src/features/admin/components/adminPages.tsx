import { AdminDashboard } from "@/features/admin/components/AdminDashboard";

/**
 * Sáu màn admin, mỗi màn là một component không tham số.
 *
 * Tồn tại vì `lazyRouteComponent` dựng component bằng props của route, không truyền được
 * prop tự đặt — mà cả sáu route admin đều chỉ khác nhau ở một prop `page`. Gói chung MỘT
 * file nên sáu route dùng chung một chunk: admin đã vào một màn thì các màn còn lại không
 * phải tải lại lần nữa.
 *
 * File chỉ xuất component, không xuất gì khác — `react-refresh/only-export-components`.  #Huynh
 */
export function AdminDashboardPage() {
  return <AdminDashboard page="dashboard" />;
}

export function AdminUsersPage() {
  return <AdminDashboard page="users" />;
}

export function AdminPlansPage() {
  return <AdminDashboard page="plans" />;
}

export function AdminTemplatesPage() {
  return <AdminDashboard page="templates" />;
}

export function AdminAuditPage() {
  return <AdminDashboard page="audit" />;
}

export function AdminAiCostsPage() {
  return <AdminDashboard page="ai-costs" />;
}
