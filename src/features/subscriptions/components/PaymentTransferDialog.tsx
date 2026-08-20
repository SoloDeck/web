import { useState } from "react";
import { AlertTriangle, Check, Loader2, QrCode, RefreshCw } from "lucide-react";

import { CopyButton } from "@/components/solodesk/CopyButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCountdown, useCountdown } from "@/features/subscriptions/hooks/useCountdown";
import { readTransferDetails } from "@/features/subscriptions/lib/paymentLink";
import { cn } from "@/lib/utils";
import { intentAmount, type PaymentIntentResponse } from "@/services/subscriptionsService";
import { formatVND } from "@/utils/format";

const SUPPORT_EMAIL = "solodeskai@gmail.com";

/**
 * Màn chuyển khoản ngân hàng (SePay).
 *
 * Khác hẳn MoMo/ZaloPay: KHÔNG có điều hướng, KHÔNG có đường quay về. Người dùng ngồi lại
 * trên trang, quét mã hoặc gõ tay bốn thông tin, rồi chờ ngân hàng báo về. Vì vậy đây là
 * mặt bàn làm việc chứ không phải một câu hỏi — dùng `Dialog` (đóng được bằng Esc) chứ
 * không phải `AlertDialog`.
 *
 * Component này THUẦN TRÌNH BÀY: nhận `intent` qua props chứ không tự gọi `usePaymentIntent`.
 * Tự gọi là có hai vòng dò song song trên cùng một mã đơn.  #Huynh
 */
