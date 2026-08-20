import { useState } from "react";
import { CreditCard, QrCode, Wallet } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { planPrice, type PaymentProvider, type PlanResponse } from "@/services/subscriptionsService";
import { formatVND } from "@/utils/format";

/**
 * Ba cổng thanh toán, nhãn tiếng Việt gom một chỗ theo khuôn `ClientEditDialog.tsx`.
 *
 * KHÔNG có logo thật trong `public/brand-icons/` nên dùng icon lucide. Cố ý không tự vẽ
 * SVG logo: sai nhận diện thương hiệu còn tệ hơn không có logo. Ngày nào có file thật thì
 * thay đúng ô icon này.
 */
const PROVIDER_OPTIONS: {
  value: PaymentProvider;
  label: string;
  blurb: string;
  badge?: string;
  Icon: typeof Wallet;
}[] = [
  {
    value: "momo",
    label: "Ví MoMo",
    blurb: "Mở trang MoMo, trả bằng ví hoặc thẻ đã liên kết.",
    Icon: Wallet,
  },
  {
    value: "zalopay",
    label: "ZaloPay",
    blurb: "Mở trang ZaloPay, trả bằng ví hoặc thẻ đã liên kết.",
    Icon: Wallet,
  },
  {
    value: "sepay",
    label: "SePay",
    // Đây là thứ DUY NHẤT khác chất so với hai ví — phải nhìn ra ngay chứ không nằm chìm
    // trong câu mô tả: người dùng cần biết mình sắp phải mở app ngân hàng chứ không phải ví.
    badge: "Chuyển khoản ngân hàng",
    blurb: "Quét mã VietQR bằng app ngân hàng bất kỳ, không cần cài thêm ví.",
    Icon: QrCode,
  },
];

/** Cổng chọn sẵn. MoMo vì đây là cổng DUY NHẤT backend có đường tự đối soát khi mất webhook. */
const DEFAULT_PROVIDER: PaymentProvider = "momo";

/**
 * Hỏi lại trước khi tiêu tiền, VÀ hỏi luôn trả bằng cách nào.
 *
 * Thay cho `ConfirmDialog` chứ không sửa nó: `ConfirmDialog` chỉ nhận `description` kiểu
 * chuỗi nên không nhét được bộ chọn cổng, mà mở nó cho `children` thì kéo theo mọi chỗ
 * khác đang dùng. Có tiền lệ y hệt ở `SaveQualificationDialog.tsx`.
 *
 * Vẫn là `AlertDialog` chứ không phải `Dialog`: đây vẫn đúng là bước "hỏi lại trước khi
 * tiêu tiền" — lý do `ConfirmDialog` tồn tại — và giữ `role="alertdialog"` thì mấy test
 * đang truy vấn theo role đó không phải đụng tới.  #Huynh
 */
export function PlanCheckoutDialog({
  open,
  onOpenChange,
  plan,
  isLoading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanResponse | null;
  isLoading?: boolean;
  onConfirm: (provider: PaymentProvider) => void;
}) {
  const [provider, setProvider] = useState<PaymentProvider>(DEFAULT_PROVIDER);

  // Đặt lại NGAY TRONG RENDER thay vì qua `useEffect`: effect chạy sau khi vẽ, nên có đúng
  // một khung hình hộp thoại mở ra còn giữ lựa chọn của lần trước. Khuôn lấy từ
  // `SaveQualificationDialog.tsx:61-65`.
  const [seenOpen, setSeenOpen] = useState(open);
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) setProvider(DEFAULT_PROVIDER);
  }

  if (!plan) return null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CreditCard className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle>Nâng cấp lên gói {plan.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatVND(planPrice(plan))} cho một kỳ 30 ngày. Gói hiện tại giữ nguyên cho tới khi
            hệ thống nhận được tiền.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chọn cách thanh toán
          </p>
          <RadioGroup
            value={provider}
            onValueChange={(next) => setProvider(next as PaymentProvider)}
            disabled={isLoading}
          >
            {PROVIDER_OPTIONS.map((option) => {
              const selected = option.value === provider;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    // So state trong React chứ không dùng biến thể `peer-data-checked:`:
                    // `peer` chỉ với tới ANH EM SAU nó, không với tới thẻ `label` cha.
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                    isLoading && "cursor-not-allowed opacity-60"
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <option.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {option.badge && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {option.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.blurb}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Để sau</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={isLoading}
            onClick={(event) => {
              // Chặn tự đóng: đơn còn đang tạo, đóng sớm thì không ai đón kết quả.
              event.preventDefault();
              onConfirm(provider);
            }}
          >
            {isLoading ? "Đang tạo đơn…" : "Tiến hành thanh toán"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
