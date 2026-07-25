import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

export type ZaloStatus = {
  connected: boolean;
  oa_id: string | null;
  /** "mock" = chế độ phát triển (không gửi thật) · "real" = gọi Zalo thật. */
  mode: "mock" | "real";
};

/** URL để chuyển hướng freelancer sang Zalo cấp quyền OA (ở mock trỏ về callback backend). */
export async function getZaloConnectUrl(): Promise<string> {
  const { data } = await axiosClient.get<ApiResponse<{ url: string }>>("/zalo/connect-url");
  return data.data.url;
}

export async function getZaloStatus(): Promise<ZaloStatus> {
  const { data } = await axiosClient.get<ApiResponse<ZaloStatus>>("/zalo/status");
  return data.data;
}

export async function disconnectZalo(): Promise<ZaloStatus> {
  const { data } = await axiosClient.delete<ApiResponse<ZaloStatus>>("/zalo/connection");
  return data.data;
}
