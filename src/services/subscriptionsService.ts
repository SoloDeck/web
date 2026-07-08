import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

export type PlanResponse = {
  id: string;
  name: string;
  slug: "free" | "pro" | "agency";
  price_monthly: number;
  currency: string;
  can_use_ai: boolean;
  can_export_pdf: boolean;
  max_clients: number | null;
  max_deals: number | null;
  max_ai_generations_per_month: number;
};

export type SubscriptionStatus = "active" | "past_due" | "suspended" | "cancelled";

export type SubscriptionResponse = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_slug: "free" | "pro" | "agency";
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

export async function listPlans(): Promise<PlanResponse[]> {
  const { data } = await axiosClient.get<ApiResponse<PlanResponse[]>>("/subscriptions/plans");
  return data.data;
}

export async function getMySubscription(): Promise<SubscriptionResponse> {
  const { data } = await axiosClient.get<ApiResponse<SubscriptionResponse>>("/subscriptions/me");
  return data.data;
}
