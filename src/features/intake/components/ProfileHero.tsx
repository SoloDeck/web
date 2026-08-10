import { ExternalLink, Clock3, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileHeroData = {
  fullName: string;
  professionalTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  skills?: string[];
  portfolioUrl?: string | null;
};

/** Chữ cái đầu của họ và tên — dùng khi chưa có ảnh đại diện. */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Khối hồ sơ đứng đầu trang công khai: ảnh bìa, avatar đè lên bìa, tên, chức danh, giới
 * thiệu và kỹ năng.
 *
 * THUẦN TRÌNH BÀY, không tự gọi API — nhờ vậy màn Cài đặt dùng lại được chính component này
 * làm khung xem trước, và những gì freelancer thấy lúc chỉnh đúng từng pixel với những gì
 * khách sẽ thấy.
 *
 * Không có sao đánh giá, số lượt review, số dự án hay huy hiệu: SoloDesk là CRM riêng của
 * từng freelancer, không phải sàn để khách đem nhiều người ra so.  #Huynh
 */
export function ProfileHero({
  data,
  ctaHref = "#bieu-mau",
  onCtaClick,
}: {
  data: ProfileHeroData;
  /** Neo tới khối biểu mẫu. Ở khung xem trước thì truyền "" để nút thành trang trí. */
  ctaHref?: string;
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { fullName, professionalTitle, bio, avatarUrl, coverUrl, skills, portfolioUrl } = data;
  const shortName = fullName.trim().split(/\s+/).filter(Boolean).slice(-1)[0] || fullName;

  return (
    <div>
      {/* Ảnh bìa tỉ lệ 4:1. Chưa có ảnh thì dựng gradient TỪ CHÍNH màu chủ đạo (biến
          --primary đã bị ghi đè ở phần tử gốc), nên tài khoản chưa cấu hình gì vẫn ra một
          trang tử tế chứ không phải ô xám trống. */}
      <div className="relative h-40 w-full overflow-hidden rounded-b-2xl sm:h-56 lg:h-64">
        {coverUrl ? (
          <>
            <img src={coverUrl} alt="" className="size-full object-cover" />
            {/* Vệt tối chân ảnh để viền trắng của avatar không chìm khi ảnh bìa quá sáng. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </>
        ) : (
          <div className="relative size-full bg-gradient-to-br from-primary via-primary-glow to-primary">
            <div className="hero-dot-grid absolute inset-0 opacity-25" />
            <div className="absolute -top-16 -left-16 size-72 rounded-full bg-white/15 blur-3xl" />
          </div>
        )}
      </div>

      <div className="px-1">
        {/* -mt-12/-mt-16 = đúng nửa chiều cao avatar, để nó đè lên bìa như LinkedIn. */}
        <div className="relative -mt-12 sm:-mt-16">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="size-24 rounded-full object-cover ring-4 ring-background shadow-xl shadow-black/10 sm:size-32"
            />
          ) : (
            <div
              className={cn(
                "grid size-24 place-items-center rounded-full sm:size-32",
                "bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground sm:text-3xl",
                "ring-4 ring-background shadow-xl shadow-black/10",
              )}
            >
              {getInitials(fullName)}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{fullName}</h1>
            {professionalTitle && (
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">{professionalTitle}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={ShieldCheck}>Thông tin của bạn được bảo mật</Chip>
              <Chip icon={Clock3}>Phản hồi qua biểu mẫu</Chip>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {ctaHref ? (
              <a
                href={ctaHref}
                onClick={onCtaClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
              >
                <Send className="size-4" />
                Gửi yêu cầu cho {shortName}
              </a>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                <Send className="size-4" />
                Gửi yêu cầu cho {shortName}
              </span>
            )}
            {portfolioUrl && (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-secondary"
              >
                <ExternalLink className="size-4" />
                Portfolio
              </a>
            )}
          </div>
        </div>

        {(bio || (skills && skills.length > 0)) && (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {bio && (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
                <h2 className="text-sm font-semibold">Giới thiệu</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {bio}
                </p>
              </section>
            )}
            {skills && skills.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
                {/* Đúng chữ "Kỹ năng" — KHÔNG thêm "nổi bật": trang này không xếp hạng ai. */}
                <h2 className="text-sm font-semibold">Kỹ năng</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}
