import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFreelancer } from "@/features/freelancers/hooks/useFreelancers";
import { CATEGORY_LABEL } from "@/features/freelancers/data/categories";

/**
 * Hồ sơ công khai của một freelancer — KHÔNG cần đăng nhập.
 *
 * Đây là mắt xích từng thiếu: danh bạ tìm được người rồi mà không có đường đi tiếp, nút
 * "Xem hồ sơ" chỉ bắn toast "đang phát triển". Giờ khách xem được hồ sơ và bấm thẳng sang
 * biểu mẫu tiếp nhận của chính người đó — yêu cầu rơi vào Kanban của họ và được AI chấm
 * điểm, khép trọn vòng với phần CRM vốn đã chạy.  #Huynh
 */
export function FreelancerProfilePage({ id }: { id: string }) {
  const { data: f, isPending, isError } = useFreelancer(id);

  if (isPending) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Shell>
    );
  }

  // Backend trả 404 cho cả "không tồn tại" lẫn "chưa bật hiện công khai" — cố ý không phân
  // biệt, vì nói ra là để lộ có tài khoản đó hay không.
  if (isError || !f) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <h1 className="text-xl font-bold">Không tìm thấy hồ sơ này</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Freelancer có thể đã tắt hiển thị công khai, hoặc đường dẫn không đúng.
          </p>
          <Link
            to="/find-freelancer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Tìm freelancer khác
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <article className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={cn(
              "flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white",
              f.avatarBg,
            )}
          >
            {f.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{f.name}</h1>
              {f.verified && <CheckCircle2 className="h-5 w-5 text-primary" />}
              {f.badge && (
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {f.badge}
                </span>
              )}
            </div>
            {f.title && <p className="mt-1 text-sm text-muted-foreground">{f.title}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{f.rating}</span>
                <span>({f.reviews} đánh giá)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {f.projects} dự án đã hoàn thành
              </span>
            </div>
          </div>
        </header>

        {f.bio && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-semibold">Giới thiệu</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {f.bio}
            </p>
          </section>
        )}

        {f.categoryIds.length > 0 && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="mb-3 text-sm font-semibold">Nhóm dịch vụ</h2>
            <div className="flex flex-wrap gap-1.5">
              {f.categoryIds.map((cid) => (
                <span
                  key={cid}
                  className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {CATEGORY_LABEL[cid] ?? cid}
                </span>
              ))}
            </div>
          </section>
        )}

        {f.skills && f.skills.length > 0 && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="mb-3 text-sm font-semibold">Kỹ năng</h2>
            <div className="flex flex-wrap gap-1.5">
              {f.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          {/* Nút CHÍNH của cả trang. Không có token thì ẩn hẳn thay vì để nút dẫn tới 404 —
              tài khoản cũ chưa được sinh token, và freelancer có quyền không mở nhận yêu
              cầu.  #Huynh */}
          {f.intakeShareToken ? (
            <Link
              to="/bieu-mau/$token"
              params={{ token: f.intakeShareToken }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90"
            >
              <Send className="h-4 w-4" />
              Gửi yêu cầu cho {f.name.split(" ").slice(-1)[0]}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Freelancer này hiện chưa mở nhận yêu cầu qua SoloDesk.
            </p>
          )}

          {f.portfolioUrl && (
            <a
              href={f.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4" />
              Xem portfolio
            </a>
          )}
        </footer>
      </article>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/find-freelancer"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        {children}
      </div>
    </div>
  );
}
