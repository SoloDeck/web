import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  downloadDealAttachment,
  fetchDealAttachmentBlob,
  type DealAttachment,
} from "@/services/dealAttachmentsService";

/**
 * Xem file đính kèm NGAY TRONG APP, không bắt tải về.
 *
 * Trước đây muốn đọc một cái brief PDF của khách là phải tải xuống rồi mở bằng phần mềm
 * ngoài — rời khỏi app giữa lúc đang làm việc, và ổ Downloads đầy file rác.
 *
 * Dùng object URL từ Blob thay vì trỏ `src` thẳng vào endpoint: request cần header
 * `Authorization`, mà `<iframe src>` thì không gắn header được. Tải bằng axios (có
 * interceptor gắn token) rồi mới dựng URL cục bộ.  #Huynh
 */
export function AttachmentViewerModal({
  attachment,
  onClose,
}: {
  attachment: DealAttachment;
  onClose: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetchDealAttachmentBlob(attachment.id)
      .then((blob) => {
        if (cancelled) return;
        url = window.URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    // Thu hồi object URL khi đóng. Không revoke là trình duyệt giữ nguyên cả file trong bộ
    // nhớ cho tới khi tải lại trang — mở vài file 10MB là thấy ngay.
    return () => {
      cancelled = true;
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [attachment.id]);

  const isPdf = attachment.content_type === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="truncate text-sm font-bold">{attachment.filename}</h2>
              {attachment.ai_readable && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" /> AI đọc được
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                downloadDealAttachment(attachment.id, attachment.filename).catch(() =>
                  toast.error("Không tải được file.")
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Tải về
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-md p-1.5 hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-muted/30">
          {failed ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <p className="text-sm font-medium">Không mở được file này.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bạn có thể bấm "Tải về" để mở bằng phần mềm trên máy.
                </p>
              </div>
            </div>
          ) : !objectUrl ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isPdf ? (
            <iframe title={attachment.filename} src={objectUrl} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center overflow-auto p-4">
              <img
                src={objectUrl}
                alt={attachment.filename}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
