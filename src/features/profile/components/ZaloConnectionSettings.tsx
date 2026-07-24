// Tab "Zalo OA" — kết nối Official Account của freelancer để gửi nhắc qua Zalo.
//
// Trước đây tab này bị GỠ vì backend chưa có endpoint (điền xong F5 là mất). Giờ đã có luồng
// OAuth thật (`/zalo/connect-url` → callback → lưu token) nên dựng lại. Ở chế độ `mock` (dev),
// "kết nối" chạy trọn nhưng KHÔNG gửi Zalo thật — nói rõ để không hiểu nhầm.  #Huynh
import { useEffect } from "react";
import { Check, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { BrandIcon } from "@/components/solodesk/BrandIcon";
import { useZaloStatus, useConnectZalo, useDisconnectZalo } from "@/features/profile/hooks/useZalo";

export function ZaloConnectionSettings() {
  const { data: status, isLoading, refetch } = useZaloStatus();
  const connect = useConnectZalo();
  const disconnect = useDisconnectZalo();

  // Sau khi Zalo chuyển hướng về `.../settings?zalo=connected|error`: báo kết quả, làm mới trạng
  // thái, rồi dọn query khỏi URL để F5 không bật lại toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("zalo");
    if (!result) return;
    if (result === "connected") {
      toast.success("Đã kết nối Zalo OA.");
      void refetch();
    } else if (result === "error") {
      toast.error("Kết nối Zalo OA thất bại. Bạn thử lại giúp nhé.");
    }
    params.delete("zalo");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [refetch]);

  const connected = status?.connected ?? false;
  const isMock = status?.mode === "mock";

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-muted p-2.5">
          <BrandIcon name="zalo" className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Zalo Official Account</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kết nối OA của bạn để gửi tin nhắc cho khách qua Zalo. Khách cần từng nhắn/quan tâm
            OA của bạn thì mới nhận được tin (Zalo chỉ cho gửi tới người đã tương tác).
          </p>
        </div>
      </div>

      {isMock && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          Đang ở <span className="font-semibold">chế độ phát triển (mock)</span> — kết nối chạy thử
          nhưng <span className="font-semibold">không gửi Zalo thật</span>. Cần app Zalo + URL công
          khai để bật chế độ thật.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải trạng thái kết nối...
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          {connected ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <Check className="h-4 w-4" /> Đã kết nối
                </div>
                {status?.oa_id && (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    OA ID: <span className="font-mono">{status.oa_id}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Ngắt kết nối
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Chưa kết nối OA nào.</div>
              <button
                type="button"
                onClick={() => connect.mutate()}
                disabled={connect.isPending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {connect.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Kết nối Zalo OA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
