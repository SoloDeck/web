import { useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_COMPRESS, compressImageToDataUrl } from "@/lib/image";

/**
 * Ảnh được thu nhỏ ở trình duyệt rồi lưu dạng data URL (base64) vào `users.avatar_url` —
 * cột Text nên chứa được. Chặn 2MB ở đầu vào, và nén xuống ≤150KB trước khi gửi đi.
 *
 * Dùng chung giữa màn Cài đặt hồ sơ và Onboarding.
 */
export function AvatarUpload({
  value,
  name,
  onChange,
  size = 80,
  badge = false,
}: {
  value: string;
  name: string;
  onChange: (url: string) => void;
  /** Đường kính vòng tròn (px). */
  size?: number;
  /** Hiện nút camera nổi ở góc thay vì chỉ lộ ra khi rê chuột — dùng ở onboarding,
   *  nơi người dùng lần đầu vào và không đoán được là ảnh bấm được. */
  badge?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

  const handleFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh quá lớn. Vui lòng chọn file dưới 2MB.");
      return;
    }
    // Nén trước khi mã hoá: ảnh này nằm trong payload của TRANG CÔNG KHAI, ảnh gốc 2MB
    // thành chuỗi base64 2.7MB mà mọi khách hàng mở trang đều phải tải.  #Huynh
    try {
      onChange(await compressImageToDataUrl(file, AVATAR_COMPRESS));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đọc được ảnh. Bạn thử ảnh khác nhé.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="group relative shrink-0 cursor-pointer"
        style={{ width: size, height: size }}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <img
            src={value}
            alt={name}
            className="h-full w-full rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow font-bold text-primary-foreground ring-2 ring-border"
            style={{ fontSize: Math.round(size / 3) }}
          >
            {initials}
          </div>
        )}

        {/* Lớp phủ khi rê chuột */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-5 w-5 text-white" />
          <span className="text-[10px] font-semibold text-white">Thay ảnh</span>
        </div>

        {/* Nút camera nổi — luôn thấy, cho người lần đầu vào không phải đoán */}
        {badge && (
          <span
            aria-hidden
            className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-secondary text-secondary-foreground shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <Camera className="h-4 w-4" />
          </span>
        )}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Xóa ảnh
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
