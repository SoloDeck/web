import { AlertTriangle, Loader2, Zap } from "lucide-react";

import { useZaloStatus } from "@/features/profile/hooks/useZalo";
import { useReminderRules, useUpdateReminderRule } from "@/features/reminders/hooks/useReminders";
import type { ReminderChannel, ReminderRule } from "@/services/remindersService";
import { cn } from "@/lib/utils";

/**
 * Cấu hình quy tắc nhắc tự động.
 *
 * Trước màn này, hệ thống chỉ gửi được lời nhắc do người dùng TỰ TẠO TAY — tức freelancer
 * vẫn phải tự nhớ hoá đơn nào sắp tới hạn, khách nào chưa phản hồi báo giá.
 */

/** Câu mô tả mốc thời gian của từng quy tắc — "3 ngày" một mình thì không rõ 3 ngày so với cái gì. */
const OFFSET_LABEL: Record<string, string> = {
  proposal_follow_up: "ngày sau khi gửi báo giá mà khách chưa trả lời",
  contract_signing_nudge: "ngày sau khi gửi hợp đồng mà khách chưa ký",
  payment_due: "ngày TRƯỚC khi hoá đơn tới hạn",
  payment_overdue: "ngày sau khi hoá đơn quá hạn",
  re_engagement: "ngày không liên lạc với khách",
};

const CHANNELS: Array<{ value: ReminderChannel; label: string }> = [
  { value: "in_app", label: "Chỉ nhắc tôi" },
  { value: "email", label: "Gửi email cho khách" },
  { value: "both", label: "Gửi email + nhắc tôi" },
  { value: "zalo", label: "Gửi Zalo cho khách" },
];

export function ReminderRulesSettings() {
  const rulesQuery = useReminderRules();
  const updateRule = useUpdateReminderRule();
  const { data: zaloStatus } = useZaloStatus();
  const zaloConnected = zaloStatus?.connected ?? false;

  function patch(rule: ReminderRule, payload: Parameters<typeof updateRule.mutate>[0]["payload"]) {
    updateRule.mutate({ ruleType: rule.rule_type, payload });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Nhắc nhở tự động</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            SoloDesk tự theo dõi báo giá, hợp đồng và hoá đơn của bạn, rồi soạn sẵn lời nhắc.
            Mặc định bạn duyệt trước khi gửi.
          </p>
        </div>
      </div>

      {rulesQuery.isLoading && (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải quy tắc...
        </div>
      )}

      {rulesQuery.isError && (
        <p className="mt-5 text-sm text-destructive">
          Không tải được quy tắc nhắc. Vui lòng tải lại trang.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {(rulesQuery.data ?? []).map((rule) => (
          <article
            key={rule.rule_type}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              rule.is_enabled ? "border-border" : "border-dashed border-border bg-muted/30"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{rule.label}</h3>
                {!rule.is_enabled && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Đang tắt</p>
                )}
              </div>
              <Toggle
                checked={rule.is_enabled}
                onChange={(is_enabled) => patch(rule, { is_enabled })}
                label="Bật quy tắc"
              />
            </div>

            {rule.is_enabled && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Nhắc khi qua</span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={rule.offset_days}
                    onChange={(event) =>
                      patch(rule, { offset_days: Number(event.target.value) })
                    }
                    className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-muted-foreground">
                    {OFFSET_LABEL[rule.rule_type] ?? "ngày"}
                  </span>
                </div>

                {rule.supports_repeat && rule.repeat_every_days !== null && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Sau đó nhắc lại mỗi</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={rule.repeat_every_days}
                      onChange={(event) =>
                        patch(rule, { repeat_every_days: Number(event.target.value) })
                      }
                      className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-muted-foreground">ngày</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Kênh</span>
                  <select
                    value={normalizeChannel(rule.channel)}
                    onChange={(event) =>
                      patch(rule, { channel: event.target.value as ReminderChannel })
                    }
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CHANNELS.map((channel) => {
                      const zaloLocked = channel.value === "zalo" && !zaloConnected;
                      return (
                        <option
                          key={channel.value}
                          value={channel.value}
                          disabled={zaloLocked}
                        >
                          {zaloLocked ? `${channel.label} (chưa kết nối)` : channel.label}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-muted-foreground">lúc</span>
                  <select
                    value={rule.send_at_hour}
                    onChange={(event) =>
                      patch(rule, { send_at_hour: Number(event.target.value) })
                    }
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={cn(
                    "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3",
                    rule.auto_send
                      ? "border-amber-200 bg-amber-50"
                      : "border-border bg-muted/40"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {rule.auto_send && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      Tự động gửi, không cần tôi duyệt
                    </div>
                    {/* Bật công tắc này là cho phép hệ thống email khách hàng THẬT mà không
                        ai đọc lại. Phải nói thẳng ra, không giấu trong tooltip. */}
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        rule.auto_send ? "text-amber-700" : "text-muted-foreground"
                      )}
                    >
                      {rule.auto_send
                        ? "Email sẽ gửi thẳng tới khách khi tới giờ — bạn sẽ không kịp xem lại."
                        : "Đang tắt: SoloDesk soạn sẵn rồi báo bạn, bạn bấm Gửi ngay."}
                    </p>
                  </div>
                  <Toggle
                    checked={rule.auto_send}
                    onChange={(auto_send) => patch(rule, { auto_send })}
                    label="Tự động gửi"
                  />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function normalizeChannel(channel: string): ReminderChannel {
  if (
    channel === "email" ||
    channel === "both" ||
    channel === "in_app" ||
    channel === "zalo"
  )
    return channel;
  return "in_app";
}
