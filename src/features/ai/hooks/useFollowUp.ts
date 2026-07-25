import { useMutation } from "@tanstack/react-query";

import { generateFollowUp, type FollowUpRequest } from "@/services/followupsService";

/**
 * Soạn tin nhắn nhắc khách bằng AI.
 *
 * Là `useMutation` chứ không phải `useQuery`: đây là hành động người dùng chủ động bấm,
 * mỗi lần bấm là một lần gọi AI tốn quota — không phải dữ liệu để cache và tự refetch.
 */
export function useGenerateFollowUp() {
  return useMutation({
    mutationFn: (payload: FollowUpRequest) => generateFollowUp(payload),
  });
}
