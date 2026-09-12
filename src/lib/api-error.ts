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

/**
 * Câu backend trả về khi nó KHÔNG biết chuyện gì vừa xảy ra (mọi lỗi 500 chưa được phân
 * loại đều mang đúng câu này — xem `shared/exceptions/http.py`).
 *
 * Vô dụng với người dùng: vừa tiếng Anh, vừa không nói được hỏng ở đâu. Trước đây nó lọt
 * thẳng ra toast — bấm xoá hoá đơn nháp thì màn hình chỉ hiện "An unexpected error occurred",
 * người dùng không biết mình làm sai hay hệ thống lỗi.  #Huynh
 */
const BACKEND_GENERIC_ERROR = "An unexpected error occurred";

/**
 * Câu backend đặt cho MỌI lỗi 422, không trừ endpoint nào (`shared/exceptions/http.py`).
 *
 * Cũng vô dụng như câu trên, và còn hay gặp hơn: gõ nhầm một ô là gặp. Chữ nói rõ ô nào sai
 * nằm trong `error.details`, nên gặp câu này thì đi ghép `details` lại chứ đừng in ra.  #Huynh
 */
const BACKEND_VALIDATION_ERROR = "Request validation failed";

/** Ghép mọi lời giải thích trong `error.details` của lỗi 422 thành một câu đọc được. */
function joinApiErrorDetails(err: unknown): string {
  const details = (err as ApiErrorEnvelope)?.response?.data?.error?.details;
  if (!Array.isArray(details)) return "";
  return details
    .map((d) =>
      // Pydantic dán sẵn "Value error, " trước câu do validator của dự án ném ra — và câu
      // phía sau đã là tiếng Việt viết cho người dùng đọc.
      typeof d?.message === "string" ? d.message.replace(/^Value error,\s*/, "").trim() : ""
    )
    .filter(Boolean)
    .join("; ");
}

/**
 * Thông điệp lỗi từ backend; trả về `fallback` khi lỗi mạng, sai hình dạng, hoặc khi backend
 * chỉ nói được câu chung vô nghĩa.
 *
 * Nhờ vậy mỗi nơi gọi chỉ cần truyền một `fallback` tiếng Việt nói rõ việc vừa thất bại là
 * gì, và câu đó sẽ thắng câu chung của backend.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as ApiErrorEnvelope)?.response?.data?.error?.message;
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (trimmed && trimmed !== BACKEND_GENERIC_ERROR && trimmed !== BACKEND_VALIDATION_ERROR) {
    return trimmed;
  }
  return joinApiErrorDetails(err) || fallback;
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
