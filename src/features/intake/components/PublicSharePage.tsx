import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { getPublicProfile } from "@/services/intakeService";
import { brandStyle } from "@/features/intake/brandTheme";
import { ProfileHero } from "@/features/intake/components/ProfileHero";
import { IntakeForm } from "@/features/intake/components/IntakeForm";

/**
 * Trang công khai của freelancer — thứ DUY NHẤT khách hàng nhìn thấy.
 *
 * Một trang, hai phần: hồ sơ ở trên (bìa, avatar, giới thiệu, kỹ năng) rồi biểu mẫu tiếp
 * nhận ngay dưới. Trước đây là hai trang tách rời, khách phải bấm thêm một lần mới điền
 * được — mỗi lần bấm là một chỗ để rơi rụng.
 *
 * Ba đường đều dẫn tới đây: `/{slug}`, `/ho-so/{token}`, `/bieu-mau/{token}` và
 * `/intake/{token}`. Backend tra một truy vấn cho cả slug lẫn token nên component không cần
 * biết mình đang nhận cái nào.
 *
 * Query hồ sơ đặt Ở ĐÂY chứ không nhét vào `IntakeForm`: giữ `IntakeForm` chỉ phụ thuộc
 * đúng ba hàm service như cũ, nhờ vậy bộ test 285 dòng của nó không phải sửa dòng nào.  #Huynh
 */
export function PublicSharePage({ shareToken }: { shareToken: string }) {
  const {
    data: profile,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["public-profile", shareToken],
    queryFn: () => getPublicProfile(shareToken),
    staleTime: 30_000,
    retry: false,
  });

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  // Backend dùng CHUNG một câu 404 cho token sai lẫn không tồn tại — phân biệt hai trường
  // hợp là biến trang này thành máy dò xem đường dẫn nào có thật. Nhánh này cố ý trả về
  // sớm, không dựng header/footer: không có link nào để đi lang thang tìm người khác.
  if (isError || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Không tìm thấy hồ sơ này</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Đường dẫn có thể không đúng hoặc đã hết hiệu lực. Bạn hãy hỏi lại người đã gửi
            link cho bạn nhé.
          </p>
        </div>
      </div>
    );
  }

  const scrollToForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("bieu-mau");
    if (!target) return;
    e.preventDefault();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    // Ghi đè --primary ở ĐÂY là cả cây con đổi màu theo: mọi bg-primary / text-primary /
    // bg-primary/10 / from-primary bên trong (kể cả trong IntakeForm) giải biến tại chỗ dùng.
    <div className="min-h-screen bg-background" style={brandStyle(profile.brand_color)}>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
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
          {/* <button> chứ không phải <a>: giữ cho trang có ĐÚNG MỘT link "gửi yêu cầu" —
              cái ở khối hồ sơ — nên phép đếm trong test vẫn nói được điều nó muốn nói. */}
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
            skills: profile.skills,
            portfolioUrl: profile.portfolio_url,
          }}
          onCtaClick={scrollToForm}
        />

        <section id="bieu-mau" className="mt-10 scroll-mt-20 lg:mt-14">
          <IntakeForm shareToken={shareToken} />
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Trang được tạo bằng <span className="font-semibold text-foreground">SoloDesk</span>
      </footer>
    </div>
  );
}
