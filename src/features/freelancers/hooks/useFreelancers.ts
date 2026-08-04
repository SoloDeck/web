import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getFreelancer, listFreelancers } from "@/services/freelancersService";
import type { GetFreelancersParams } from "@/features/freelancers/types";

export function useFreelancers(params: GetFreelancersParams = {}) {
  const categoryIds = [...(params.categoryIds ?? [])].sort();
  const search = params.search?.trim() ?? "";

  return useQuery({
    queryKey: ["freelancers", { categoryIds, search }],
    queryFn: () => listFreelancers({ categoryIds, search }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Hồ sơ công khai của một freelancer — khác `useFreelancers` ở chỗ CÓ token biểu mẫu, thứ
 * trang hồ sơ cần để dựng nút "Gửi yêu cầu".
 *
 * Không đọc lại từ cache danh sách: bản trong danh sách thiếu token (backend cố ý không
 * trả), nên dùng nó sẽ ra một trang hồ sơ vĩnh viễn không có nút liên hệ.  #Huynh
 */
export function useFreelancer(id: string) {
  return useQuery({
    queryKey: ["freelancers", "detail", id],
    queryFn: () => getFreelancer(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
