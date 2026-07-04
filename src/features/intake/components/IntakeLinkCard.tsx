import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getMe } from "@/services/usersService";

/**
 * Hiển thị link public `/bieu-mau/{token}` để freelancer gửi cho khách hàng.
 * Token lấy từ GET /users/me.intake_share_token.
 */
export function IntakeLinkCard() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [copied, setCopied] = useState(false);

  const token = me?.intake_share_token ?? null;
  const url = token ? `${window.location.origin}/intake/${token}` : "";

  const onCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép link nhận yêu cầu.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép link. Vui lòng thử lại.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary" /> Link nhận yêu cầu công khai
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Chia sẻ link này để khách hàng tự gửi yêu cầu. Mỗi yêu cầu sẽ xuất hiện trong pipeline của bạn.
      </p>
      {token ? (
        <div className="flex items-center gap-2">
          <input
            value={url}
            readOnly
            aria-label="Link nhận yêu cầu"
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
      ) : (
        <div className="text-xs text-muted-foreground">Link sẽ sẵn sàng sau khi tài khoản được khởi tạo.</div>
      )}
    </div>
  );
}
