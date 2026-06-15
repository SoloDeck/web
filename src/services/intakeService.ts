import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// Body accepted by the public intake endpoint (POST /api/v1/intake/{share_token}).
// `name` and `inquiry_text` are required; the rest are optional.
export type IntakePayload = {
  name: string;
  email?: string;
  phone?: string;
  inquiry_text: string;
  estimated_budget?: string;
  desired_timeline?: string;
};

export type IntakeResult = {
  id: string;
  submitted_at: string;
  message: string;
};

/**
 * POST /intake/{shareToken} — public, unauthenticated lead capture. The owner is
 * resolved server-side from the share token. Returns 404 for an unknown token,
 * 422 for invalid input, 429 when rate-limited.
 */
export async function submitIntake(
  shareToken: string,
  payload: IntakePayload,
): Promise<IntakeResult> {
  const { data } = await axiosClient.post<ApiResponse<IntakeResult>>(
    `/intake/${encodeURIComponent(shareToken)}`,
    payload,
  );
  return data.data;
}
