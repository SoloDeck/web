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
          // CHỈ tin server cho trạng thái công khai: đây là thứ quyết định hồ sơ có
          // lên danh bạ hay không, để bản nháp localStorage đè lên là hiển thị sai
          // với chính chủ.  #Huynh
          isListed: me.is_listed ?? false,
          serviceCategories: me.service_categories ?? prev.serviceCategories,
          hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : prev.hourlyRate,
          portfolioUrl: me.professional_profile?.portfolio_url ?? prev.portfolioUrl,
          skills: me.professional_profile?.skills?.length
            ? me.professional_profile.skills
            : prev.skills,
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
