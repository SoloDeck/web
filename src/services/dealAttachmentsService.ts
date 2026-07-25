import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";

// ---------------------------------------------------------------------------
// File khách gửi kèm deal — brief dự án PDF, hợp đồng scan, biên nhận chuyển khoản.
//
// AI ĐỌC file PDF này để chấm điểm deal: backend bóc chữ ngay lúc upload và đưa vào
// khối "KHÁCH HÀNG NÓI GÌ" của prompt. Nhờ vậy deal tạo tay không còn tự động COLD —
// khách gửi brief thì đó chính là lời khách.
//
// Trước đây frontend nhét cả nội dung file dạng base64 vào localStorage: ~5MB là vỡ,
// đổi máy là mất sạch, và file không bao giờ rời khỏi trình duyệt nên không gửi được
// cho khách. Giờ file nằm trên object storage (MinIO/S3).
// ---------------------------------------------------------------------------

export type DealAttachment = {
  id: string;
  deal_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  /**
   * AI có đọc được nội dung file này không.
   *
   * PDF scan từ máy in là ẢNH — không có lớp chữ nào để bóc, nên `false`. Phải hiện rõ
   * cho người dùng, đừng để họ upload ảnh scan rồi tưởng AI đã đọc.
   */
  ai_readable: boolean;
  created_at: string;
};

/** Loại file backend chấp nhận. Không nhận .exe/.html — mở file là dính XSS. */
export const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx";

export const MAX_FILE_SIZE_MB = 10;

/** POST /deals/{id}/attachments — upload (multipart). PDF sẽ được bóc chữ cho AI đọc. */
export async function uploadDealAttachment(
  dealId: string,
  file: File
): Promise<DealAttachment> {
  const form = new FormData();
  form.append("file", file);

  const { data } = await axiosClient.post<ApiResponse<DealAttachment>>(
    `/deals/${dealId}/attachments`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

/** GET /deals/{id}/attachments */
export async function listDealAttachments(dealId: string): Promise<DealAttachment[]> {
  const { data } = await axiosClient.get<ApiResponse<DealAttachment[]>>(
    `/deals/${dealId}/attachments`
  );
  return data.data ?? [];
}

/**
 * GET /deals/attachments/{id}/download — lấy nội dung file dạng Blob.
 *
 * Tách riêng khỏi `downloadDealAttachment` để dùng lại cho việc XEM TRONG APP: cùng một
 * request, khác chỗ đổ ra. Trước đây chỉ có đường tải về, nên muốn xem một cái brief PDF là
 * phải tải xuống rồi mở bằng phần mềm ngoài — rời khỏi app giữa lúc đang làm việc.  #Huynh
 */
export async function fetchDealAttachmentBlob(attachmentId: string): Promise<Blob> {
  const { data } = await axiosClient.get<Blob>(
    `/deals/attachments/${attachmentId}/download`,
    { responseType: "blob" }
  );
  return data;
}

/** Tải file về máy. */
export async function downloadDealAttachment(
  attachmentId: string,
  filename: string
): Promise<void> {
  const blob = await fetchDealAttachmentBlob(attachmentId);

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/** Loại file xem được ngay trong app. .docx/.xlsx thì trình duyệt không render được. */
export function isViewableInApp(contentType: string): boolean {
  return contentType === "application/pdf" || contentType.startsWith("image/");
}

/** DELETE /deals/attachments/{id} */
export async function deleteDealAttachment(attachmentId: string): Promise<void> {
  await axiosClient.delete(`/deals/attachments/${attachmentId}`);
}
