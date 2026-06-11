import { useMemo, useState } from "react";
import {
  X,
  Bell,
  Mail,
  MessageCircle,
  Calendar,
  AlertTriangle,
  Heart,
  Copy,
  Check,
  Send,
  Smartphone,
  Landmark,
  Sparkles,
} from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";

type Tone = "formal" | "casual";
type Channel = "email" | "zalo";
type ReminderKind = "due_soon" | "overdue" | "reengage";

const MERCHANT = {
  name: "MINH NGUYEN",
  phone: "0909123456",
  bank: "Vietcombank",
  bankAccount: "0123456789",
};

// Build a MoMo deeplink/url. In production this would come from MoMo Business API.
// We mock a realistic-looking pay URL with reference.
function buildMomoLink(amount: number, ref: string) {
  const params = new URLSearchParams({
    phone: MERCHANT.phone,
    amount: String(amount),
    note: ref,
  });
  return `https://me.momo.vn/${MERCHANT.phone}?${params.toString()}`;
}

function buildBankNote(deal: Deal) {
  return `SOLODESK ${deal.id.toUpperCase()} ${deal.client.split(" ").slice(-1)[0]}`.toUpperCase();
}

// Pick deals most relevant to each reminder kind from current pipeline.
function pickTargets(deals: Deal[]): Record<ReminderKind, Deal[]> {
  const due = deals.filter((d) => d.stage === "active" && d.paymentStatus !== "Đã thanh toán");
  const overdue = deals.filter(
    (d) => d.stage === "active" && d.paymentStatus === "Đã đặt cọc"
  );
  const reengage = deals.filter((d) => d.stage === "completed_and_billed");
  return { due_soon: due, overdue, reengage };
}

const KIND_META: Record<
  ReminderKind,
  { title: string; subtitle: string; icon: typeof Bell; tone: string }
> = {
  due_soon: {
    title: "Sắp đến hạn thanh toán",
    subtitle: "Nhắc nhẹ trước 3 ngày, kèm link MoMo & STK ngân hàng.",
    icon: Calendar,
    tone: "text-primary bg-primary/10",
  },
  overdue: {
    title: "Quá hạn thanh toán",
    subtitle: "Tin nhắn lịch sự nhưng dứt khoát, có cảnh báo phí trễ hạn.",
    icon: AlertTriangle,
    tone: "text-warning-foreground bg-warning/20",
  },
  reengage: {
    title: "Tương tác lại khách cũ",
    subtitle: "Gợi nhớ dịch vụ, ưu đãi khách thân thiết, mời dự án mới.",
    icon: Heart,
    tone: "text-success bg-success/15",
  },
};

function buildMessage(
  kind: ReminderKind,
  deal: Deal,
  tone: Tone,
  channel: Channel
): { subject?: string; body: string } {
  const remaining =
    deal.paymentStatus === "Đã đặt cọc" ? Math.round(deal.value * 0.5) : deal.value;
  const ref = buildBankNote(deal);
  const momo = buildMomoLink(remaining, ref);
  const greet =
    tone === "formal"
      ? `Kính gửi Quý khách ${deal.client},`
      : `Hi ${deal.client.split(" ").slice(-1)[0]} ơi,`;
  const sign =
    tone === "formal" ? "Trân trọng,\nMinh Nguyễn — SoloDesk" : "Cảm ơn nha,\nMinh ✨";

  if (kind === "due_soon") {
    const subject =
      tone === "formal"
        ? `[Nhắc thanh toán] ${deal.projectType} - đến hạn 3 ngày tới`
        : `Nhắc nhẹ thanh toán dự án "${deal.projectType}" 💙`;
    const body =
      `${greet}\n\n` +
      (tone === "formal"
        ? `Em xin phép nhắc Anh/Chị về đợt thanh toán cho dự án "${deal.projectType}" với số tiền cần thanh toán là ${formatVND(
            remaining
          )}, dự kiến đến hạn trong 3 ngày tới.\n\n`
        : `Mình nhắc nhẹ chút xíu nha: dự án "${deal.projectType}" sắp tới đợt thanh toán ${formatVND(
            remaining
          )} (còn 3 ngày nữa).\n\n`) +
      `💳 Thanh toán nhanh qua MoMo:\n${momo}\n\n` +
      `🏦 Hoặc chuyển khoản:\n• Ngân hàng: ${MERCHANT.bank}\n• Số TK: ${MERCHANT.bankAccount}\n• Chủ TK: ${MERCHANT.name}\n• Nội dung: ${ref}\n\n` +
      `${sign}`;
    return { subject: channel === "email" ? subject : undefined, body };
  }

  if (kind === "overdue") {
    const subject =
      tone === "formal"
        ? `[Quan trọng] Thanh toán quá hạn - ${deal.projectType}`
        : `Khoản thanh toán dự án "${deal.projectType}" hơi trễ rồi nè`;
    const body =
      `${greet}\n\n` +
      (tone === "formal"
        ? `Em ghi nhận khoản thanh toán ${formatVND(
            remaining
          )} cho dự án "${deal.projectType}" hiện đã quá hạn 3 ngày. Mong Anh/Chị thu xếp giúp em trong 48h tới để dự án không bị gián đoạn. Theo điều khoản hợp đồng, phí trễ hạn 2%/tuần sẽ áp dụng nếu vượt quá 7 ngày.\n\n`
        : `Khoản ${formatVND(
            remaining
          )} của dự án "${deal.projectType}" đã trễ 3 ngày rồi á. Bạn xem giúp mình trong 1-2 hôm nha, nếu để lâu sẽ bị tính phí trễ hạn 2%/tuần theo hợp đồng mình ký.\n\n`) +
      `⚡ Link MoMo (1 chạm):\n${momo}\n\n` +
      `🏦 Chuyển khoản:\n• ${MERCHANT.bank} - ${MERCHANT.bankAccount}\n• ${MERCHANT.name}\n• Nội dung: ${ref}\n\n` +
      `${sign}`;
    return { subject: channel === "email" ? subject : undefined, body };
  }

  // reengage
  const subject =
    tone === "formal"
      ? `Cảm ơn Anh/Chị đã đồng hành cùng SoloDesk`
      : `Lâu quá không gặp ${deal.client.split(" ").slice(-1)[0]} 👋`;
  const body =
    `${greet}\n\n` +
    (tone === "formal"
      ? `Đã 60 ngày từ khi chúng ta hoàn thành dự án "${deal.projectType}". Em hy vọng kết quả vẫn đang phát huy hiệu quả tốt cho Anh/Chị.\n\nNhân dịp Quý 2, em dành tặng Anh/Chị ưu đãi 15% cho dự án tiếp theo. Anh/Chị có nhu cầu mở rộng scope hay làm thêm hạng mục mới không ạ?\n\n`
      : `Lâu rồi không gặp! Dự án "${deal.projectType}" mình làm hồi trước giờ chạy ổn không?\n\nQuý này mình có ưu đãi -15% cho khách cũ nè, nếu bạn có ý tưởng gì mới cứ nhắn mình nha, mình tư vấn miễn phí trong 30 phút!\n\n`) +
    `${sign}`;
  return { subject: channel === "email" ? subject : undefined, body };
}

