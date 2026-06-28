import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelReminder,
  createReminder,
  listDealReminders,
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
