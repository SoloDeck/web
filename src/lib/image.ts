/**
 * Nén ảnh phía trình duyệt trước khi lưu thành data URL.
 *
 * Vì sao cần: ảnh hồ sơ (avatar, bìa) lưu thẳng vào cột Text dưới dạng base64 chứ không đi
 * qua object storage — lớp MinIO có trong repo nhưng dựng URL từ hostname nội bộ Docker nên
 * trình duyệt khách không mở được. Base64 chạy được ở mọi môi trường, đổi lại phình 33% và
 * đi kèm mọi lượt GET /users/me lẫn trang công khai. Không nén thì một ảnh 2MB thành chuỗi
 * 2.7MB nằm trong đường truyền của MỌI khách hàng mở trang.
 *
 * Có lưới an toàn cho jsdom: môi trường test không có canvas, nên khi thiếu API hoặc
 * `toDataURL` ném lỗi thì rơi về `FileReader` — đúng hành vi cũ, không test nào vỡ.  #Huynh
 */

export type CompressOptions = {
  maxWidth: number;
  maxHeight: number;
  /** Chất lượng JPEG khởi điểm (0–1). Sẽ tự hạ dần nếu vẫn quá dài. */
  quality?: number;
  /** Trần độ dài chuỗi data URL. Backend chặn cứng ở 1.5 triệu ký tự. */
  maxChars: number;
};

const MIN_QUALITY = 0.5;

/** Đọc thẳng thành data URL, không đụng canvas. Dùng khi môi trường không vẽ được. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được tệp ảnh"));
    reader.readAsDataURL(file);
  });
}

function canUseCanvas(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof createImageBitmap !== "function") return false;
  try {
    return typeof document.createElement("canvas").toDataURL === "function";
  } catch {
    return false;
  }
}

export async function compressImageToDataUrl(
  file: File,
  { maxWidth, maxHeight, quality = 0.8, maxChars }: CompressOptions,
): Promise<string> {
  if (!canUseCanvas()) return readAsDataUrl(file);

  try {
    const bitmap = await createImageBitmap(file);

    // CHỈ thu nhỏ, không phóng to: phóng ảnh nhỏ lên chỉ làm mờ và tốn thêm byte.
    let scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);

    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return readAsDataUrl(file);

      // Nền trắng: JPEG không có kênh trong suốt, thiếu bước này thì PNG nền trong suốt
      // ra nền ĐEN.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let q = quality;
      let url = canvas.toDataURL("image/jpeg", q);
      while (url.length > maxChars && q > MIN_QUALITY) {
        q = Math.round((q - 0.1) * 100) / 100;
        url = canvas.toDataURL("image/jpeg", q);
      }
      if (url.length <= maxChars) {
        bitmap.close?.();
        return url;
      }
      // Hạ chất lượng tới đáy vẫn quá dài → ảnh quá lớn về kích thước, thu nhỏ thêm.
      scale *= 0.8;
    }

    bitmap.close?.();
    throw new Error("Ảnh quá lớn, bạn thử chọn ảnh nhẹ hơn nhé");
  } catch (err) {
    if (err instanceof Error && err.message.includes("Ảnh quá lớn")) throw err;
    return readAsDataUrl(file);
  }
}

/** Avatar hiện tối đa 128px trên giao diện; 512 là dư cho màn hình Retina. */
export const AVATAR_COMPRESS: CompressOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.82,
  maxChars: 150_000,
};

/** Ảnh bìa hiển thị tỉ lệ 4:1, rộng tối đa 1024px trong khung — 1400 là dư cho Retina. */
export const COVER_COMPRESS: CompressOptions = {
  maxWidth: 1400,
  maxHeight: 700,
  quality: 0.78,
  maxChars: 250_000,
};
