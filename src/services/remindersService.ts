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
  /** Ảnh đã chèn vào thư — mở lại lời nhắc cũ vẫn thấy, không bị lưu đè mất. */
  attachments?: ReminderImage[];
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

/** Một biến `{...}` chèn được vào template lời nhắc, kèm nhãn tiếng Việt. */
export type ReminderTemplateVariable = {
  token: string;
  label: string;
};

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
  /** Nội dung mẫu ĐANG hiệu lực (bản tự soạn nếu có, ngược lại là mặc định). */
  message_template: string;
  /** True nếu freelancer đã tự soạn (khác template mặc định). */
  is_custom_template: boolean;
  /** Các biến template này hỗ trợ, để hiện gợi ý chèn. */
  template_variables: ReminderTemplateVariable[];
};

export type ReminderRuleUpdate = Partial<
  Pick<
    ReminderRule,
    | "is_enabled"
    | "offset_days"
    | "repeat_every_days"
    | "channel"
    | "auto_send"
    | "send_at_hour"
    | "message_template"
  >
>;

/** Ảnh freelancer chèn vào thư (mã QR chuyển khoản chụp sẵn, ảnh sản phẩm…). */
export type ReminderImage = {
  /** Khoá trong kho lưu trữ — do `uploadReminderImage` trả về. */
  key: string;
  filename: string;
  content_type: string;
};

export type ReminderPayload = {
  target_type: ReminderTargetType;
  target_id: string;
  reminder_type: ReminderType;
  channel: ReminderChannel;
  scheduled_at: string;
  message_preview?: string | null;
  attachments?: ReminderImage[];
};

/**
 * POST /reminders/attachments — tải MỘT ảnh lên, nhận về khoá để gắn vào lời nhắc.
 *
 * Chỉ nhận ảnh: email không phát được video, còn tệp tài liệu thì trình đọc mail hiện
 * thành cục tải về chứ không hiện trong thân thư — mà mục đích là để khách NHÌN THẤY ngay
 * (nhất là mã QR).
 */
export async function uploadReminderImage(file: File): Promise<ReminderImage> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosClient.post<ApiEnvelope<ReminderImage>>(
    "/reminders/attachments",
    form
  );
  return data.data;
}

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

/** Thư xem trước do SERVER dựng — y hệt thư khách sẽ nhận. */
export type ReminderPreview = {
  subject: string;
  /** HTML đầy đủ, gồm khối thanh toán + mã QR (dạng data-URI để trình duyệt hiện được). */
  html: string;
  recipient: string | null;
};

/**
 * POST /reminders/preview — dựng thử thư, KHÔNG lưu và KHÔNG gửi.
 *
 * Vì sao không tự vẽ ở frontend: thư nhắc thanh toán có mã QR và số tài khoản. Dựng lại
 * một bản "gần giống" thì sớm muộn cũng lệch với thư thật — mà lệch ở đây nghĩa là
 * freelancer duyệt một đằng, khách nhận một nẻo, và tiền có thể chuyển nhầm chỗ.  #Huynh
 */
export async function previewReminder(payload: {
  reminder_type: ReminderType;
  target_type: ReminderTargetType;
  target_id: string;
  message: string;
  attachments?: ReminderImage[];
}): Promise<ReminderPreview> {
  const { data } = await axiosClient.post<ApiEnvelope<ReminderPreview>>(
    "/reminders/preview",
    payload
  );
  return data.data;
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
