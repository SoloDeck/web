/**
 * "Bỏ qua" chỉ có hiệu lực trong phiên làm việc hiện tại.
 *
 * BE không có cột nào để ghi nhận việc người dùng đã từ chối onboarding, nên nếu
 * không nhớ gì cả thì guard ở "/" sẽ đá họ ngược lại /onboarding ngay lập tức —
 * thành vòng lặp. Dùng sessionStorage: đủ để họ làm việc yên ổn trong phiên này,
 * và lần đăng nhập sau vẫn được hỏi lại (vì hồ sơ vẫn trống).
 */
const KEY = "solodesk.onboarding.skipped";

export function markOnboardingSkipped(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* trình duyệt chặn storage — cùng lắm là bị hỏi lại, không vỡ gì */
  }
}

export function wasOnboardingSkipped(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
