import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Profile } from "@/features/profile/types";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { updateFreelancerProfile, updateMe, usersKeys } from "@/services/usersService";
import { getApiErrorDetail, getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";

/**
 * Lưu hồ sơ freelancer lên server: thông tin cơ bản, hồ sơ năng lực, nhận tiền, nhắc nhở.
 *
 * KHÔNG đụng tới diện mạo trang công khai (ảnh bìa, màu, tên đường dẫn) — ba trường đó do
 * màn "Trang công khai" giữ. Gửi kèm ở đây là ghi đè bằng bản nháp cũ của màn này mỗi lần
 * người dùng lưu một thứ chẳng liên quan.
 *
 * Tách khỏi `routes/index.tsx` vì hai lẽ: AGENTS.md nói `routes/` không chứa logic nghiệp
 * vụ, và bản cũ nằm trong component nên muốn test phải dựng cả workspace (sidebar, danh
 * sách deal, auth store, router) — tức là không ai test.
 *
 * Hai lượt ghi CỐ Ý nối tiếp chứ không `Promise.all`: số điện thoại là UNIQUE ở backend, gộp
 * lại thì số trùng (409) nhưng bio/kỹ năng/mức giá vẫn được lưu — hồ sơ nửa vời mà người
 * dùng không hề biết. Mỗi lượt bắt lỗi RIÊNG để 409 của số điện thoại không bị gán nhầm cho
 * lượt sau.  #Huynh
 */
export function useSaveProfile(onLocalSave: (p: Profile) => void) {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useCallback(
    async (p: Profile) => {
      onLocalSave(p);

      try {
        await updateMe({ full_name: p.fullName, phone: p.phone || undefined });
      } catch (err) {
        if (getApiErrorStatus(err) === 409) {
          toast.error(
            getApiErrorMessage(err, "Số điện thoại đã được tài khoản khác sử dụng."),
          );
        } else {
          toast.error("Không thể lưu hồ sơ lên server. Thay đổi vẫn được lưu cục bộ.");
        }
        return;
      }

      try {
        await updateFreelancerProfile({
          professional_title: p.professionalTitle || undefined,
          profession: p.profession || undefined,
          bio: p.bio || undefined,
          avatar_url: p.avatarUrl || undefined,
          // Hồ sơ năng lực. Trước đây ba trường này KHÔNG được gửi: kỹ năng chỉ vào được
          // một lần lúc onboarding, còn mức giá và portfolio thì không đường nào đặt —
          // trong khi trang công khai vẫn render sẵn nút Portfolio. Gửi cả chuỗi rỗng và
          // mảng rỗng để XOÁ được, đừng `|| undefined`.  #Huynh
          skills: p.skills,
          portfolio_url: p.portfolioUrl,
          default_hourly_rate: p.hourlyRate > 0 ? p.hourlyRate : undefined,
          // Thông tin nhận tiền + mặc định nhắc nhở. Gửi cả chuỗi rỗng (không dùng
          // `|| undefined`) để XOÁ được: freelancer đổi ngân hàng thì phải bỏ được số cũ,
          // mà số cũ nằm trong thư gửi khách.  #Huynh
          bank_code: p.bankCode,
          bank_account_number: p.bankAccountNumber,
          bank_account_holder: p.bankAccountHolder,
          momo_phone_number: p.momoPhone,
          bank_account_info: p.bankNote,
          reminder_signature: p.reminderSignature,
          reminder_default_channel: p.reminderChannel || undefined,
          reminder_default_hour: p.reminderHour ?? undefined,
        });
      } catch (err) {
        const status = getApiErrorStatus(err);
        if (status === 409) {
          toast.error(
            getApiErrorMessage(err, "Tên đường dẫn này đã có người dùng, bạn chọn tên khác nhé."),
          );
          return;
        }
        // 422 nói rõ sai ở trường nào, nhưng chữ đó nằm trong `error.details` chứ không phải
        // `error.message` (message luôn là câu chung "Request validation failed").
        const slugDetail = status === 422 ? getApiErrorDetail(err, "profile_slug") : undefined;
        toast.error(
          slugDetail ?? "Không thể lưu hồ sơ lên server. Thay đổi vẫn được lưu cục bộ.",
        );
        return;
      }

      // Thẻ link công khai đọc `profile_slug` qua React Query. Không dọn cache thì tên đường
      // dẫn vừa đặt không hiện ra tới 5 phút (`staleTime` mặc định, `refetchOnWindowFocus`
      // đang tắt) — người dùng tưởng lưu hỏng.  #Huynh
      qc.invalidateQueries({ queryKey: usersKeys.me });
      updateUser({ fullName: p.fullName });
      toast.success("Đã lưu hồ sơ.");
    },
    [onLocalSave, qc, updateUser],
  );
}
