import { Helmet } from "react-helmet-async";

import type { PublicProfileResponse } from "@/services/intakeService";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/seo/config";

const DESCRIPTION_MAX = 160;

function truncate(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Thẻ head cho trang hồ sơ công khai `/{slug}`.
 *
 * Bản HTML mà crawler thật sự đọc do BACKEND dựng (`/internal/render/profile/{slug}`,
 * nginx lái bot sang đó) — trang này là SPA, Googlebot có chạy JS nhưng Zalo/Messenger thì
 * không. Thẻ ở đây tồn tại cho hai việc còn lại: đặt đúng tiêu đề tab cho người dùng thật,
 * và giữ một bản mẫu để đối chiếu khi phía backend đổi chữ.
 *
 * Ảnh: chỉ nhận `avatar_url` dạng https. Ảnh đại diện có thể là data URL base64 (xem
 * `PublicProfileResponse`) — nhét nguyên cái đó vào `og:image` thì mọi bản xem trước link
 * đều hỏng câm, nên rơi về ảnh mặc định.  #Huynh
 */
export function ProfileSeoHead({
  profile,
  slug,
}: {
  profile: PublicProfileResponse;
  slug: string;
}) {
  const url = absoluteUrl(`/${slug}`);
  const title = profile.professional_title
    ? `${profile.full_name} — ${profile.professional_title} | ${SITE_NAME}`
    : `${profile.full_name} | ${SITE_NAME}`;
  const description = truncate(
    profile.bio ||
      [profile.professional_title, ...profile.skills].filter(Boolean).join(" · ") ||
      `Gửi yêu cầu dự án tới ${profile.full_name} qua trang hồ sơ trên ${SITE_NAME}.`,
  );
  const image = profile.avatar_url?.startsWith("https://")
    ? profile.avatar_url
    : DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="profile" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="vi_VN" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
