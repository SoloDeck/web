import type { ApiResponse } from "@/features/auth/types";
import axiosClient from "@/configs/axios";

export type UserResponse = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone: string | null;
  avatar_url: string | null;
  intake_share_token: string | null;
  created_at: string;
};

export type UpdateUserPayload = {
  full_name?: string;
  phone?: string;
};

export type FreelancerProfilePayload = {
  professional_title?: string;
  bio?: string;
  skills?: string[];
  service_categories?: string[];
  avatar_url?: string;
  portfolio_url?: string;
  is_listed?: boolean;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export async function getMe(): Promise<UserResponse> {
  const { data } = await axiosClient.get<ApiResponse<UserResponse>>("/users/me");
  return data.data;
}

export async function updateMe(payload: UpdateUserPayload): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>("/users/me", payload);
  return data.data;
}

export async function updateFreelancerProfile(payload: FreelancerProfilePayload): Promise<UserResponse> {
  const { data } = await axiosClient.patch<ApiResponse<UserResponse>>("/users/me/freelancer-profile", payload);
  return data.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await axiosClient.post("/users/me/change-password", payload);
}
