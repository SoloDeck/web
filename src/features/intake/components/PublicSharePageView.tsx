import { Send } from "lucide-react";
import { brandStyle } from "@/features/intake/brandTheme";
import { ProfileHero } from "@/features/intake/components/ProfileHero";
import { IntakeForm } from "@/features/intake/components/IntakeForm";
import type {
  PublicIntakeFormConfigResponse,
  PublicProfileResponse,
} from "@/services/intakeService";

/**
 * Phần TRÌNH BÀY của trang công khai — hồ sơ ở trên, biểu mẫu tiếp nhận ngay dưới.
 *
 * Tách khỏi `PublicSharePage` để màn cấu hình dùng lại được ĐÚNG component này làm khung xem
 * trước. Trước đây màn cấu hình tự vẽ lại một cái biểu mẫu giả — có thanh tím và dòng "Biểu
 * mẫu của X" không hề tồn tại trên trang thật, không ảnh bìa, không avatar, không ăn màu chủ
 * đạo. Freelancer xem một đằng, khách thấy một nẻo, và trang trông như đồ giả.
 *
 * Dùng chung một component thì không còn gì để lệch: đổi trang thật là khung xem trước đổi
 * theo, không cần nhớ sửa hai nơi.  #Huynh
 */
export function PublicSharePageView({
  profile,
  shareToken,
  previewConfig,
  variant = "page",
}: {
  profile: PublicProfileResponse;
  shareToken: string;
  /** Có thì biểu mẫu lấy cấu hình từ đây và không gọi API — dùng cho khung xem trước. */
  previewConfig?: PublicIntakeFormConfigResponse;
  /**
   * `preview` bỏ `min-h-screen` và thôi ghim header.
   *
   * Hai lớp đó nói về CỬA SỔ chứ không phải nội dung: để nguyên trong khung xem trước đã thu
   * nhỏ thì trang cao đúng 100vh rồi nhân với tỉ lệ, ra một khối trống hoác, còn header ghim
   * thì ghim vào khung chứ không vào màn hình. Ngoài hai lớp này, mọi thứ giống hệt.
   */
  variant?: "page" | "preview";
}) {
  const isPreview = variant === "preview";


  return (
    // Ghi đè --primary ở ĐÂY là cả cây con đổi màu theo: mọi bg-primary / text-primary /
    // bg-primary/10 / from-primary bên trong (kể cả trong IntakeForm) giải biến tại chỗ dùng.
    <div
      className={isPreview ? "bg-background" : "min-h-screen bg-background"}
      style={brandStyle(profile.brand_color)}
    >
      <header
        className={
          isPreview
            ? "border-b border-border/60 bg-background/85"
            : "sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl"
        }
      >
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <span className="size-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-glow" />
            )}
            <span className="hidden truncate text-sm font-semibold sm:inline">
              {profile.full_name}
            </span>
          </div>
          {/* Nút DUY NHẤT dẫn tới biểu mẫu. Khối hồ sơ từng có thêm một nút nữa y hệt —
              hai nút cạnh nhau tới cùng một chỗ chỉ bắt khách phải cân nhắc. */}
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("bieu-mau")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Send className="size-3.5" />
            Gửi yêu cầu
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <ProfileHero
          data={{
            fullName: profile.full_name,
            professionalTitle: profile.professional_title,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
            coverUrl: profile.cover_url,
            portfolioUrl: profile.portfolio_url,
          }}
        />

        <section id="bieu-mau" className="mt-10 scroll-mt-20 lg:mt-14">
          <IntakeForm shareToken={shareToken} previewConfig={previewConfig} />
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Trang được tạo bằng <span className="font-semibold text-foreground">SoloDesk</span>
      </footer>
    </div>
  );
}
