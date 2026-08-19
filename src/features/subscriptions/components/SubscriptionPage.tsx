import { useEffect, useState } from "react";
import { Bot, Check, CreditCard, Loader2, Shield, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateCheckout,
  useMySubscription,
  usePaymentIntent,
  usePlans,
} from "@/features/subscriptions/hooks/useSubscriptions";
import { useAiUsage } from "@/features/revenue/hooks/useAnalytics";
import {
  isMomoPayableAmount,
  planPrice,
  SETTLED_PAYMENT_STATUSES,
  type PlanResponse,
} from "@/services/subscriptionsService";
import { readMomoReturn, stripMomoParams } from "@/features/subscriptions/lib/momoReturn";
import { forgetIntent, readRememberedIntent, rememberIntent } from "@/features/subscriptions/lib/intentStorage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Miễn phí";
  // Trước dùng locale "en-US" cho tiền VND → ra "₫199,000.00": vừa sai dấu phân cách,
  // vừa có phần thập phân mà tiền Việt không dùng.  #Huynh
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Gói `free` được đăng ký với kỳ thanh toán +36.500 ngày (100 năm) — nghĩa là "miễn phí
 * vĩnh viễn". Đúng nghiệp vụ, nhưng in thẳng ra màn hình thì thành "17/06/2126" và trông
 * y như một cái bug.  #Huynh
 */
