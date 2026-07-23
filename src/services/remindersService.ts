import axiosClient from "@/configs/axios";

export type ReminderTargetType = "deal" | "client" | "invoice" | "contract";
export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled" | "skipped";
export type ReminderChannel = "zalo" | "email" | "in_app" | "both";
export type ReminderType =
  | "follow_up"
  | "proposal_follow_up"
  | "contract_signing_nudge"
  | "payment_due"
  | "payment_overdue"
  | "re_engagement"
  | "custom";

export type ReminderRecord = {
  id: string;
  owner_user_id: string;
  target_type: ReminderTargetType;
  target_id: string;
  reminder_type: ReminderType;
  channel: ReminderChannel | string;
  status: ReminderStatus | string;
  scheduled_at: string;
  message_preview: string | null;
  /** Do quy tắc tự sinh, đang chờ người duyệt — hệ thống sẽ KHÔNG tự gửi. */
  requires_approval?: boolean;
  /** Do quy tắc tự sinh (khác với lời nhắc người dùng tự đặt). */
  created_by_rule?: boolean;
  created_at: string;
  updated_at: string;
};

/** Năm quy tắc nhắc tự động. `rule_type` khớp `ReminderType` của backend. */
export type ReminderRuleType =
  | "proposal_follow_up"
  | "contract_signing_nudge"
  | "payment_due"
  | "payment_overdue"
  | "re_engagement";

export type ReminderRule = {
  rule_type: ReminderRuleType;
  is_enabled: boolean;
  offset_days: number;
  repeat_every_days: number | null;
  channel: ReminderChannel;
  auto_send: boolean;
  send_at_hour: number;
  /** Câu mô tả do backend soạn — đừng chế lại ở FE kẻo hai nơi nói hai kiểu. */
  label: string;
  /** Chỉ quá hạn và tái kết nối mới lặp lại được. */
  supports_repeat: boolean;
};

export type ReminderRuleUpdate = Partial<
  Pick<
    ReminderRule,
    "is_enabled" | "offset_days" | "repeat_every_days" | "channel" | "auto_send" | "send_at_hour"
  >
>;

export type ReminderPayload = {
  target_type: ReminderTargetType;
  target_id: string;
  reminder_type: ReminderType;
  channel: ReminderChannel;
  scheduled_at: string;
  message_preview?: string | null;
};

export type GetRemindersParams = {
  status?: ReminderStatus;
  target_type?: ReminderTargetType;
};

type ApiEnvelope<T> = { data: T };

export async function listReminders(params: GetRemindersParams = {}): Promise<ReminderRecord[]> {
  const { data } = await axiosClient.get<ApiEnvelope<ReminderRecord[]>>("/reminders", { params });
  return data.data ?? [];
}

export async function listDealReminders(dealId: string): Promise<ReminderRecord[]> {
  const reminders = await listReminders({ target_type: "deal" });
  // BE hiện chưa hỗ trợ query target_id, nên FE lọc local để màn detail chỉ thấy reminder của deal hiện tại.
  return reminders.filter((reminder) => reminder.target_id === dealId);
}

export async function createReminder(payload: ReminderPayload): Promise<ReminderRecord> {
  const { data } = await axiosClient.post<ApiEnvelope<ReminderRecord>>("/reminders", payload);
  return data.data;
}

export async function updateReminder(id: string, payload: ReminderPayload): Promise<ReminderRecord> {
  const { data } = await axiosClient.patch<ApiEnvelope<ReminderRecord>>(`/reminders/${id}`, payload);
  return data.data;
}

export async function cancelReminder(id: string): Promise<void> {
  await axiosClient.delete(`/reminders/${id}`);
}

/**
 * Kết quả bấm "Gửi ngay". BE gửi đồng bộ ngay trong request nên đây là kết quả THẬT,
 * không phải "đã xếp hàng".
 */
export type ReminderDeliveryResult = {
  reminder: ReminderRecord;
  status: ReminderStatus | string;
  /** Câu tiếng Việt do BE soạn — hiện thẳng lên toast, đừng tự chế lại. */
  detail: string;
  delivered: boolean;
};

export async function sendReminderNow(id: string): Promise<ReminderDeliveryResult> {
  const { data } = await axiosClient.post<ApiEnvelope<ReminderDeliveryResult>>(
    `/reminders/${id}/send`
  );
  return data.data;
}

/** Lần gọi đầu tiên backend tự tạo bộ 5 quy tắc mặc định. */
export async function listReminderRules(): Promise<ReminderRule[]> {
  const { data } = await axiosClient.get<ApiEnvelope<ReminderRule[]>>("/reminders/rules");
  return data.data ?? [];
}

export async function updateReminderRule(
  ruleType: ReminderRuleType,
  payload: ReminderRuleUpdate
): Promise<ReminderRule> {
  const { data } = await axiosClient.patch<ApiEnvelope<ReminderRule>>(
    `/reminders/rules/${ruleType}`,
    payload
  );
  return data.data;
}
