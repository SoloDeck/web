import { useMemo } from "react";
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
  unreadList: () => ["notifications", "list", "unread"] as const,
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

/**
 * Deal nào KHÁCH VỪA GỬI mà freelancer chưa xem — để bảng Kanban đẩy lên đầu cột + làm nổi bật.
 *
 * "Chưa xem" đo bằng thông báo `intake_submitted` còn chưa đọc, không phải bằng một cột
 * `viewed_at` mới: bảng `notifications` đã có sẵn trạng thái đọc/chưa đọc, đã có API đánh
 * dấu đã đọc, và mỗi phiếu tiếp nhận vốn đã sinh đúng một thông báo gắn với deal. Thêm cột
 * mới là chép lại một sự thật đã được lưu ở chỗ khác — hai nguồn thì sớm muộn cũng lệch nhau.
 *
 * Trả về map `dealId -> notificationId`: cần cả id thông báo để lúc người dùng mở deal ra
 * xem thì đánh dấu đã đọc đúng dòng đó.  #Huynh
 */
export function useUnseenDealNotifications() {
  const query = useQuery({
    queryKey: notificationKeys.unreadList(),
    queryFn: () => listNotifications({ unread_only: true, page_size: 50 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  return useMemo(() => {
    const byDealId = new Map<string, string>();
    for (const item of query.data?.items ?? []) {
      if (
        item.type === "intake_submitted" &&
        item.entity_type === "deal" &&
        item.entity_id &&
        !byDealId.has(item.entity_id)
      ) {
        byDealId.set(item.entity_id, item.id);
      }
    }
    return byDealId;
  }, [query.data]);
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
