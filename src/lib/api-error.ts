// ---------------------------------------------------------------------------
// Đọc thông điệp lỗi từ envelope chuẩn của backend:
//   { success: false, code: 409, error: { message, code, details: [] } }
// Không dùng axios.isAxiosError để tránh phụ thuộc kiểu; chỉ cần đúng hình dạng.
// ---------------------------------------------------------------------------

type ApiErrorEnvelope = {
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
        code?: string;
        details?: { field?: string; message?: string }[];
      };
    };
  };
};

/** Mã HTTP backend trả về, nếu có. */
export function getApiErrorStatus(err: unknown): number | undefined {
  return (err as ApiErrorEnvelope)?.response?.status;
}

/** Thông điệp lỗi từ backend; trả về `fallback` khi lỗi mạng hoặc không đúng hình dạng. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as ApiErrorEnvelope)?.response?.data?.error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/**
 * Mã lỗi nghiệp vụ backend gửi kèm (`EMAIL_DELIVERY_FAILED`, `RATE_LIMITED`, …).
 *
 * Phân nhánh theo MÃ chứ đừng so khớp câu tiếng Việt: đổi một chữ trong thông báo mà làm
 * gãy luồng xử lý lỗi thì lần sau không ai dám sửa câu chữ nữa. Mã do backend khai ở
 * `shared/responses/error.py`, và nó là phần hợp đồng — câu chữ thì không.  #Huynh
 */
export function getApiErrorCode(err: unknown): string | undefined {
  const code = (err as ApiErrorEnvelope)?.response?.data?.error?.code;
  return typeof code === "string" && code ? code : undefined;
}

/**
 * Lời giải thích cho MỘT trường cụ thể trong lỗi 422.
 *
 * Cần riêng hàm này vì `error.message` của 422 luôn là câu chung `"Request validation
 * failed"` — vô dụng với người dùng. Chữ nói rõ sai chỗ nào chỉ nằm trong `error.details`,
 * mỗi phần tử một `{field, message}` (xem `shared/exceptions/http.py`).  #Huynh
 */
export function getApiErrorDetail(err: unknown, field: string): string | undefined {
  const details = (err as ApiErrorEnvelope)?.response?.data?.error?.details;
  if (!Array.isArray(details)) return undefined;
  const hit = details.find((d) => d?.field === field || d?.field?.endsWith(`.${field}`));
  if (typeof hit?.message !== "string" || !hit.message.trim()) return undefined;
  // Pydantic dán sẵn "Value error, " trước câu do validator ném ra. Câu phía sau đã là
  // tiếng Việt viết cho người dùng đọc, nên cắt tiền tố đi rồi mới đưa lên màn hình.
  return hit.message.replace(/^Value error,\s*/, "");
}
