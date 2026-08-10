import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getMe, usersKeys } from "@/services/usersService";

/**
 * Link công khai của freelancer — và cũng là chỗ ĐẶT LUÔN tên đường dẫn.
 *
 * Gộp hai thứ vào một thẻ vì chúng vốn là một: cái người dùng sửa (`thu-thuy`) chính là cái
 * họ đọc ra trong link. Tách thành mục "Địa chỉ riêng" riêng rồi lại có thẻ link riêng là
 * bắt họ nhìn cùng một chuỗi ở hai chỗ.
 *
 * Đưa ĐÚNG MỘT link: có tên đường dẫn thì `/{slug}`, chưa đặt thì `/ho-so/{token}`. Link dài
 * vẫn chạy song song ở backend, chỉ là không cần bày ra.
 *
 * Công tắc nhận yêu cầu cũng nằm đây: nó quyết định chính cái link này có ăn hay không, để
 * lẻ ở trang cấu hình biểu mẫu thì người dùng phải đi tìm.
 *
 * Dòng "Link" và nút Sao chép bám theo giá trị ĐÃ LƯU, không phải bản đang gõ: link
 * chỉ chạy sau khi bấm Lưu, đưa link chưa lưu cho người ta đi phát là đưa một đường dẫn
 * hỏng.  #Huynh
 */
export function IntakeLinkCard({
  slug,
  onSlugChange,
  slugError,
  isActive,
  onIsActiveChange,
}: {
  /** Tên đường dẫn đang gõ. Không truyền thì thẻ chỉ đọc. */
  slug?: string;
  onSlugChange?: (next: string) => void;
  slugError?: string | null;
  /** Còn nhận yêu cầu mới không. Không truyền thì thẻ không hiện công tắc. */
  isActive?: boolean;
  onIsActiveChange?: (next: boolean) => void;
}) {
  const { data: me } = useQuery({ queryKey: usersKeys.me, queryFn: getMe });
  const [copied, setCopied] = useState(false);

  const token = me?.intake_share_token ?? null;
  const savedSlug = me?.profile_slug ?? "";
  const origin = window.location.origin;
  const editable = onSlugChange !== undefined;
  const draft = slug ?? savedSlug;

  const liveUrl = savedSlug
    ? `${origin}/${savedSlug}`
    : token
      ? `${origin}/ho-so/${token}`
      : null;
  const unsaved = editable && draft.trim() !== savedSlug;

  const onCopy = async () => {
    if (!liveUrl) return;
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      toast.success("Đã sao chép link.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép link. Vui lòng thử lại.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary" /> Link công khai của bạn
      </div>

      {editable ? (
        <>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
              <span className="flex items-center bg-muted/40 px-2.5 text-xs text-muted-foreground">
                {origin.replace(/^https?:\/\//, "")}/
              </span>
              <input
                id="profile-slug"
                aria-label="Tên đường dẫn"
                value={draft}
                onChange={(e) => onSlugChange(e.target.value.toLowerCase())}
                placeholder="thu-thuy"
                className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs outline-none"
              />
            </div>
            <CopyButton copied={copied} onCopy={onCopy} disabled={!liveUrl} />
          </div>

          {slugError ? (
            <p className="mt-2 text-xs leading-5 text-destructive">{slugError}</p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {liveUrl ? (
                <>
                  Link: <span className="text-foreground">{liveUrl}</span>
                  {!savedSlug && " (link dài — đặt tên ở trên cho gọn hơn)"}
                  {unsaved && (
                    <span className="text-warning-foreground">
                      {" "}
                      · Tên mới chỉ chạy sau khi bấm Lưu thay đổi.
                    </span>
                  )}
                </>
              ) : (
                "Link sẽ sẵn sàng sau khi tài khoản được khởi tạo."
              )}
            </p>
          )}
        </>
      ) : liveUrl ? (
        <div className="flex items-center gap-2">
          <input
            value={liveUrl}
            readOnly
            aria-label="Link trang công khai"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <CopyButton copied={copied} onCopy={onCopy} />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Link sẽ sẵn sàng sau khi tài khoản được khởi tạo.
        </div>
      )}

      {onIsActiveChange && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Switch
              size="sm"
              checked={isActive ?? true}
              onCheckedChange={onIsActiveChange}
              aria-label={`Đang nhận yêu cầu: ${isActive ?? true ? "Bật" : "Tắt"}`}
            />
            <span>Đang nhận yêu cầu</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Tắt thì khách vẫn xem được hồ sơ của bạn, nhưng không gửi được yêu cầu mới.
          </p>
        </div>
      )}
    </div>
  );
}

function CopyButton({
  copied,
  onCopy,
  disabled,
}: {
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Đã sao chép" : "Sao chép link"}
    </button>
  );
}
