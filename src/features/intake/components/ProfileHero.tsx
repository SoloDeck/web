import { ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileHeroData = {
  fullName: string;
  professionalTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
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
 * Khối hồ sơ đứng đầu trang công khai: ảnh bìa, avatar đè lên bìa, tên, chức danh, giới thiệu.
 *
 * KHÔNG có nút "Gửi yêu cầu" riêng: thanh trên đầu trang đã ghim sẵn một nút như vậy, để hai
 * cái cạnh nhau là bắt người ta cân nhắc giữa hai đường dẫn tới cùng một chỗ.
 *
 * THUẦN TRÌNH BÀY, không tự gọi API — nhờ vậy màn Cài đặt dùng lại được chính component này
 * làm khung xem trước, và những gì freelancer thấy lúc chỉnh đúng từng pixel với những gì
 * khách sẽ thấy.
 *
 * Không có sao đánh giá, số lượt review, số dự án hay huy hiệu: SoloDesk là CRM riêng của
 * từng freelancer, không phải sàn để khách đem nhiều người ra so.  #Huynh
 */
export function ProfileHero({ data }: { data: ProfileHeroData }) {
  const { fullName, professionalTitle, bio, avatarUrl, coverUrl, portfolioUrl } = data;

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
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
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

        {/* Một cột, không phải lưới: khối "Kỹ năng" bên phải đã bỏ, để nguyên
            `lg:grid-cols-[1.6fr_1fr]` thì phần giới thiệu co còn 1.6/2.6 bề ngang và chừa
            một mảng trống bên cạnh. */}
        {bio && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <h2 className="text-sm font-semibold">Giới thiệu</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {bio}
            </p>
          </section>
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
