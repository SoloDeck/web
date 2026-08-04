import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SpecializationOption } from "@/features/onboarding/constants";
import {
  getMe,
  updateFreelancerProfile,
  updateMe,
  updateProfessionalProfile,
} from "@/services/usersService";

export const onboardingKeys = {
  me: ["users", "me"] as const,
};

/** Hồ sơ hiện tại — dùng để hiện sẵn tên/email đã đăng ký lên thẻ. */
export function useMe() {
  return useQuery({
    queryKey: onboardingKeys.me,
    queryFn: getMe,
  });
}

export type CompleteOnboardingInput = {
  spec: SpecializationOption;
  fullName: string;
  bio: string;
  phone: string;
  avatarUrl: string;
};

/**
 * Hoàn tất onboarding: ghi số điện thoại/avatar rồi tới hồ sơ nghề nghiệp.
 *
 * Thứ tự có chủ đích. Số điện thoại là thứ duy nhất BE có thể từ chối (UNIQUE →
 * 409). Nếu gộp cả ba vào Promise.all thì phone hỏng nhưng specialization vẫn
 * được lưu — guard ở "/" sẽ tưởng đã onboard xong và thả người dùng vào workspace
 * với số điện thoại chưa lưu, không bao giờ hỏi lại.
 */
export function useCompleteOnboarding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ spec, fullName, bio, phone, avatarUrl }: CompleteOnboardingInput) => {
      await updateMe({
        // BE từ chối tên rỗng — chưa sửa gì thì đừng gửi, để nguyên tên lúc đăng ký.
        full_name: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      });

      await Promise.all([
        updateFreelancerProfile({
          professional_title: spec.label,
          bio: bio.trim() || undefined,
          skills: spec.skills,
          // Slug danh bạ, KHÔNG phải `spec.id`. Ghi `spec.id` ("Web Developer") thì
          // /find-freelancer lọc mãi không ra, và giờ backend cũng trả 422.  #Huynh
          service_categories: [spec.categorySlug],
          avatar_url: avatarUrl || undefined,
        }),
        updateProfessionalProfile({
          specialization: spec.id,
          skills: spec.skills,
        }),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.me });
    },
  });
}
