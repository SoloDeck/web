import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationsService";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

/**
 * Số thông báo chưa đọc — nuôi cái chấm đỏ trên chuông.
 *
 * Hỏi lại mỗi 60 giây. Không dùng WebSocket: thông báo ở đây không phải là chat, trễ một
 * phút chẳng chết ai, mà dựng WebSocket là thêm hẳn một hạ tầng phải nuôi (kết nối lại khi
 * rớt mạng, giữ trạng thái khi scale nhiều tiến trình). Endpoint này chỉ đếm một dòng có
 * index — rẻ.
 *
 * `refetchOnWindowFocus` mới là thứ quan trọng: người dùng rời tab đi làm việc khác rồi
 * quay lại là thấy ngay, không phải đợi hết chu kỳ 60 giây.  #Huynh
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

/** Danh sách thông báo — chỉ gọi khi người dùng MỞ chuông ra, không tải sẵn. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => listNotifications({ page_size: 20 }),
    enabled,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
