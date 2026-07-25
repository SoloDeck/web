import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// Thông báo trong ứng dụng — cái chuông trên thanh tiêu đề.
//
// Vì sao cần: khách gửi Biểu mẫu tiếp nhận → hệ thống tạo deal mới và AI chấm điểm ngay,
// nhưng freelancer KHÔNG hề biết cho tới khi tự mở cột "Deal Mới" ra xem. Deal nóng nằm
// im vài ngày là mất khách.
//
// Trước đây cái chuông này là ĐỒ TRANG TRÍ: một cái <button> không có onClick, kèm chấm
// đỏ luôn hiện vĩnh viễn bất kể có gì mới hay không. Bấm vào không ra gì.  #Huynh
// ---------------------------------------------------------------------------

/** Khớp `type` bên backend (`src/modules/notifications/application/service.py`). */
export type NotificationType =
  | "intake_submitted"
  | "deal_qualified"
  | "invoice_overdue";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  /** `entity_type` + `entity_id` để bấm vào là nhảy thẳng tới deal/hoá đơn liên quan. */
  entity_type: "deal" | "invoice" | "client" | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type PaginatedResponse<T> = {
  data: T[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

/** GET /notifications */
export async function listNotifications(params?: {
  unread_only?: boolean;
  page?: number;
  page_size?: number;
}): Promise<{ items: AppNotification[]; total: number }> {
  const { data } = await axiosClient.get<PaginatedResponse<AppNotification>>(
    "/notifications",
    { params }
  );
  return { items: data.data ?? [], total: data.pagination?.total ?? 0 };
}

/**
 * GET /notifications/unread-count
 *
 * Endpoint riêng chỉ trả về một con số, vì cái chấm đỏ được hỏi liên tục — kéo cả danh
 * sách về chỉ để đếm là phí.
 */
export async function getUnreadCount(): Promise<number> {
  const { data } = await axiosClient.get<ApiResponse<{ unread_count: number }>>(
    "/notifications/unread-count"
  );
  return data.data?.unread_count ?? 0;
}

/** PATCH /notifications/{id}/read */
export async function markNotificationRead(id: string): Promise<void> {
  await axiosClient.patch(`/notifications/${id}/read`);
}

/** POST /notifications/read-all */
export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await axiosClient.post<ApiResponse<{ marked: number }>>(
    "/notifications/read-all"
  );
  return data.data?.marked ?? 0;
}
