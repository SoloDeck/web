import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { disconnectZalo, getZaloConnectUrl, getZaloStatus } from "@/services/zaloService";

export const zaloKeys = {
  status: ["zalo", "status"] as const,
};

export function useZaloStatus() {
  return useQuery({
    queryKey: zaloKeys.status,
    queryFn: getZaloStatus,
  });
}

/** Lấy URL kết nối rồi chuyển hướng cả trang sang Zalo (ở mock: về callback → quay lại). */
export function useConnectZalo() {
  return useMutation({
    mutationFn: getZaloConnectUrl,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

export function useDisconnectZalo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disconnectZalo,
    onSuccess: (status) => {
      qc.setQueryData(zaloKeys.status, status);
    },
  });
}
