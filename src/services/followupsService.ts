import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// AI soạn tin nhắn nhắc khách — POST /ai/followups/generate
//
// Backend CHỈ soạn bản nháp, KHÔNG tự gửi. Tin nhắn này đi thẳng tới khách hàng
// nên bắt buộc phải có người đọc lại trước — freelancer sửa rồi tự copy sang
// Zalo/email.
// ---------------------------------------------------------------------------

/** Khớp `ReminderType` trong contracts/openapi.yaml. */
export type ReminderType =
  | "follow_up"
  | "proposal_follow_up"
  | "contract_signing_nudge"
  | "payment_due"
  | "payment_overdue"
  | "re_engagement"
  | "custom";

/** Khớp `ReminderTargetType` trong contracts/openapi.yaml. */
export type ReminderTargetType = "deal" | "client" | "invoice" | "contract";

/**
 * Giọng văn — Phiếu SU26SE083 (dòng 105) đòi "chọn được giọng trang trọng hoặc thân mật".
 * Mặc định trang trọng: gửi nhầm giọng suồng sã cho khách công ty thì mất mặt, còn gửi
 * nhầm giọng lịch sự cho khách quen thì cùng lắm hơi khách sáo.
 */
export type FollowUpTone = "formal" | "friendly";

export type FollowUpRequest = {
  reminder_type: ReminderType;
  target_type: ReminderTargetType;
  target_id: string;
  language?: "vi" | "en";
  tone?: FollowUpTone;
};

export type FollowUpResponse = {
  message_text: string;
  generation_id: string;
  subject?: string;
};

export async function generateFollowUp(payload: FollowUpRequest): Promise<FollowUpResponse> {
  const { data } = await axiosClient.post<ApiResponse<FollowUpResponse>>(
    "/ai/followups/generate",
    { language: "vi", ...payload }
  );
  return data.data;
}
