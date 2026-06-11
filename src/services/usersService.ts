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
  created_at: string;
};

export type UpdateUserPayload = {
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
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

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await axiosClient.post("/users/me/change-password", payload);
}
