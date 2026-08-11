import { Check, ImageIcon, Palette } from "lucide-react";
import { CoverUpload } from "@/features/profile/components/CoverUpload";
import {
  BRAND_PRESETS,
  DEFAULT_BRAND_COLOR,
  isHexColor,
  readableOn,
} from "@/features/intake/brandTheme";

/** Ba trường quyết định diện mạo trang công khai. Hẹp có chủ đích — không dính cả hồ sơ. */
export type AppearanceDraft = {
  coverUrl: string;
  brandColor: string;
  profileSlug: string;
};

/**
 * Khối chỉnh diện mạo trang công khai: ảnh bìa và màu chủ đạo.
 *
 * KHÔNG có ô tên đường dẫn: nó nằm ngay trong thẻ "Link công khai của bạn", vì cái người
 * dùng gõ chính là cái họ đọc ra trong link — tách hai chỗ là bắt họ nhìn cùng một chuỗi
 * hai lần.
 *
 * KHÔNG tự gọi API và KHÔNG tự dựng khung xem trước. Màn chứa nó (`IntakeFormConfig`) đã có
 * một khung xem trước cho CẢ trang — hồ sơ lẫn biểu mẫu — nên khung riêng ở đây vừa thừa vừa
 * chỉ cho thấy nửa trang. Cũng chỉ nhận đúng ba trường nó chỉnh, thay vì cả `Profile`: gói
 * ngân hàng, MoMo, nhắc nhở không liên quan gì tới diện mạo.  #Huynh
 */
export function AppearanceSettings({
  value,
  onChange,
}: {
  value: AppearanceDraft;
  onChange: (next: AppearanceDraft) => void;
}) {
  const activeColor = isHexColor(value.brandColor) ? value.brandColor : DEFAULT_BRAND_COLOR;
  const needsDarkText = readableOn(activeColor) !== "#ffffff";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <ImageIcon className="size-3.5" /> Ảnh bìa
        </div>
        <CoverUpload
          value={value.coverUrl}
          onChange={(coverUrl) => onChange({ ...value, coverUrl })}
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
                onClick={() => onChange({ ...value, brandColor: p.hex })}
                className={`grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-card transition ${
                  selected ? "ring-2 ring-foreground/40" : "hover:scale-110"
                }`}
                style={{ backgroundColor: p.hex }}
              >
                {selected && <Check className="size-4" style={{ color: readableOn(p.hex) }} />}
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
              onChange={(e) => onChange({ ...value, brandColor: e.target.value })}
              className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
          </label>
          {value.brandColor && (
            <button
              type="button"
              onClick={() => onChange({ ...value, brandColor: "" })}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Về màu mặc định
            </button>
          )}
        </div>

        {needsDarkText && (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-5">
            Màu này khá sáng nên chữ trên nút sẽ chuyển sang màu tối cho dễ đọc. Bạn xem thử
            ở khung bên cạnh nhé.
          </p>
        )}
      </section>
    </div>
  );
}