function isPerpetual(iso: string) {
  const years = (new Date(iso).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000);
  return years > 5;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:    { label: "Đang hoạt động", cls: "bg-success/15 text-success" },
  past_due:  { label: "Quá hạn thanh toán", cls: "bg-destructive/15 text-destructive" },
  suspended: { label: "Đã tạm dừng", cls: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
};

const PLAN_META: Record<string, { icon: typeof Sparkles; color: string; popular?: boolean }> = {
  free:   { icon: Shield,   color: "text-muted-foreground" },
  pro:    { icon: Zap,      color: "text-primary", popular: true },
  agency: { icon: Sparkles, color: "text-amber-500" },
};

function featureRows(plan: PlanResponse) {
  return [
    {
      label: "Sử dụng AI",
      value: plan.can_use_ai
        ? plan.max_ai_generations_per_month === 0
          ? "Không giới hạn"
          : `${plan.max_ai_generations_per_month} lần / tháng`
        : null,
    },
    { label: "Xuất PDF hợp đồng / báo giá", value: plan.can_export_pdf ? "Có" : null },
    {
      label: "Số khách hàng",
      value: plan.max_clients === null ? "Không giới hạn" : `Tối đa ${plan.max_clients}`,
    },
    {
      label: "Số deal",
      value: plan.max_deals === null ? "Không giới hạn" : `Tối đa ${plan.max_deals}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  isCurrent,
  onBuy,
  buying,
  disabled = false,
}: {
  plan: PlanResponse;
  isCurrent: boolean;
  onBuy: (plan: PlanResponse) => void;
  /** ĐÚNG thẻ này đang mở phiên thanh toán — không phải "có ai đó đang mở". */
  buying: boolean;
  /** Một thẻ KHÁC đang mở phiên thanh toán. */
  disabled?: boolean;
}) {
  const meta = PLAN_META[plan.slug] ?? PLAN_META.free;
  const Icon = meta.icon;
  const rows = featureRows(plan);
  // `planPrice` chứ không so thẳng: backend trả Decimal dạng CHUỖI ("0.00"), nên
  // `price_monthly === 0` luôn sai và gói Free hiện nút mua.  #Huynh
  const price = planPrice(plan);
  const isFree = price === 0;
  // Giá gói do quản trị viên nhập tay, mà MoMo có hạn mức 1.000đ – 50.000.000đ. Gói nằm
  // ngoài hạn mức thì bấm vào là chắc chắn lỗi — tắt nút ngay tại thẻ kèm lý do, đừng bắt
  // người dùng đi một vòng sang backend chỉ để nhận về toast đỏ nói về một con số họ
  // không đặt ra và cũng không sửa được.  #Huynh
  const unpayable = !isFree && !isMomoPayableAmount(price);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
        isCurrent
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-md",
        meta.popular && !isCurrent && "border-primary/30"
      )}
    >
      {meta.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground shadow">
            <Zap className="h-2.5 w-2.5" /> Phổ biến nhất
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Check className="h-3 w-3" /> Gói hiện tại
          </span>
        </div>
      )}

      <div>
        <div className={cn("mb-3 inline-flex rounded-xl bg-muted p-2.5", meta.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold">{plan.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-3xl font-black tracking-tight">
            {isFree ? "Miễn phí" : formatPrice(planPrice(plan), plan.currency)}
          </span>
          <span className="text-sm text-muted-foreground">{isFree ? "mãi mãi" : "/ tháng"}</span>
        </div>
      </div>

      {/* Gạch ngang tính năng không có (line-through) làm thẻ trông như bảng hàng lỗi.
          Bảng giá của sản phẩm thật không gạch — chỉ làm mờ icon và để chữ nguyên vẹn.  #Huynh */}
      <ul className="mb-6 flex-1 space-y-3 border-t border-border pt-5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2.5 text-sm">
            {r.value ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className={cn("min-w-0", !r.value && "text-muted-foreground")}>
              {r.value && r.value !== "Có" ? (
                <>
                  <span className="font-semibold text-foreground">{r.value}</span>{" "}
                  <span className="text-muted-foreground">{r.label.toLowerCase()}</span>
                </>
              ) : (
                r.label
              )}
            </span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="rounded-lg border border-border bg-muted/30 py-2.5 text-center text-sm font-semibold text-muted-foreground">
          Đang sử dụng
        </div>
      ) : (
        // Gói free không có gì để trả tiền, nên không dựng phiên thanh toán.
        //
        // Nút này trước đây là một link `mailto:` kèm ghi chú "backend CHƯA có endpoint
        // nâng cấp". Ghi chú đó đã lỗi thời từ lúc PR #77 thêm POST /subscriptions/checkout
        // — router hiện có 4 endpoint, không phải 2. Người dùng bấm "nâng cấp" xong thấy
        // hộp thư bật lên, trong khi hệ thống thừa sức tự bán.  #Huynh
        <button
          type="button"
          disabled={isFree || unpayable || buying || disabled}
          onClick={() => onBuy(plan)}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            isFree || unpayable
              ? "border border-border text-muted-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          )}
        >
          {isFree ? (
            "Miễn phí"
          ) : unpayable ? (
            "Chưa mua được"
          ) : buying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang mở trang thanh toán…
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Nâng cấp qua MoMo
            </>
          )}
        </button>
      )}

      {unpayable && (
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          Giá gói này nằm ngoài khoảng MoMo hỗ trợ (1.000đ – 50.000.000đ). Bạn liên hệ quản
          trị viên để được chỉnh lại giúp nhé.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/** Query param MoMo đá về kèm — dùng để biết CẦN HỎI intent nào, không phải để tin kết quả. */
const INTENT_PARAM = "intent";

export function SubscriptionPage() {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscription, isLoading: subLoading } = useMySubscription();

  // Đọc MỘT LẦN lúc mount, từ hai nguồn theo thứ tự ưu tiên:
  //   1. `?intent=` trên URL — cho phép mở thẳng bằng link (tiện lúc test).
  //   2. sessionStorage — đường thường: id được nhớ ngay trước khi rời trang sang MoMo,
  //      vì `return_url` không mang được id (xem `handleBuy`).
  //
  // Kết quả MoMo đá kèm trên URL, đọc MỘT LẦN lúc mount (dưới đây sẽ dọn khỏi thanh địa chỉ).
  // Khi người dùng bấm HUỶ trên MoMo thì không có IPN nào được gửi → intent bên backend nằm
  // nguyên ở `pending` → nếu chỉ tin backend thì trang kẹt vĩnh viễn ở "Đang xác nhận thanh
  // toán với MoMo…".  #Huynh
  const [momoReturn] = useState(() => readMomoReturn(window.location.search));
  const momoRejected = momoReturn !== null && (momoReturn.outcome === "cancelled" || momoReturn.outcome === "failed");

  const [intentId] = useState<string | null>(() => {
    // MoMo đã nói rõ là hỏng/huỷ → không có gì để chờ, đừng mở vòng hỏi lại.
    if (momoRejected) return null;
    return (
      new URLSearchParams(window.location.search).get(INTENT_PARAM) ??
      readRememberedIntent()
    );
  });
  const { data: intent, pollTimedOut } = usePaymentIntent(intentId);
  const checkout = useCreateCheckout();

  // Nút nào đang bấm — theo ID GÓI, không phải một cờ boolean dùng chung. Dùng
  // `checkout.isPending` cho mọi thẻ thì bấm một thẻ là cả ba thẻ cùng quay spinner.  #Huynh
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Dọn query param MoMo ngay sau khi đã đọc: F5 một cái mà còn `resultCode` cũ thì trang
  // báo lại kết quả của một giao dịch đã qua. Giữ nguyên `?tab=` để không nhảy tab.
  useEffect(() => {
    stripMomoParams();
  }, []);

  // MoMo báo hỏng/huỷ thì quên intent đang nhớ đi, để lần vào sau không hỏi lại nó nữa.
  useEffect(() => {
    if (momoRejected) forgetIntent();
  }, [momoRejected]);

  async function handleBuy(plan: PlanResponse) {
    setUpgradingPlanId(plan.id);
    try {
      const created = await checkout.mutateAsync({
        planId: plan.id,
        // Không nhét id vào đây được: id do chính lời gọi này sinh ra, nên lúc gửi
        // `return_url` thì chưa có. Vì vậy URL quay về chỉ trỏ đúng tab, còn id thì nhớ
        // bằng sessionStorage ngay bên dưới.  #Huynh
        returnUrl: `${window.location.origin}/?tab=subscription`,
      });

      const link = created.payment_link?.url;
      if (!link) {
        toast.error("MoMo không trả về link thanh toán. Thử lại giúp mình nhé.");
        setUpgradingPlanId(null);
        return;
      }

      // Nhớ TRƯỚC khi rời trang. sessionStorage (không phải localStorage) vì đây là một
      // hành trình trong CÙNG một tab: người dùng sang MoMo rồi quay lại. Dùng
      // localStorage thì một tab khác mở sau đó cũng tưởng mình đang chờ thanh toán.
      rememberIntent(created.id);
      // Không tắt spinner ở đây: trang đang rời đi, giữ nguyên trạng thái "đang mở trang
      // thanh toán" cho tới lúc trình duyệt chuyển đi thật.
      window.location.href = link;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không mở được trang thanh toán. Thử lại giúp mình nhé."));
      setUpgradingPlanId(null);
    }
  }

  // Chốt xong thì dọn, để lần vào sau không hỏi lại một giao dịch cũ.
  useEffect(() => {
    if (intent && SETTLED_PAYMENT_STATUSES.includes(intent.status)) {
      forgetIntent();
    }
  }, [intent]);

  const isLoading = plansLoading || subLoading;

  const statusMeta = subscription ? STATUS_LABEL[subscription.status] ?? STATUS_LABEL.active : null;

  // Sort: free → pro → agency → gói do quản trị viên tự tạo
  //
  // `ORDER.indexOf` trả -1 cho mã lạ, mà -1 nhỏ hơn mọi hạng hợp lệ — nên gói tự tạo bị
  // đẩy lên ĐẦU bảng giá, đứng trước cả Free. `rank` đưa chúng xuống cuối.  #Huynh
  const ORDER = ["free", "pro", "agency"];
  const rank = (slug: string) => {
    const index = ORDER.indexOf(slug);
    return index === -1 ? ORDER.length : index;
  };
  const sortedPlans = [...(plans ?? [])].sort((a, b) => rank(a.slug) - rank(b.slug));

  return (
    // `h-full overflow-y-auto`: container chung của các tab là `overflow-hidden` (vì Kanban
    // tự cuộn ngang bên trong), nên mỗi tab phải TỰ lo cuộn dọc. Thiếu nó là trang dài hơn
    // màn hình bị CẮT — không cuộn xuống xem hết gói được.  #Huynh
    <div className="mx-auto h-full max-w-5xl space-y-8 overflow-y-auto px-4 py-8 lg:px-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gói dịch vụ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn gói phù hợp với quy mô công việc freelance của bạn.
        </p>
      </div>

      {/* Kết quả lần thanh toán vừa rồi.
          Hiện cả trạng thái "đang chờ": tiền vào qua IPN — một đường server-to-server chạy
          song song với việc trình duyệt quay về — nên lúc trang mở lại backend có thể chưa
          kịp nhận. Không nói gì thì người dùng tưởng trả tiền hụt và bấm mua lần nữa. */}
      {/* MoMo đã nói rõ là huỷ/hỏng ngay trên URL quay về → nói thẳng, đừng chờ backend.
          Đây chính là ca `resultCode=1006` (người dùng bấm huỷ): không có IPN nào được gửi
          nên hỏi backend bao lâu cũng chỉ nhận lại `pending`.  #Huynh */}
      {momoRejected && momoReturn && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {momoReturn.outcome === "cancelled"
              ? "Bạn đã huỷ thanh toán trên MoMo. Gói hiện tại giữ nguyên — bấm nâng cấp lại bất cứ lúc nào."
              : `Thanh toán không thành công${momoReturn.message ? `: ${momoReturn.message}` : "."} Bạn có thể bấm nâng cấp lại.`}
          </span>
        </div>
      )}

      {intent && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
            pollTimedOut
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : intent.status === "succeeded"
              ? "border-success/30 bg-success/10 text-success"
              : intent.status === "pending" || intent.status === "processing"
                ? "border-border bg-muted/40 text-muted-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {intent.status === "pending" || intent.status === "processing" ? (
            pollTimedOut ? (
              // Hỏi hoài không ra kết quả thì phải NÓI, chứ không quay spinner mãi.
              <>
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Chưa nhận được xác nhận từ MoMo. Nếu tiền đã bị trừ, gói sẽ tự kích hoạt khi
                  MoMo báo về — bạn tải lại trang sau ít phút để kiểm tra.
                </span>
              </>
            ) : (
              <>
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                <span>Đang xác nhận thanh toán với MoMo… Bạn cứ ở lại trang này một lát nhé.</span>
              </>
            )
          ) : intent.status === "succeeded" ? (
            <>
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Thanh toán thành công. Gói của bạn đã được kích hoạt.</span>
            </>
          ) : (
            <>
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {intent.failure_reason?.trim() ||
                  (intent.status === "expired"
                    ? "Phiên thanh toán đã hết hạn. Bạn có thể bấm nâng cấp lại."
                    : "Giao dịch chưa hoàn tất. Bạn có thể bấm nâng cấp lại.")}
              </span>
            </>
          )}
        </div>
      )}

      {/* MỘT thẻ tổng quan, không phải hai thẻ xếp chồng.
          Trước đây "gói đang dùng" và "hạn mức AI" là hai khối full-width nằm chồng lên
          nhau — cùng viền, cùng nền, cùng cỡ. Nhìn như hai cái hộp rời rạc chứ không
          phải một trang được thiết kế.  #Huynh */}
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin gói...
        </div>
      ) : subscription ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid md:grid-cols-[1fr_1px_1fr]">
            {/* Gói đang dùng */}
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Gói đang dùng
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-xl font-bold">{subscription.plan_name}</span>
                    {statusMeta && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          statusMeta.cls
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Bắt đầu</span>
                  <span className="font-medium">
                    {formatDate(subscription.current_period_start)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Gia hạn</span>
                  <span className="font-medium">
                    {isPerpetual(subscription.current_period_end)
                      ? "Không giới hạn"
                      : formatDate(subscription.current_period_end)}
                  </span>
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="pt-1 text-xs font-medium text-destructive">Sẽ huỷ cuối kỳ</div>
                )}
              </div>
            </div>

            <div className="hidden bg-border md:block" />

            {/* Hạn mức AI — số THẬT. Trước đây chỗ này chỉ là một câu nói suông
                ("sẽ được ghi nhận vào hạn mức tháng") không kèm con số nào. Mà hồi đó
                cũng chẳng có gì để hiện: backend không đếm, usage_records rỗng 0 dòng. */}
            <AiQuotaPanel />
          </div>
        </div>
      ) : null}

      {/* Plan cards */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan_slug === plan.slug}
              onBuy={handleBuy}
              // Chỉ thẻ VỪA BẤM mới quay spinner…
              buying={upgradingPlanId === plan.id}
              // …còn các thẻ khác thì khoá tạm, để không mở hai phiên thanh toán cùng lúc.
              disabled={upgradingPlanId !== null && upgradingPlanId !== plan.id}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        Để nâng cấp hoặc thay đổi gói, vui lòng liên hệ{" "}
        <a href="mailto:solodeskai@gmail.com" className="text-primary underline underline-offset-2">
          solodeskai@gmail.com
        </a>
        . Chúng tôi sẽ kích hoạt trong vòng 24 giờ.
      </p>
    </div>
  );
}

/**
 * Hạn mức AI trong kỳ — nằm nửa phải của thẻ tổng quan.
 *
 * Freelancer cần biết còn bao nhiêu lượt TRƯỚC khi bấm một nút AI, không phải sau khi
 * bị chặn bằng lỗi 429.
 */
function AiQuotaPanel() {
  const { data: usage, isLoading } = useAiUsage();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải hạn mức AI...
      </div>
    );
  }

  if (!usage?.can_use_ai) {
    return (
      <div className="flex flex-col justify-center gap-2 p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          Tính năng AI
        </div>
        <p className="text-sm text-muted-foreground">
          Gói hiện tại <span className="font-semibold text-foreground">chưa có AI</span>. Nâng cấp để
          dùng đánh giá deal, soạn báo giá, soạn hợp đồng và nhắc khách bằng AI.
        </p>
      </div>
    );
  }

  const used = usage.generations_used ?? 0;
  const limit = usage.limit ?? 0;
  const remaining = usage.remaining ?? 0;
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;

  // Sắp hết thì phải nhìn ra ngay, đừng để họ bấm rồi mới ăn 429.
  const exhausted = limit > 0 && remaining === 0;
  const nearLimit = !exhausted && limit > 0 && remaining <= Math.max(3, Math.round(limit * 0.1));

  const tone = exhausted
    ? { ring: "text-destructive", text: "text-destructive" }
    : nearLimit
      ? { ring: "text-amber-500", text: "text-amber-600" }
      : { ring: "text-primary", text: "text-foreground" };

  const RADIUS = 30;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
        Lượt AI trong kỳ
      </div>

      <div className="mt-4 flex items-center gap-5">
        {/* Vòng tròn thay thanh ngang: gọn hơn, và cân với khối bên trái. */}
        <div className={cn("relative h-[76px] w-[76px] shrink-0", tone.ring)}>
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={RADIUS} fill="none" strokeWidth="7" className="stroke-muted" />
            <circle
              cx="38"
              cy="38"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className={cn("text-lg font-black leading-none", tone.text)}>{remaining}</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none">
            {used}
            <span className="text-base font-semibold text-muted-foreground"> / {limit}</span>
          </div>
          <div className="mt-1.5 text-sm text-muted-foreground">đã dùng trong kỳ này</div>

          {exhausted ? (
            <p className="mt-2 text-sm font-semibold text-destructive">
              Đã hết lượt — nâng cấp gói để tiếp tục.
            </p>
          ) : nearLimit ? (
            <p className="mt-2 text-sm font-semibold text-amber-600">
              Sắp hết lượt. Cân nhắc nâng cấp trước khi bị chặn giữa chừng.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              Mỗi lần đánh giá deal, soạn báo giá, hợp đồng hoặc nhắc khách bằng AI tính là một lượt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
