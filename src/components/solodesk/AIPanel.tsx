import { useState } from "react";
import { Loader2, Sparkles, X, Flame, Sun, Snowflake, Bell, MessageCircle, Mail } from "lucide-react";
import { formatVND } from "@/lib/mock-data";

type Result = {
  score: "hot" | "warm" | "cold";
  rationale: string;
  signals: string[];
  priceLow: number;
  priceHigh: number;
  suggestedReply: string;
};

const SAMPLE = `Chào bạn, mình là Hà chủ shop thời trang LaLuna. Shop mình mới mở chi nhánh thứ 3 ở quận 7, cần thuê designer làm bộ ảnh lookbook mùa hè (~30 outfit), gấp trong 2 tuần. Bên bạn báo giá giúp mình nhé, ngân sách dao động 10-15tr. Cảm ơn!`;

export function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [tone, setTone] = useState<"formal" | "casual">("formal");
  const [autoReminder, setAutoReminder] = useState(true);

  const analyze = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const lower = text.toLowerCase();
      const urgent = /gấp|urgent|asap|trong \d|tuần|ngay/i.test(lower);
      const budget = /(\d+)\s*(tr|triệu|m)/i.exec(lower);
      const hasBudget = !!budget;
      const score: Result["score"] = urgent && hasBudget ? "hot" : hasBudget ? "warm" : "cold";
      const base = budget ? parseInt(budget[1]) * 1_000_000 : 8_000_000;
      const r: Result = {
        score,
        rationale:
          score === "hot"
            ? "Khách có ngân sách rõ ràng, thời gian gấp và mô tả công việc cụ thể. Khả năng chốt cao trong 48h."
            : score === "warm"
            ? "Khách đã đề cập ngân sách nhưng chưa nói rõ deadline. Cần follow-up để qualify thêm."
            : "Thông tin còn mơ hồ, chưa rõ ngân sách hay scope. Nên gửi câu hỏi sàng lọc.",
        signals: [
          urgent ? "✓ Có dấu hiệu cần gấp" : "○ Chưa có deadline rõ",
          hasBudget ? `✓ Ngân sách ~${budget![1]} triệu` : "○ Chưa có ngân sách",
          /shop|công ty|chi nhánh|brand/i.test(lower) ? "✓ Khách doanh nghiệp" : "○ Cá nhân",
        ],
        priceLow: Math.round(base * 0.9),
        priceHigh: Math.round(base * 1.4),
        suggestedReply:
          tone === "formal"
            ? `Kính gửi Anh/Chị,\n\nCảm ơn Anh/Chị đã liên hệ. Dựa trên scope mô tả, mình đề xuất gói dịch vụ trong khoảng ${formatVND(
                Math.round(base * 0.9)
              )} - ${formatVND(Math.round(base * 1.4))}. Mình có thể gửi proposal chi tiết trong 24h, Anh/Chị tiện trao đổi qua Zalo lúc nào ạ?\n\nTrân trọng,\nMinh Nguyễn`
            : `Hi bạn,\n\nCảm ơn bạn đã nhắn nhé! Với scope như vậy, mức báo giá tham khảo của mình là ${formatVND(
                Math.round(base * 0.9)
              )} - ${formatVND(Math.round(base * 1.4))}. Mình gửi proposal chi tiết trong hôm nay, bạn tiện call Zalo 15p để mình hiểu rõ hơn không?\n\nThanks,\nMinh`,
      };
      setResult(r);
      setLoading(false);
    }, 1100);
  };

  if (!open) return null;
  const ScoreIcon = result?.score === "hot" ? Flame : result?.score === "warm" ? Sun : Snowflake;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow grid place-items-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">AI Quick Action</div>
              <div className="text-xs text-muted-foreground">Powered by SoloDesk LangChain Engine</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Lead Qualifier — Dán tin nhắn khách hàng</label>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Tone:</span>
                {(["formal", "casual"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-2 py-0.5 rounded-md ${
                      tone === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t === "formal" ? "Formal" : "Casual"}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={analyze}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "AI đang phân tích..." : "Phân tích Lead"}
            </button>
          </div>

          {result && (
            <div className="rounded-xl border border-border bg-gradient-to-br from-accent/40 to-background p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Lead Score</div>
                  <div className={`mt-1 inline-flex items-center gap-2 text-lg font-bold capitalize text-${result.score === "hot" ? "hot" : result.score === "warm" ? "warm" : "cold"}`}>
                    <ScoreIcon className="h-5 w-5" />
                    {result.score}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Khoảng giá đề xuất</div>
                  <div className="text-base font-bold text-primary">
                    {formatVND(result.priceLow)} – {formatVND(result.priceHigh)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">AI Rationale</div>
                <p className="text-sm">{result.rationale}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {result.signals.map((s) => (
                  <span key={s} className="text-xs rounded-full bg-card border border-border px-2.5 py-1">
                    {s}
                  </span>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">Tin nhắn trả lời gợi ý ({tone})</div>
                <div className="rounded-lg bg-card border border-border p-3 text-sm whitespace-pre-wrap font-mono">
                  {result.suggestedReply}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="inline-flex items-center gap-1.5 text-xs rounded-md bg-success text-success-foreground px-3 py-1.5 font-medium hover:opacity-95">
                    <MessageCircle className="h-3 w-3" /> Gửi qua Zalo OA
                  </button>
                  <button className="inline-flex items-center gap-1.5 text-xs rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 font-medium hover:bg-secondary/70">
                    <Mail className="h-3 w-3" /> Gửi Email
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4 flex items-center justify-between bg-muted/40">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/20 grid place-items-center">
                <Bell className="h-4 w-4 text-warning-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">Auto-Reminder cho thanh toán quá hạn</div>
                <div className="text-xs text-muted-foreground">Gửi nhắc nhở qua Zalo & Email sau 3 ngày trễ hạn.</div>
              </div>
            </div>
            <button
              onClick={() => setAutoReminder((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoReminder ? "bg-primary" : "bg-input"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${
                  autoReminder ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
