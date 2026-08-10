import { useEffect, useRef, useState } from "react";
import { Check, Eye, ImageIcon, Link2, Palette } from "lucide-react";
import type { Profile } from "@/features/profile/types";
import { CoverUpload } from "@/features/profile/components/CoverUpload";
import {
  BRAND_PRESETS,
  DEFAULT_BRAND_COLOR,
  brandStyle,
  isHexColor,
  readableOn,
} from "@/features/intake/brandTheme";
import { ProfileHero } from "@/features/intake/components/ProfileHero";

/**
 * Tab "Trang công khai" — freelancer chỉnh diện mạo trang mà khách hàng sẽ mở.
 *
 * Khung xem trước bên phải render CHÍNH `ProfileHero` của trang thật, không phải bản vẽ
 * lại. Nhờ vậy thứ freelancer thấy lúc chỉnh đúng từng pixel với thứ khách sẽ thấy, và
 * không có chuyện xem trước tụt lại phía sau mỗi lần trang thật đổi.
 *
 * KHÔNG tự gọi API: mọi thứ đi qua `draft`/`onChange` của màn Cài đặt, dùng chung một nút
 * Lưu với tab Hồ sơ. Thêm một đường lưu riêng ở đây là thêm một trạng thái "chưa lưu" thứ
 * hai trên cùng màn hình.  #Huynh
 */
export function AppearanceSettings({
  draft,
  onChange,
  slugError,
}: {
  draft: Profile;
  onChange: (next: Profile) => void;
  /**
   * Lỗi tên đường dẫn, do màn Cài đặt tính (`validateSlug` trong `slugRules.ts`) và truyền
   * xuống. Ở đây chỉ hiển thị: màn cha cần chính giá trị này để khoá nút Lưu, nên để cha
   * tính một lần rồi chia xuống, thay vì tính hai nơi rồi có ngày lệch nhau.
   */
  slugError: string | null;
}) {
  const activeColor = isHexColor(draft.brandColor) ? draft.brandColor : DEFAULT_BRAND_COLOR;
  const needsDarkText = readableOn(activeColor) !== "#ffffff";
  const slug = draft.profileSlug.trim().toLowerCase();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Link2 className="size-3.5" /> Địa chỉ riêng
          </div>
          <label className="block text-sm font-medium" htmlFor="profile-slug">
            Tên đường dẫn
          </label>
          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
            <span className="flex items-center bg-muted/40 px-3 text-xs text-muted-foreground">
              {origin.replace(/^https?:\/\//, "")}/
            </span>
            <input
              id="profile-slug"
              value={draft.profileSlug}
              onChange={(e) =>
                onChange({ ...draft, profileSlug: e.target.value.toLowerCase() })
              }
              placeholder="thu-thuy"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>
          {slugError ? (
            <p className="mt-2 text-xs leading-5 text-destructive">{slugError}</p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {slug
                ? `Khách sẽ mở trang của bạn tại ${origin}/${slug}`
                : "Chưa đặt thì khách vẫn vào được bằng link dài ở tab Hồ sơ. Đặt tên riêng cho dễ đọc và dễ nhớ hơn."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <ImageIcon className="size-3.5" /> Ảnh bìa
          </div>
          <CoverUpload
            value={draft.coverUrl}
            onChange={(coverUrl) => onChange({ ...draft, coverUrl })}
          />
        </section>

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Palette className="size-3.5" /> Màu chủ đạo
          </div>

          <div className="flex flex-wrap gap-2.5">
            {BRAND_PRESETS.map((p) => {
              const selected = activeColor.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...draft, brandColor: p.hex })}
                  className={`grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-card transition ${
                    selected ? "ring-2 ring-foreground/40" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: p.hex }}
                >
                  {selected && (
                    <Check className="size-4" style={{ color: readableOn(p.hex) }} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Màu khác
              <input
                type="color"
                aria-label="Chọn màu tự do"
                value={activeColor}
                onChange={(e) => onChange({ ...draft, brandColor: e.target.value })}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
            </label>
            <span className="font-mono text-xs text-muted-foreground">{activeColor}</span>
            {draft.brandColor && (
              <button
                type="button"
                onClick={() => onChange({ ...draft, brandColor: "" })}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Về màu mặc định
              </button>
            )}
          </div>

          {needsDarkText && (
            <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-5">
              Màu này khá sáng nên chữ trên nút sẽ chuyển sang màu tối cho dễ đọc. Bạn xem
              thử bên phải nhé.
            </p>
          )}
        </section>
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Eye className="size-3.5" /> Xem trước · góc nhìn khách hàng
        </div>
        <PreviewFrame brandColor={activeColor}>
          {/* ctaHref="" → nút thành thẻ span trang trí: đây là bản xem trước, bấm vào không
              nên nhảy đi đâu cả. */}
          <ProfileHero
            ctaHref=""
            data={{
              fullName: draft.fullName || "Tên của bạn",
              professionalTitle: draft.professionalTitle,
              bio: draft.bio,
              avatarUrl: draft.avatarUrl,
              coverUrl: draft.coverUrl,
              skills: draft.skills,
              portfolioUrl: draft.portfolioUrl,
            }}
          />
        </PreviewFrame>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Tên, chức danh, giới thiệu và kỹ năng lấy từ tab <strong>Hồ sơ</strong>. Biểu mẫu
          tiếp nhận nằm ngay bên dưới phần này trên trang thật.
        </p>
      </aside>
    </div>
  );
}

/** Bề rộng trang thật (max-w-5xl + padding) — dựng ở khổ này rồi mới thu nhỏ. */
const REAL_PAGE_WIDTH = 1024;

/**
 * Khung xem trước thu nhỏ.
 *
 * Không thể chỉ nhét `ProfileHero` vào một cột hẹp: các breakpoint `sm:`/`lg:` của Tailwind
 * đo BỀ RỘNG CỬA SỔ chứ không phải bề rộng khung chứa, nên trong ô 400px nó vẫn dựng layout
 * desktop rồi vỡ — tên xuống ba dòng, nút tràn ra ngoài. Cách đúng là dựng ở đúng khổ trang
 * thật (1024px) rồi `scale` xuống, và như vậy cũng trung thực hơn: freelancer thấy đúng bố
 * cục khách sẽ thấy, chỉ nhỏ hơn.
 *
 * Phần tử đã `scale` vẫn chiếm chỗ theo kích thước GỐC trong luồng bố cục, nên phải tự đo
 * chiều cao thật rồi gán lại cho khung ngoài — không thì dưới khung thừa ra một mảng trắng
 * bằng đúng phần bị thu nhỏ.  #Huynh
 */
function PreviewFrame({
  brandColor,
  children,
}: {
  brandColor: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const s = outer.clientWidth / REAL_PAGE_WIDTH;
      setScale(s);
      setHeight(inner.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  });

  return (
    <div
      ref={outerRef}
      className="overflow-hidden rounded-xl border border-border bg-background"
      style={{ height }}
    >
      <div
        ref={innerRef}
        style={{
          width: REAL_PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...brandStyle(brandColor),
        }}
        className="px-4 pb-6"
      >
        {children}
      </div>
    </div>
  );
}
