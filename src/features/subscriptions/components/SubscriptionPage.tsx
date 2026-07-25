import { Bot, Check, CreditCard, Loader2, Mail, Shield, Sparkles, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans, useMySubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import { useAiUsage } from "@/features/revenue/hooks/useAnalytics";
import type { PlanResponse } from "@/services/subscriptionsService";

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
}: {
  plan: PlanResponse;
  isCurrent: boolean;
}) {
  const meta = PLAN_META[plan.slug] ?? PLAN_META.free;
  const Icon = meta.icon;
  const rows = featureRows(plan);
  const isFree = plan.price_monthly === 0;

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
            {isFree ? "0 ₫" : formatPrice(plan.price_monthly, plan.currency)}
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
        // Backend CHƯA có endpoint nâng cấp: openapi.yaml khai /subscriptions/me/upgrade
        // nhưng router chỉ có 2 endpoint đọc (GET /plans, GET /me). Nên nút này mở email
        // liên hệ — và nói rõ như vậy, thay vì để người dùng bấm rồi ngỡ ngàng thấy hộp
        // thư bật lên.  #Huynh
        <a
          href={`mailto:solodeskai@gmail.com?subject=${encodeURIComponent(`Đăng ký gói ${plan.name}`)}&body=${encodeURIComponent(`Tôi muốn nâng cấp lên gói ${plan.name}.`)}`}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            isFree
              ? "border border-border hover:bg-secondary"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {isFree ? (
            "Dùng miễn phí"
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Liên hệ nâng cấp
            </>
          )}
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function SubscriptionPage() {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscription, isLoading: subLoading } = useMySubscription();

  const isLoading = plansLoading || subLoading;

  const statusMeta = subscription ? STATUS_LABEL[subscription.status] ?? STATUS_LABEL.active : null;

  // Sort: free → pro → agency
  const ORDER = ["free", "pro", "agency"];
  const sortedPlans = [...(plans ?? [])].sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    // `h-full overflow-y-auto`: container chung của các tab là `overflow-hidden` (vì Kanban
    // tự cuộn ngang bên trong), nên mỗi tab phải TỰ lo cuộn dọc. Thiếu nó là trang dài hơn
    // màn hình bị CẮT — không cuộn xuống xem hết gói được.  #Huynh
    <div className="mx-auto h-full max-w-5xl space-y-8 overflow-y-auto px-4 py-8 lg:px-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gói đăng ký</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn gói phù hợp với quy mô công việc freelance của bạn.
        </p>
      </div>

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
