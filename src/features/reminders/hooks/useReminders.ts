import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelReminder,
  createReminder,
  listDealReminders,
  listReminderRules,
  previewReminder,
  sendReminderNow,
  updateReminder,
  updateReminderRule,
  type ReminderPayload,
  type ReminderUpdatePayload,
  type ReminderRuleType,
  type ReminderRuleUpdate,
  type ReminderType,
} from "@/services/remindersService";

export const reminderKeys = {
  all: ["reminders"] as const,
  byDeal: (dealId: string) => ["reminders", "deal", dealId] as const,
  rules: ["reminders", "rules"] as const,
};

export function useReminderRules() {
  return useQuery({ queryKey: reminderKeys.rules, queryFn: listReminderRules });
}

export function useUpdateReminderRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleType, payload }: { ruleType: ReminderRuleType; payload: ReminderRuleUpdate }) =>
      updateReminderRule(ruleType, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reminderKeys.rules });
      toast.success("Đã lưu quy tắc nhắc.");
    },
    onError: () => {
      toast.error("Không lưu được quy tắc. Vui lòng thử lại.");
    },
  });
}

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
    mutationFn: ({ id, payload }: { id: string; payload: ReminderUpdatePayload }) =>
      updateReminder(id, payload),
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
      try {
        return await sendReminderNow(reminder.id);
      } catch (error) {
        // Bước gửi hỏng hẳn (mất mạng, 500) thì lời nhắc vừa tạo vẫn nằm "Chờ gửi" với giờ hẹn
        // vài phút tới — màn hình báo "Không gửi được" mà ít phút sau beat lại gửi thư đi thật.
        // Huỷ nó để câu báo lỗi nói đúng: không có gì được gửi. Huỷ hỏng thì thôi, vẫn báo
        // lỗi gửi — đó mới là việc người dùng vừa làm.  #Huynh
        await cancelReminder(reminder.id).catch(() => undefined);
        throw error;
      }
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

/**
 * Tiêu đề THẬT của thư khách sẽ nhận cho một loại nhắc, do server dựng.
 *
 * Hộp "Nhắc khách bằng AI" có ô tiêu đề sửa được, nhưng thư gửi qua SoloDesk không dùng ô đó:
 * backend tự đặt tiêu đề theo loại nhắc. Hiện câu này ra để người dùng biết khách nhận gì,
 * thay vì sửa một ô rồi tưởng mình đã đổi tiêu đề thư.  #Huynh
 */
export function useReminderSubject(
  reminderType: ReminderType,
  dealId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["reminders", "subject", reminderType, dealId ?? ""] as const,
    queryFn: async () =>
      (
        await previewReminder({
          reminder_type: reminderType,
          target_type: "deal",
          target_id: dealId!,
          message: "",
        })
      ).subject,
    enabled: enabled && Boolean(dealId),
    // Tiêu đề chỉ phụ thuộc loại nhắc + tên dự án, không đổi trong lúc hộp thoại đang mở.
    staleTime: 5 * 60 * 1000,
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
