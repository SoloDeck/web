import { Bot, Check, CreditCard, Loader2, Shield, Sparkles, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans, useMySubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import type { PlanResponse } from "@/services/subscriptionsService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Miễn phí";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
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

      <div className="mb-4">
        <div className={cn("mb-2 inline-flex rounded-lg bg-muted p-2", meta.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-3xl font-bold">
            {isFree ? "0 ₫" : formatPrice(plan.price_monthly, plan.currency)}
          </span>
          {!isFree && <span className="mb-1 text-sm text-muted-foreground">/ tháng</span>}
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2 text-sm">
            {r.value ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
            <span className={cn(!r.value && "text-muted-foreground/60 line-through")}>
              {r.label}
              {r.value && r.value !== "Có" && (
                <span className="ml-1 font-semibold text-foreground">{r.value}</span>
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
        <button
          onClick={() => {
            window.location.href = `mailto:solodeskai@gmail.com?subject=Đăng ký gói ${plan.name}&body=Tôi muốn nâng cấp lên gói ${plan.name}.`;
          }}
          className={cn(
            "rounded-lg py-2.5 text-sm font-semibold transition-all",
            isFree
              ? "border border-border hover:bg-secondary"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {isFree ? "Dùng miễn phí" : `Nâng cấp lên ${plan.name}`}
        </button>
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gói đăng ký</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn gói phù hợp với quy mô công việc freelance của bạn.
        </p>
      </div>

      {/* Current subscription banner */}
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin gói...
        </div>
      ) : subscription ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gói đang dùng</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-lg font-bold">{subscription.plan_name}</span>
                  {statusMeta && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusMeta.cls)}>
                      {statusMeta.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-sm text-muted-foreground">
              <div>Chu kỳ thanh toán</div>
              <div className="mt-0.5 font-medium text-foreground">
                {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
              </div>
              {subscription.cancel_at_period_end && (
                <div className="mt-1 text-xs text-destructive">Sẽ huỷ cuối kỳ</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* AI usage note */}
      {subscription?.plan_slug !== "free" && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Tính năng <span className="font-semibold text-foreground">AI (báo giá, hợp đồng, đánh giá lead)</span> được
            kích hoạt trên gói của bạn. Mỗi lần tạo nội dung bằng AI sẽ được ghi nhận vào hạn mức tháng.
          </p>
        </div>
      )}

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
