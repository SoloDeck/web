import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getMe, usersKeys } from "@/services/usersService";

/**
 * Hai link công khai của freelancer, cùng dùng chung `intake_share_token` từ GET /users/me:
 *
 * - `/bieu-mau/{token}` — biểu mẫu khách điền yêu cầu.
 * - `/ho-so/{token}` — trang giới thiệu bản thân, có nút dẫn sang biểu mẫu.
 *
 * Đây là chỗ DUY NHẤT trong app lộ hai link đó. Trang hồ sơ trước kia nằm trong danh bạ
 * `/find-freelancer` nên khách tự tìm ra; bỏ danh bạ rồi thì không còn đường nào khác để
 * freelancer lấy link của chính mình.  #Huynh
 */
export function IntakeLinkCard() {
  const { data: me } = useQuery({ queryKey: usersKeys.me, queryFn: getMe });

  const token = me?.intake_share_token ?? null;
  const slug = me?.profile_slug ?? null;
  const origin = window.location.origin;

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary" /> Link công khai của bạn
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Gửi cho khách qua Zalo, email hay chữ ký thư. Khách không cần tài khoản; mỗi yêu cầu
        gửi lên sẽ xuất hiện trong pipeline của bạn.
      </p>
      {token ? (
        <div className="space-y-2">
          {/* Có tên đường dẫn riêng thì đưa nó lên đầu — dễ đọc, dễ nhắc qua điện thoại.
              Link token vẫn giữ vì đã phát ra ngoài rồi, và vì nó không đoán được. */}
          {slug && (
            <CopyRow
              label="Link riêng của bạn"
              hint="Ngắn, dễ nhớ — nên dùng cái này."
              url={`${origin}/${slug}`}
              toastText="Đã sao chép link riêng."
            />
          )}
          <CopyRow
            label={slug ? "Link dài (dự phòng)" : "Link trang công khai"}
            hint={
              slug
                ? "Vẫn chạy song song, dùng khi bạn không muốn lộ tên đường dẫn."
                : "Đặt tên đường dẫn riêng ở Cài đặt hồ sơ → Trang công khai cho gọn hơn."
            }
            url={`${origin}/ho-so/${token}`}
            toastText="Đã sao chép link."
          />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Link sẽ sẵn sàng sau khi tài khoản được khởi tạo.
        </div>
      )}
    </div>
  );
}

function CopyRow({
  label,
  hint,
  url,
  toastText,
}: {
  label: string;
  hint: string;
  url: string;
  toastText: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(toastText);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép link. Vui lòng thử lại.");
    }
  };

  return (
    <div>
      <div className="mb-1 text-xs font-medium">
        {label} <span className="font-normal text-muted-foreground">— {hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={url}
          readOnly
          aria-label={label}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
        />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Đã sao chép" : "Sao chép link"}
        </button>
      </div>
    </div>
  );
}
