import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/features/profile/types";
import { loadProfile, saveProfile } from "@/services/profileService";
import { getMe } from "@/services/usersService";

/** Profile state, seeded from localStorage then enriched from GET /users/me. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const mounted = useRef(false);

  // Hydrate identity fields from the backend on mount. Các trường server đã lưu
  // (bio, mức giá, portfolio) ưu tiên lấy từ BE; chỉ giữ giá trị localStorage khi
  // BE chưa có gì — tránh bản nháp cũ ở máy đè lên dữ liệu thật.
  useEffect(() => {
    getMe()
      .then((me) => {
        const rate = Number(me.professional_profile?.default_hourly_rate ?? NaN);

        setProfile((prev) => ({
          ...prev,
          fullName: me.full_name,
          email: me.email,
          // Server chưa có số thì để TRỐNG, đừng giữ bản nháp cũ: số điện thoại là
          // UNIQUE ở backend, gửi nhầm số của người khác lên là 409 và cả lượt lưu
          // hỏng theo.  #Huynh
          phone: me.phone ?? "",
          avatarUrl: me.avatar_url ?? prev.avatarUrl,
          bio: me.bio ?? prev.bio,
          profession: me.profession ?? prev.profession,
          // Diện mạo CHỈ tin server: ảnh bìa không được lưu vào localStorage (quá to), nên
          // bản nháp cục bộ không bao giờ có giá trị đúng cho ba trường này.
          coverUrl: me.cover_url ?? "",
          brandColor: me.brand_color ?? "",
          profileSlug: me.profile_slug ?? "",
          // Hồ sơ năng lực cũng CHỈ tin server. Ba dòng này trước đây rơi về bản nháp
          // localStorage khi server trả rỗng — hợp lý hồi chúng là trường chỉ-đọc, nhưng
          // nay sửa được thì hoá ra là chặn đường XOÁ: bỏ hết kỹ năng, bỏ link portfolio
          // hay xoá mức giá, lưu xong F5 là bản nháp cũ đè ngược lên.  #Huynh
          hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : 0,
          portfolioUrl: me.professional_profile?.portfolio_url ?? "",
          skills: me.professional_profile?.skills ?? [],
          // Thông tin nhận tiền + mặc định nhắc nhở CHỈ tin server: đây là dữ liệu đi vào
          // thư gửi khách (số tài khoản!), không được để bản nháp cũ trong localStorage đè
          // lên. Server chưa có thì để trống, đừng đoán.  #Huynh
          bankCode: me.payment_info?.bank_code ?? "",
          bankAccountNumber: me.payment_info?.bank_account_number ?? "",
          bankAccountHolder: me.payment_info?.bank_account_holder ?? "",
          momoPhone: me.payment_info?.momo_phone_number ?? "",
          bankNote: me.payment_info?.bank_account_info ?? "",
          reminderSignature: me.reminder_defaults?.reminder_signature ?? "",
          reminderChannel: me.reminder_defaults?.reminder_default_channel ?? "email",
          reminderHour: me.reminder_defaults?.reminder_default_hour ?? null,
          // `?? true` chứ không `?? false`: backend cũ chưa trả trường này thì coi như ĐÃ có
          // mật khẩu, để form vẫn hỏi mật khẩu cũ. Đoán ngược lại là bỏ mất một lớp kiểm.
          hasPassword: me.has_password ?? true,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveProfile(profile);
  }, [profile]);

  return { profile, setProfile };
}
