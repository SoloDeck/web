import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelReminder,
  createReminder,
  listDealReminders,
  sendReminderNow,
  updateReminder,
  type ReminderPayload,
} from "@/services/remindersService";

export const reminderKeys = {
  all: ["reminders"] as const,
  byDeal: (dealId: string) => ["reminders", "deal", dealId] as const,
};

export function useDealReminders(dealId: string | undefined) {
  return useQuery({
    queryKey: reminderKeys.byDeal(dealId ?? ""),
    queryFn: () => listDealReminders(dealId!),
    enabled: Boolean(dealId),
  });
}

export function useCreateReminder(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      if (dealId) qc.invalidateQueries({ queryKey: reminderKeys.byDeal(dealId) });
      qc.invalidateQueries({ queryKey: reminderKeys.all });
      toast.success("Đã tạo lịch nhắc cho dự án.");
    },
    onError: () => {
      toast.error("Không thể tạo lịch nhắc. Vui lòng thử lại.");
    },
  });
}

export function useUpdateReminder(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReminderPayload }) => updateReminder(id, payload),
    onSuccess: () => {
      if (dealId) qc.invalidateQueries({ queryKey: reminderKeys.byDeal(dealId) });
      toast.success("Đã cập nhật lịch nhắc.");
    },
    onError: () => {
      toast.error("Không thể cập nhật lịch nhắc.");
    },
  });
}

/**
 * Duyệt tin AI soạn rồi gửi bằng MỘT thao tác: tạo lịch nhắc với đúng nội dung người
 * dùng vừa sửa, rồi gửi luôn. Tách riêng khỏi `useCreateReminder` vì hook kia bắn toast
 * "Đã tạo lịch nhắc" — ở đây người dùng bấm "Gửi", họ cần biết đã GỬI hay chưa.
 */
export function useApproveAndSend(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReminderPayload) => {
      const reminder = await createReminder(payload);
      return sendReminderNow(reminder.id);
    },
    onSuccess: (result) => {
      if (dealId) qc.invalidateQueries({ queryKey: reminderKeys.byDeal(dealId) });
      qc.invalidateQueries({ queryKey: reminderKeys.all });
      if (result.delivered) toast.success(result.detail);
      else toast.warning(result.detail);
    },
    onError: () => {
      toast.error("Không gửi được lời nhắc. Vui lòng thử lại.");
    },
  });
}

export function useSendReminderNow(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendReminderNow,
    onSuccess: (result) => {
      if (dealId) qc.invalidateQueries({ queryKey: reminderKeys.byDeal(dealId) });
      qc.invalidateQueries({ queryKey: reminderKeys.all });
      // `detail` là câu BE soạn ("Đã gửi email cho Quán cà phê Nắng", "Khách X chưa có
      // email"). Nó biết lý do, FE thì không — nên hiện nguyên văn thay vì tự đoán.
      if (result.delivered) toast.success(result.detail);
      else toast.warning(result.detail);
    },
    onError: () => {
      toast.error("Không gửi được lời nhắc. Vui lòng thử lại.");
    },
  });
}

export function useCancelReminder(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelReminder,
    onSuccess: () => {
      if (dealId) qc.invalidateQueries({ queryKey: reminderKeys.byDeal(dealId) });
      toast.success("Đã hủy lịch nhắc.");
    },
    onError: () => {
      toast.error("Không thể hủy lịch nhắc.");
    },
  });
}
