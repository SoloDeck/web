import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Nút sao chép một chuỗi vào clipboard, đổi icon `Copy` -> `Check` rồi tự trả về sau 1,6s.
 *
 * Trước đây repo có BA bản chép tay rời rạc: `QualificationResult.tsx` (bản đầy đủ nhất),
 * `IntakeLinkCard.tsx` và `FollowUpModal.tsx`. Bản này gom lại từ bản đầy đủ nhất, vì nó là
 * bản DUY NHẤT có `canCopy`.
 *
 * `canCopy` không phải phòng xa: `navigator.clipboard` KHÔNG tồn tại trên http thường
 * (chỉ https và localhost) và cũng không có trong jsdom. Thiếu nó thì bấm nút là ném
 * TypeError giữa màn hình.
 *
 * Ẩn hẳn nút thay vì bày ra rồi báo lỗi: nút bấm vào chắc chắn hỏng còn tệ hơn không có
 * nút — người dùng vẫn bôi đen chép tay được.  #Huynh
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
  iconOnly = false,
  className,
}: {
  text: string;
  /** Vừa là nhãn hiện ra, vừa là `aria-label` — test truy vấn theo tên này. */
  label: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);
  if (!canCopy) return null;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={className}
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
          // Bản cũ không bắt lỗi ở đây. Trình duyệt từ chối quyền clipboard là chuyện có
          // thật, và khi đó lời hứa bị bỏ rơi: không ai báo gì, người dùng tưởng đã chép
          // xong rồi dán ra nội dung cũ.
          .catch(() => {
            toast.error("Trình duyệt không cho sao chép. Bạn chép tay giúp mình nhé.");
          });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && <span>{copied ? (copiedLabel ?? "Đã sao chép") : label}</span>}
    </button>
  );
}
