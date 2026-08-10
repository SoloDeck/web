import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { COVER_COMPRESS, compressImageToDataUrl } from "@/lib/image";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Chọn ảnh bìa cho trang công khai.
 *
 * Ảnh gốc thường 3–6MB nên chặn đầu vào rộng tay (8MB) rồi thu nhỏ về ≤250KB bằng canvas —
 * chuỗi base64 này đi kèm MỌI lượt khách mở trang, không nén là bắt khách tải mấy megabyte
 * chỉ để nhìn cái nền.
 *
 * Khung dựng theo tỉ lệ 4:1 đúng như trang thật hiển thị, để cái freelancer thấy lúc chọn
 * chính là cái khách sẽ thấy.  #Huynh
 */
export function CoverUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("Ảnh quá lớn. Bạn chọn ảnh dưới 8MB nhé.");
      return;
    }
    setBusy(true);
    try {
      onChange(await compressImageToDataUrl(file, COVER_COMPRESS));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đọc được ảnh. Bạn thử ảnh khác nhé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="group relative aspect-[4/1] w-full overflow-hidden rounded-xl">
        {value ? (
          <img src={value} alt="Ảnh bìa trang công khai" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="text-xs font-medium">Bấm để chọn ảnh bìa</span>
                <span className="text-[11px]">Nên dùng ảnh ngang, khoảng 1600 × 400</span>
              </>
            )}
          </button>
        )}

        {value && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-background/85 px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:bg-background"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Đổi ảnh"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Xoá ảnh bìa"
              className="rounded-lg bg-background/85 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-background hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        Chưa chọn ảnh thì trang vẫn đẹp — bìa sẽ là dải màu chuyển sắc theo màu chủ đạo bạn
        chọn bên dưới.
      </p>
    </div>
  );
}
