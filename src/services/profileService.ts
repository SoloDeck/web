import {
  DEFAULT_PROFILE,
  type Profile,
} from "@/features/profile/types";

// ---------------------------------------------------------------------------
// Profile service
//
// The freelancer's profile is local workspace config, so it persists to
// localStorage. This module is the single place that touches storage; when a
// backend `GET/PUT /profile` exists, only these bodies change.
// ---------------------------------------------------------------------------

const PROFILE_KEY = "solodesk.profile.v1";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_PROFILE;
}

/**
 * Ghi bản nháp hồ sơ vào localStorage — KHÔNG kèm ảnh, và không bao giờ ném lỗi.
 *
 * Hai lớp bảo vệ, cả hai đều cần:
 *
 * 1. Loại `avatarUrl`/`coverUrl` trước khi ghi. Hai trường này là data URL base64: riêng ảnh
 *    bìa đã ~250KB, avatar chưa nén còn tới 2.7MB — cộng lại vượt hạn ngạch ~5MB của
 *    localStorage. Mà chúng cũng chẳng cần ở đây: `useProfile` luôn lấy ảnh từ `GET
 *    /users/me`, server mới là nguồn thật.
 * 2. Bọc try/catch. Hàm này được gọi mỗi lần state đổi, nên một lần ném là màn Cài đặt
 *    trắng ngay giữa lúc người dùng đang gõ. Mất bản nháp cục bộ thì không sao — dữ liệu đã
 *    lưu vẫn nằm ở server.  #Huynh
 */
export function saveProfile(profile: Profile): void {
  try {
    const withoutImages = { ...profile, avatarUrl: "", coverUrl: "" };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(withoutImages));
  } catch {
    /* hết dung lượng hoặc trình duyệt chặn — bỏ qua, server vẫn là nguồn thật */
  }
}