export function ReminderCenter({
  open,
  onClose,
  deals,
}: {
  open: boolean;
  onClose: () => void;
  deals: Deal[];
}) {
  const [kind, setKind] = useState<ReminderKind>("due_soon");
  const [tone, setTone] = useState<Tone>("formal");
  const [channel, setChannel] = useState<Channel>("zalo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<"now" | "+1h" | "+1d" | "+3d">("+1d");
  const [copied, setCopied] = useState<"momo" | "msg" | null>(null);
  const [sent, setSent] = useState(false);

  const targets = useMemo(() => pickTargets(deals), [deals]);
  const list = targets[kind];
  const deal = list.find((d) => d.id === selectedId) ?? list[0] ?? null;

  if (!open) return null;

  const message = deal ? buildMessage(kind, deal, tone, channel) : null;
  const remaining =
    deal && deal.paymentStatus === "Đã đặt cọc" ? Math.round(deal.value * 0.5) : deal?.value ?? 0;
  const momo = deal ? buildMomoLink(remaining, buildBankNote(deal)) : "";

  const copy = (text: string, key: "momo" | "msg") => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const send = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  };

  const KindIcon = KIND_META[kind].icon;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden bg-card rounded-2xl shadow-2xl border border-border flex flex-col">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow grid place-items-center">
              <Bell className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">Trung tâm Nhắc nhở Khách hàng</div>
              <div className="text-xs text-muted-foreground">
                Lên lịch chuỗi nhắc thanh toán & tương tác lại khách cũ
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] flex-1 overflow-hidden">
          {/* Left rail: kinds + targets */}
          <div className="border-r border-border bg-muted/30 overflow-y-auto">
            <div className="p-3 space-y-1">
              {(Object.keys(KIND_META) as ReminderKind[]).map((k) => {
                const M = KIND_META[k];
                const Icon = M.icon;
                const count = targets[k].length;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setKind(k);
                      setSelectedId(null);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                      active ? "bg-card border border-border shadow-sm" : "hover:bg-card/60"
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-md grid place-items-center ${M.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center justify-between gap-2">
                        <span className="truncate">{M.title}</span>
                        <span className="text-[10px] rounded-full bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                          {count}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {M.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-3 pb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
                Chọn khách hàng
              </div>
              <div className="space-y-1">
                {list.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-3 text-center rounded-md border border-dashed border-border">
                    Không có khách phù hợp.
                  </div>
                )}
                {list.map((d) => {
                  const active = (selectedId ?? list[0]?.id) === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-card"
                      }`}
                    >
                      <div className="font-medium truncate">{d.client}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {formatVND(d.value)} · {d.paymentStatus}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: composer */}
          <div className="overflow-y-auto p-6 space-y-5">
            {!deal ? (
              <div className="text-sm text-muted-foreground">
                Hiện chưa có khách hàng nào cần {KIND_META[kind].title.toLowerCase()}.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-gradient-to-br from-accent/40 to-background p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <KindIcon className="h-3 w-3" /> {KIND_META[kind].title}
                    </div>
                    <div className="font-semibold truncate">{deal.client}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {deal.projectType} · {deal.contact}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Số tiền cần thu</div>
                    <div className="text-lg font-bold text-primary">{formatVND(remaining)}</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-medium mb-1.5">Giọng điệu</div>
                    <div className="flex gap-1 rounded-md bg-muted p-1">
                      {(["formal", "casual"] as Tone[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={`flex-1 text-xs py-1.5 rounded ${
                            tone === t
                              ? "bg-card shadow-sm font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t === "formal" ? "Trang trọng" : "Thân mật"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1.5">Kênh gửi</div>
                    <div className="flex gap-1 rounded-md bg-muted p-1">
                      <button
                        onClick={() => setChannel("zalo")}
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 rounded ${
                          channel === "zalo"
                            ? "bg-card shadow-sm font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <MessageCircle className="h-3 w-3" /> Zalo OA
                      </button>
                      <button
                        onClick={() => setChannel("email")}
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 rounded ${
                          channel === "email"
                            ? "bg-card shadow-sm font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Mail className="h-3 w-3" /> SendGrid
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1.5">Lên lịch</div>
                    <select
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value as typeof schedule)}
                      className="w-full text-xs rounded-md border border-input bg-background px-2 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="now">Gửi ngay</option>
                      <option value="+1h">Sau 1 giờ</option>
                      <option value="+1d">Sáng mai 9:00</option>
                      <option value="+3d">3 ngày nữa</option>
                    </select>
                  </div>
                </div>

                {/* Payment chips */}
                {kind !== "reengage" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3 bg-card">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <div className="h-7 w-7 rounded-md bg-pink-500/15 grid place-items-center">
                          <Smartphone className="h-3.5 w-3.5 text-pink-600" />
                        </div>
                        MoMo Pay Link
                      </div>
                      <div className="mt-2 text-[11px] font-mono break-all text-muted-foreground bg-muted/50 rounded p-2">
                        {momo}
                      </div>
                      <button
                        onClick={() => copy(momo, "momo")}
                        className="mt-2 inline-flex items-center gap-1 text-xs rounded-md bg-secondary px-2 py-1 hover:bg-secondary/70"
                      >
                        {copied === "momo" ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copied === "momo" ? "Đã copy" : "Copy link"}
                      </button>
                    </div>
                    <div className="rounded-xl border border-border p-3 bg-card">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <div className="h-7 w-7 rounded-md bg-primary/15 grid place-items-center">
                          <Landmark className="h-3.5 w-3.5 text-primary" />
                        </div>
                        Chuyển khoản ngân hàng
                      </div>
                      <div className="mt-2 text-xs space-y-0.5">
                        <div>
                          <span className="text-muted-foreground">NH:</span>{" "}
                          <b>{MERCHANT.bank}</b>
                        </div>
                        <div>
                          <span className="text-muted-foreground">STK:</span>{" "}
                          <b>{MERCHANT.bankAccount}</b>
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">ND:</span>{" "}
                          <b>{buildBankNote(deal)}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drafted message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" /> Bản nháp tin nhắn (
                      {channel === "email" ? "Email - SendGrid" : "Zalo OA"})
                    </div>
                    <button
                      onClick={() =>
                        copy(
                          (message?.subject ? message.subject + "\n\n" : "") + (message?.body ?? ""),
                          "msg"
                        )
                      }
                      className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied === "msg" ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </button>
                  </div>
                  {channel === "email" && message?.subject && (
                    <div className="rounded-t-lg border border-b-0 border-border bg-muted/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <b>{message.subject}</b>
                    </div>
                  )}
                  <div
                    className={`border border-border bg-card p-3.5 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto ${
                      channel === "email" && message?.subject ? "rounded-b-lg" : "rounded-lg"
                    }`}
                  >
                    {message?.body}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-muted-foreground">
                    {schedule === "now"
                      ? "Sẽ gửi ngay lập tức"
                      : schedule === "+1h"
                      ? "Đặt lịch sau 1 giờ"
                      : schedule === "+1d"
                      ? "Đặt lịch sáng mai 9:00"
                      : "Đặt lịch sau 3 ngày"}
                    {" · "}qua {channel === "email" ? "SendGrid" : "Zalo OA API"}
                  </div>
                  <button
                    onClick={send}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition ${
                      sent
                        ? "bg-success text-success-foreground"
                        : "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-95"
                    }`}
                  >
                    {sent ? (
                      <>
                        <Check className="h-4 w-4" /> Đã đưa vào hàng đợi
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {schedule === "now" ? "Gửi ngay" : "Lên lịch gửi"}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
