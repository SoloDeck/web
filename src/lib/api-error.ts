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
