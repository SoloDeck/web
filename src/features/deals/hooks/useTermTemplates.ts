import { useQuery } from "@tanstack/react-query";

import { listContractTermTemplates } from "@/services/contractsService";
import { listProposalTermTemplates } from "@/services/proposalsService";

export type DocKind = "proposal" | "contract";

/**
 * Mẫu điều khoản (thư viện admin) freelancer được chọn trước khi sinh báo giá/hợp đồng.
 *
 * Chỉ trả mẫu đang bật, khớp nghề của freelancer + mẫu dùng chung. Rỗng = admin chưa tạo
 * mẫu nào cho nghề này. Luồng hợp đồng vẫn LUÔN hiện bộ chọn (chỉ có "AI tự viết" + chú
 * thích); luồng báo giá thì rỗng là sinh thẳng như cũ.
 */
export function useTermTemplates(kind: DocKind, enabled = true) {
  return useQuery({
    queryKey: ["term-templates", kind],
    queryFn: kind === "contract" ? listContractTermTemplates : listProposalTermTemplates,
    enabled,
  });
}
