import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  CheckCheck,
  FilePen,
  FileWarning,
  Loader2,
  MailCheck,
  MailX,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/services/notificationsService";
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/features/notifications/hooks/useNotifications";

/** Mỗi loại thông báo một biểu tượng + màu, để liếc là biết chuyện gì.
 *
 * `Record` (không phải `Partial<Record>`) là CỐ Ý: thêm loại vào `NotificationType` mà quên
 * khai ở đây thì `tsc` báo lỗi ngay. Trước đây bảng này chỉ có 3 loại trong khi backend bắn
 * 7, bốn loại `reminder_*` lặng lẽ rơi vào chuông xám suốt mà không ai biết.  #Huynh
 */
const TYPE_UI: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  intake_submitted: { icon: UserPlus, className: "bg-blue-500/10 text-blue-600" },
  deal_qualified: { icon: Sparkles, className: "bg-violet-500/10 text-violet-600" },
  invoice_overdue: { icon: FileWarning, className: "bg-amber-500/10 text-amber-600" },
  // Đến giờ nhắc — việc phải làm, chưa phải chuyện xấu.
  reminder_due: { icon: BellRing, className: "bg-sky-500/10 text-sky-600" },
  // Biên nhận: hệ thống đã thay mặt freelancer gửi cho khách. Xanh lá = xong xuôi.
  reminder_sent: { icon: MailCheck, className: "bg-emerald-500/10 text-emerald-600" },
  // Khách KHÔNG nhận được. Đây là loại cần nổi nhất trong danh sách — dùng đúng màu
  // destructive của hệ màu, không phải cam như "quá hạn" (quá hạn là biết trước, còn cái
  // này là hỏng ngoài dự tính).
  reminder_failed: { icon: MailX, className: "bg-destructive/10 text-destructive" },
  // Máy soạn sẵn, đang chờ freelancer duyệt.
  reminder_drafted: { icon: FilePen, className: "bg-violet-500/10 text-violet-600" },
};

/** "5 phút trước", "2 giờ trước"... — mốc thời gian tuyệt đối ở đây là vô dụng. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    function onOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  /**
   * Bấm vào thông báo: đánh dấu đã đọc RỒI nhảy tới thứ nó nói tới.
   *
   * Đây mới là điểm khiến thông báo có ích: "Khách hàng mới gửi yêu cầu" mà bấm vào không
   * đi đâu thì người dùng vẫn phải tự mò xem deal nào.  #Huynh
   */
  function handleClick(notification: AppNotification) {
    if (!notification.is_read) markRead.mutate(notification.id);
    setOpen(false);

    if (notification.entity_type === "deal" && notification.entity_id) {
      navigate({ to: "/deals/$dealId", params: { dealId: notification.entity_id } });
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
        className="relative rounded-md border border-border p-2 hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {/* Chấm đỏ CHỈ hiện khi thật sự có thông báo chưa đọc. Trước đây nó hiện vĩnh
            viễn, nên chẳng còn nghĩa gì. */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">Thông báo</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Chưa có thông báo nào</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Khi khách gửi yêu cầu qua biểu mẫu, bạn sẽ thấy ở đây.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const ui = TYPE_UI[n.type] ?? {
                    icon: Bell,
                    className: "bg-muted text-muted-foreground",
                  };
                  const Icon = ui.icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                          n.is_read ? "" : "bg-primary/[0.04]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ui.className}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <span
                              className={`flex-1 text-sm leading-snug ${
                                n.is_read ? "text-foreground" : "font-semibold text-foreground"
                              }`}
                            >
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                          </span>
                          {n.body && (
                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                              {n.body}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
