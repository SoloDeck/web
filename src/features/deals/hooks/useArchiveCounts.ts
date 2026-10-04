import { useQuery } from "@tanstack/react-query";
import { dealKeys } from "@/features/deals/hooks/useDeals";
import { countArchivedDeals, countLostDeals } from "@/services/dealsService";

/**
 * Số dự án trong Kho lưu trữ, theo từng mục.
 *
 * Kho có hai mục: dự án ĐÃ HOÀN THÀNH đóng quá 90 ngày, và dự án KHÔNG THÀNH CÔNG. Cả chân cột
 * "Hoàn Thành" (lối vào kho) lẫn ngăn kéo (số trên từng mục) đọc cùng hai con số này. Khoá nằm
 * dưới `dealKeys.all` nên mọi thao tác làm mới danh sách deal — loại bỏ dự án, xóa vĩnh viễn —
 * tự làm mới luôn chúng.  #Huynh
 */
export function useArchiveCounts() {
  const completed = useQuery({
    queryKey: [...dealKeys.all, "archived", "count"],
    queryFn: countArchivedDeals,
  });
  const lost = useQuery({
    queryKey: [...dealKeys.all, "lost", "count"],
    queryFn: countLostDeals,
  });

  return {
    /** `undefined` khi chưa tải xong — để giao diện không hiện số 0 giả. */
    completed: completed.data,
    lost: lost.data,
    total: (completed.data ?? 0) + (lost.data ?? 0),
  };
}
