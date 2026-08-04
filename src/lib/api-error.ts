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
