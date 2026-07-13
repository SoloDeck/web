import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Mail, MapPin, Pencil, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { SPECIALIZATIONS, type SpecializationOption } from "@/features/onboarding/constants";
import { useCompleteOnboarding, useMe } from "@/features/onboarding/hooks/useOnboarding";
import { markOnboardingSkipped } from "@/features/onboarding/skip";
import { AvatarUpload } from "@/features/profile/components/AvatarUpload";
import { loadProfile, saveProfile } from "@/services/profileService";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { cn } from "@/lib/utils";

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const complete = useCompleteOnboarding();

  // Chỉ giữ phần người dùng đã sửa; chưa sửa thì đọc thẳng từ server. Tránh phải
  // dùng useEffect để bơm dữ liệu server vào state (gây render dây chuyền, và là
  // thứ eslint chặn) — giá trị hiển thị luôn là "bản nháp nếu có, không thì server".
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState<"name" | "phone" | "bio" | null>(null);
  const [spec, setSpec] = useState<SpecializationOption | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const email = me?.email ?? "";
  const fullName = nameDraft ?? me?.full_name ?? "";
  const bio = bioDraft ?? me?.bio ?? "";
  const avatarUrl = avatarDraft ?? me?.avatar_url ?? "";
  const phone = phoneDraft ?? me?.phone ?? "";

  function handleFinish() {
    if (!spec) return;

    complete.mutate(
      { spec, fullName, bio, phone, avatarUrl },
      {
        onSuccess: () => {
          // Màn Cài đặt hồ sơ đọc từ localStorage — ghi luôn để hai màn không lệch.
          const local = loadProfile();
          saveProfile({
            ...local,
            fullName,
            email,
            bio: bio.trim(),
            phone: phone.trim(),
            avatarUrl,
            professionalTitle: spec.label,
            skills: spec.skills,
            serviceCategories: [spec.id],
          });

          toast.success("Đã thiết lập hồ sơ!", {
            description: "Bạn có thể quay lại chỉnh sửa bất cứ lúc nào trong Cài đặt hồ sơ.",
          });
          navigate({ to: "/" });
        },
        onError: (err: unknown) => {
          // Số điện thoại là UNIQUE ở BE; thông điệp BE trả về là tiếng Anh nên
          // thay bằng câu tiếng Việt thay vì đọc nguyên si.
          if (getApiErrorStatus(err) === 409) {
            toast.error("Số điện thoại này đã được tài khoản khác sử dụng.");
            setEditing("phone"); // mở sẵn ô để họ sửa ngay, khỏi phải mò lại
            return;
          }
          toast.error(getApiErrorMessage(err, "Không lưu được hồ sơ. Vui lòng thử lại."));
        },
      }
    );
  }

  function handleSkip() {
    // Guard ở "/" cũng đẩy người chưa có hồ sơ về đây — không ghi nhận việc bỏ qua
    // thì hai bên đá qua đá lại thành vòng lặp vô tận.
    markOnboardingSkipped();
    navigate({ to: "/" });
  }

  const saving = complete.isPending;

  return (
    <div className="min-h-screen bg-background px-6 py-14">
      <div className="mx-auto w-full max-w-3xl">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-lg font-bold leading-none tracking-tight">SoloDesk</div>
        </div>

        {/* Tiêu đề */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Hoàn tất hồ sơ của bạn</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn có thể quay lại và cập nhật hồ sơ của mình bất cứ lúc nào.
          </p>
        </div>

        {/* ── Thẻ hồ sơ ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <AvatarUpload
              value={avatarUrl}
              name={fullName || "?"}
              onChange={setAvatarDraft}
              size={112}
              badge
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              {/* Tên hiển thị — sửa tại chỗ */}
              {editing === "name" ? (
                <input
                  autoFocus
                  value={fullName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                  }}
                  placeholder="Tên hiển thị"
                  aria-label="Tên hiển thị"
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-2xl font-bold tracking-tight outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing("name")}
                  className="inline-flex max-w-full items-center gap-2 transition-colors hover:text-foreground"
                >
                  <span className="truncate text-2xl font-bold tracking-tight">
                    {fullName || "Thêm tên hiển thị"}
                  </span>
                  <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              )}

              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{email || "—"}</span>
              </div>

              {/* Chức danh — tự điền khi chọn nghề bên dưới */}
              <button
                type="button"
                onClick={() => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm transition-colors hover:text-foreground"
              >
                {spec ? (
                  <span className="font-semibold">{spec.label}</span>
                ) : (
                  <span className="text-muted-foreground underline decoration-dotted underline-offset-4">
                    Thêm chức danh
                  </span>
                )}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {/* Địa điểm + số điện thoại */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Việt Nam
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {editing === "phone" ? (
                    <input
                      autoFocus
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                      }}
                      placeholder="0901 234 567"
                      aria-label="Số điện thoại"
                      className="w-36 rounded-md border border-border bg-background px-2 py-0.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing("phone")}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    >
                      {phone ? (
                        <span className="text-foreground">{phone}</span>
                      ) : (
                        <span className="underline decoration-dotted underline-offset-4">
                          Thêm số điện thoại
                        </span>
                      )}
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>

              {/* Câu giới thiệu — BE lưu ở `users.bio` */}
              <div className="mt-4">
                {editing === "bio" ? (
                  <>
                    <textarea
                      autoFocus
                      rows={3}
                      value={bio}
                      maxLength={300}
                      onChange={(e) => setBioDraft(e.target.value)}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") e.currentTarget.blur();
                      }}
                      placeholder="Ví dụ: Mình có 5 năm kinh nghiệm thiết kế nhận diện thương hiệu cho các startup Việt."
                      aria-label="Câu giới thiệu"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="mt-1 text-right text-[11px] text-muted-foreground">
                      {bio.length}/300
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing("bio")}
                    className="inline-flex max-w-full items-start gap-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {bio ? (
                      <span className="whitespace-pre-wrap">{bio}</span>
                    ) : (
                      <span className="underline decoration-dotted underline-offset-4">
                        Thêm câu giới thiệu ngắn
                      </span>
                    )}
                    <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  </button>
                )}
              </div>

              {/* Kỹ năng được điền hộ — hồ sơ "thành hình" ngay trước mắt */}
              {spec && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {spec.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Chọn nghề ─────────────────────────────────────────────────── */}
        <div ref={pickerRef} className="mt-8">
          <h3 className="text-sm font-semibold">Bạn chuyên về mảng nào?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Chọn một mảng — chức danh và kỹ năng sẽ được điền sẵn vào hồ sơ ở trên.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SPECIALIZATIONS.map((item) => {
              const active = spec?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSpec(item)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{item.label}</div>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Hành động ─────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Bỏ qua, để sau
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!spec || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Đang lưu..." : "Bắt đầu dùng SoloDesk"}
          </button>
        </div>
      </div>
    </div>
  );
}
