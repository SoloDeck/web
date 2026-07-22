import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api-error";
import {
  deleteDealAttachment,
  listDealAttachments,
  uploadDealAttachment,
} from "@/services/dealAttachmentsService";

export const dealAttachmentKeys = {
  all: ["deal-attachments"] as const,
  forDeal: (dealId: string) => ["deal-attachments", dealId] as const,
};

export function useDealAttachments(dealId: string | undefined) {
  return useQuery({
    queryKey: dealAttachmentKeys.forDeal(dealId ?? ""),
    queryFn: () => listDealAttachments(dealId!),
    enabled: Boolean(dealId),
  });
}

export function useUploadDealAttachment(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadDealAttachment(dealId!, file),
    onSuccess: (attachment) => {
      qc.invalidateQueries({ queryKey: dealAttachmentKeys.forDeal(dealId ?? "") });

      // Nói rõ AI có đọc được không. PDF scan là ảnh — AI không đọc được lấy một chữ,
      // mà người dùng thì tưởng đã đọc rồi ngồi đợi điểm số cải thiện.
      if (attachment.ai_readable) {
        toast.success("Đã tải file lên. AI đọc được nội dung — chạy 'Đánh giá lại' để chấm điểm theo file này.");
      } else {
        toast.success("Đã tải file lên. AI không đọc được nội dung file này (ảnh scan hoặc không phải PDF).");
      }
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Không tải được file lên. Vui lòng thử lại.")),
  });
}

export function useDeleteDealAttachment(dealId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteDealAttachment(attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealAttachmentKeys.forDeal(dealId ?? "") });
      toast.success("Đã xoá file.");
    },
    onError: () => toast.error("Không xoá được file. Vui lòng thử lại."),
  });
}
