import { useState } from "react";
import { Check, Copy, Loader2, Mail, MessageCircle, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useGenerateFollowUp } from "@/features/ai/hooks/useFollowUp";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import type { Deal } from "@/features/deals/types";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { ReminderType } from "@/services/followupsService";

type Option = {
  type: ReminderType;
  label: string;
  hint: string;
};

/**
 * Bảy loại nhắc mà backend hỗ trợ. Nhưng KHÔNG bày cả bảy ra cùng lúc — xem
 * `optionsForStage()`: mỗi giai đoạn deal chỉ có vài loại là hợp lý, đưa hết ra là bắt
 * người dùng tự đoán nên chọn cái nào.
 */
const ALL_OPTIONS: Option[] = [
  { type: "follow_up", label: "Hỏi thăm", hint: "Khách chưa phản hồi sau khi trao đổi" },
  { type: "proposal_follow_up", label: "Nhắc xem báo giá", hint: "Đã gửi báo giá, khách chưa trả lời" },
  { type: "contract_signing_nudge", label: "Nhắc ký hợp đồng", hint: "Hợp đồng đã gửi, chờ khách ký" },
  { type: "payment_due", label: "Nhắc thanh toán", hint: "Hoá đơn sắp tới hạn" },
  { type: "payment_overdue", label: "Nhắc quá hạn", hint: "Hoá đơn đã quá hạn — vẫn lịch sự" },
  { type: "re_engagement", label: "Nối lại liên lạc", hint: "Khách im lặng đã lâu" },
];

/** Giai đoạn deal quyết định loại nhắc nào là hợp lý. */
function optionsForStage(stage: Deal["stage"]): Option[] {
  const pick = (...types: ReminderType[]) =>
    types
      .map((type) => ALL_OPTIONS.find((option) => option.type === type))
      .filter((option): option is Option => Boolean(option));

  switch (stage) {
    case "proposal_sent":
      return pick("proposal_follow_up", "follow_up", "re_engagement");
    case "in_negotiation":
      return pick("contract_signing_nudge", "follow_up", "re_engagement");
    case "active":
      return pick("payment_due", "payment_overdue", "follow_up");
    case "completed_and_billed":
      return pick("payment_overdue", "payment_due", "re_engagement");
    default:
      return pick("follow_up", "re_engagement");
  }
}

export function FollowUpModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const options = deal ? optionsForStage(deal.stage) : [];
  const [reminderType, setReminderType] = useState<ReminderType>(options[0]?.type ?? "follow_up");
  const [message, setMessage] = useState("");
  // AI soạn cả tiêu đề ("Nhắc thanh toán hoá đơn INV-2026-001"). Trước đó tôi vứt đi rồi
  // tự ghép "Về dự án X" — đúng cái bẫy đã mắc với next_step/suggested_actions bên chấm
  // điểm deal: backend trả về hẳn hoi mà frontend không dùng.  #Huynh
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useGenerateFollowUp();

  if (!deal) return null;

  function run(type: ReminderType) {
    if (!deal) return;
    setReminderType(type);
    setCopied(false);

    generate.mutate(
      { reminder_type: type, target_type: "deal", target_id: deal.id },
      {
        onSuccess: (result) => {
          setMessage(result.message_text);
          setSubject(result.subject?.trim() || "");
        },
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 402) {
            toast.error("Gói của bạn chưa có tính năng AI. Hãy nâng cấp để dùng.");
            return;
          }
          // 429 = hết hạn mức tháng. Không nói rõ thì người dùng bấm lại mãi mà không
          // hiểu vì sao, vì thông báo mặc định là "Vui lòng thử lại".  #Huynh
          if (status === 429) {
            toast.error(
              "Đã dùng hết lượt AI trong kỳ này. Vào mục Gói đăng ký để xem hạn mức."
            );
            return;
          }
          toast.error(getApiErrorMessage(error, "Không soạn được tin nhắn. Vui lòng thử lại."));
        },
      }
    );
  }

  async function handleCopy() {
    if (!deal) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Đã copy tin nhắn.");
      addDealHistoryEntry(deal.id, {
        date: new Date().toISOString(),
        text: "Đã soạn tin nhắn nhắc khách bằng AI.",
        channel: "message",
      });
    } catch {
      toast.error("Trình duyệt không cho copy. Bạn bôi đen rồi copy tay nhé.");
    }
  }

  // Mở sẵn Zalo/email với nội dung đã soạn. Vẫn KHÔNG tự gửi — người dùng bấm gửi trong
  // ứng dụng của họ. Tin nhắn đi thẳng tới khách, phải có người đọc lại.
  const zaloUrl = deal.clientPhone ? `https://zalo.me/${deal.clientPhone.replace(/\D/g, "")}` : null;
  const emailSubject = subject || `Về dự án ${deal.projectType}`;
  const mailUrl = deal.clientEmail
    ? `mailto:${deal.clientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`
    : null;

  const isEmpty = !message.trim();

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Nhắc khách bằng AI</div>
              <div className="text-xs text-muted-foreground">
                AI soạn bản nháp — bạn đọc lại và sửa trước khi gửi
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nhắc về
            </div>
            <div className="mt-0.5 truncate font-semibold">{deal.projectType}</div>
            <div className="text-sm text-muted-foreground">{deal.client}</div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold">Nhắc chuyện gì?</div>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  title={option.hint}
                  onClick={() => run(option.type)}
                  disabled={generate.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    reminderType === option.type && message
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {generate.isPending && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">AI đang soạn tin nhắn...</div>
            </div>
          )}

          {!generate.isPending && isEmpty && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Chọn một mục ở trên để AI soạn tin nhắn.
            </div>
          )}

          {!generate.isPending && !isEmpty && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Tin nhắn</span>
                <button
                  type="button"
                  onClick={() => run(reminderType)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Soạn lại
                </button>
              </div>
              {subject && (
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Tiêu đề email"
                  className="mb-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary"
                />
              )}
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setCopied(false);
                }}
                rows={7}
                className="w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-6 outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Đọc lại trước khi gửi — AI có thể viết chưa đúng ý bạn.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isEmpty}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Đã copy" : "Copy"}
          </button>

          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary",
                isEmpty && "pointer-events-none opacity-50"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              Mở Zalo
            </a>
          )}

          {mailUrl && (
            <a
              href={mailUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90",
                isEmpty && "pointer-events-none opacity-50"
              )}
            >
              <Mail className="h-4 w-4" />
              Soạn email
            </a>
          )}

          {!zaloUrl && !mailUrl && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Send className="h-3.5 w-3.5" />
              Khách chưa có số điện thoại hoặc email
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