export function PaymentTransferDialog({
  open,
  onOpenChange,
  intent,
  planName,
  onRecheck,
  rechecking = false,
  onCancelOrder,
  cancelling = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: PaymentIntentResponse | undefined;
  planName: string | null;
  onRecheck: () => void;
  rechecking?: boolean;
  onCancelOrder: () => void;
  cancelling?: boolean;
}) {
  const { msLeft, expired } = useCountdown(intent?.expires_at);

  if (!intent) return null;

  const details = readTransferDetails(intent);
  const succeeded = intent.status === "succeeded";
  // Hết hạn theo BACKEND hoặc theo đồng hồ — cái nào tới trước. Chỉ tin đồng hồ thì một
  // đơn đã bị backend đánh `expired` vẫn hiện mã QR quét được.
  const dead =
    intent.status === "expired" || intent.status === "cancelled" || (!succeeded && expired);

  const title = planName
    ? "Chuyển khoản để nâng cấp gói " + planName
    : "Chuyển khoản để nâng cấp gói";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{succeeded ? "Đã nhận được chuyển khoản" : title}</DialogTitle>
          <DialogDescription>
            {succeeded
              ? "Gói của bạn đã được kích hoạt. Bạn dùng được ngay."
              : "Quét mã bằng app ngân hàng, hoặc nhập tay bốn thông tin bên dưới."}
          </DialogDescription>
        </DialogHeader>

        {succeeded ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-success">
            <Check className="h-5 w-5 shrink-0" />
            <span>Thanh toán thành công.</span>
          </div>
        ) : dead ? (
          <ExpiredNotice orderCode={details.memo} onCancelOrder={onCancelOrder} />
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <QrImage src={intent.payment_link.qr_code_url ?? intent.payment_link.url} />
              <TransferRows
                bank={details.bank}
                accountNumber={details.accountNumber}
                amountLabel={formatVND(intentAmount(intent))}
                amountRaw={details.amountRaw}
                memo={details.memo}
                fallbackText={intent.payment_link.instructions}
              />
            </div>

            <div className="space-y-2 text-sm">
              <p className={cn("text-muted-foreground", msLeft < 5 * 60_000 && "text-destructive")}>
                Còn <span className="font-semibold tabular-nums">{formatCountdown(msLeft)}</span> để
                hoàn tất chuyển khoản.
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Đang chờ ngân hàng xác nhận… Trang tự cập nhật, bạn không cần bấm gì.
                </span>
                <Button variant="ghost" size="sm" onClick={onRecheck} disabled={rechecking}>
                  <RefreshCw className={cn("h-3.5 w-3.5", rechecking && "animate-spin")} />
                  Kiểm tra lại
                </Button>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          {!succeeded && !dead && (
            <Button variant="ghost" onClick={onCancelOrder} disabled={cancelling}>
              {cancelling ? "Đang huỷ…" : "Huỷ đơn này"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {succeeded ? "Xong" : "Đóng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ảnh QR với ba trạng thái.
 *
 * Ảnh hỏng KHÔNG được để ô vỡ: người dùng vẫn chuyển khoản tay được bằng bốn dòng bên
 * cạnh, nên phải nói điều đó ra thay vì bày một biểu tượng gãy rồi im lặng.
 */
function QrImage({ src }: { src: string | null }) {
  const [state, setState] = useState<"loading" | "ok" | "failed">(src ? "loading" : "failed");

  // Đổi đơn thì đổi ảnh — không đặt lại thì ảnh mới bị kẹt ở trạng thái `failed` của đơn cũ.
  // Chỉnh trong render thay vì trong effect: effect chạy sau khi vẽ, nên ảnh mới chớp một
  // khung hình mang câu "Không tải được ảnh mã QR" của đơn trước.
  const [seenSrc, setSeenSrc] = useState(src);
  if (seenSrc !== src) {
    setSeenSrc(src);
    setState(src ? "loading" : "failed");
  }

  if (state === "failed") {
    return (
      <div className="grid w-full shrink-0 place-items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center sm:w-44">
        <QrCode className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Không tải được ảnh mã QR. Bạn vẫn chuyển khoản được bằng thông tin bên cạnh.
        </p>
        {src && (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary underline"
          >
            Mở ảnh QR ở tab mới
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:w-44">
      {/* Khoá tỉ lệ vuông để khung không nhảy khi ảnh tải xong. */}
      <div className="aspect-square w-full">
        {state === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={src ?? ""}
          alt="Mã QR chuyển khoản"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onLoad={() => setState("ok")}
          onError={() => setState("failed")}
        />
      </div>
    </div>
  );
}

/**
 * Bốn dòng thông tin chuyển khoản.
 *
 * Không đọc ra được ngân hàng / số tài khoản thì in NGUYÊN VĂN câu hướng dẫn của backend
 * thay cho hai dòng đó — thà mất hai dòng tiện lợi còn hơn bịa ra một số tài khoản.
 */
function TransferRows({
  bank,
  accountNumber,
  amountLabel,
  amountRaw,
  memo,
  fallbackText,
}: {
  bank: string | null;
  accountNumber: string | null;
  amountLabel: string;
  amountRaw: string;
  memo: string | null;
  fallbackText: string | null;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      {accountNumber ? (
        <>
          {bank && <Row label="Ngân hàng" value={bank} copyText={bank} />}
          <Row label="Số tài khoản" value={accountNumber} copyText={accountNumber} />
        </>
      ) : (
        fallbackText && (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            {fallbackText}
          </p>
        )
      )}

      {/* Hiện có dấu chấm ngăn nghìn cho dễ đọc, nhưng CHÉP ra chuỗi số trần: dán
          "199.000 ₫" vào ô số tiền của app ngân hàng là hỏng. */}
      <Row label="Số tiền" value={amountLabel} copyText={amountRaw} />

      {memo && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <Row label="Nội dung chuyển khoản" value={memo} copyText={memo} emphasise />
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Ghi ĐÚNG nội dung này. Sai nội dung thì hệ thống không tự khớp được đơn của bạn.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  copyText,
  emphasise = false,
}: {
  label: string;
  value: string;
  copyText: string;
  emphasise?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn("truncate font-semibold", emphasise && "font-mono text-base tracking-wider")}
        >
          {value}
        </span>
        {/* Nhãn phải nói RÕ dòng nào — bốn nút "Sao chép" giống hệt nhau thì người dùng
            màn hình đọc không phân biệt được, và test cũng không truy vấn theo tên được. */}
        <CopyButton
          text={copyText}
          label={"Sao chép " + label.toLowerCase()}
          iconOnly
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        />
      </span>
    </div>
  );
}

/**
 * Đơn đã chết.
 *
 * Đây là chỗ phải viết tử tế nhất: SePay KHÔNG có đường tự đối soát, nên người vừa chuyển
 * khoản xong mà đơn hết hạn sẽ không có gì tự cứu họ. Phải nói thẳng tiền không mất và chỉ
 * đúng đường liên hệ, kèm mã đơn sao chép được.
 *
 * Ẩn hẳn mã QR: quét một mã đã chết là dẫn người ta chuyển tiền vào một đơn không còn khớp
 * được nữa.
 */
function ExpiredNotice({
  orderCode,
  onCancelOrder,
}: {
  orderCode: string | null;
  onCancelOrder: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
      <p className="font-semibold">Đơn này đã hết hạn.</p>
      <p>
        Nếu bạn <strong>chưa</strong> chuyển khoản: đóng cửa sổ này rồi chọn lại gói để lấy mã
        mới — mã cũ không dùng lại được.
      </p>
      <p>
        Nếu bạn <strong>vừa mới</strong> chuyển khoản: tiền của bạn không mất đi đâu. Nhắn cho{" "}
        <span className="font-medium">{SUPPORT_EMAIL}</span> kèm mã đơn bên dưới để được kích hoạt
        tay.
      </p>
      {orderCode && (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold tracking-wider">{orderCode}</span>
          <CopyButton
            text={orderCode}
            label="Sao chép mã đơn"
            className="inline-flex items-center gap-1 rounded border border-orange-300 px-2 py-1 text-xs"
          />
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={onCancelOrder}>
        Bỏ đơn này đi
      </Button>
    </div>
  );
}
