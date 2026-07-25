import { Clock, Eye, FileText, Loader2, Sparkles } from "lucide-react";

import { useAiJobsForEntity } from "@/features/ai/hooks/useAIJobs";
import { useDealQualifications } from "@/features/deals/hooks/useDealQualifications";
import { getAiJobErrorMessage, isTerminal, type AiJob } from "@/services/aiJobsService";
import type { DealQualification } from "@/services/dealsService";
import { cn } from "@/lib/utils";

export type HistoryEntry = {
  id?: string;
  date: string;
  text: string;
  channel?: string;
};

type TimelineItem = {
  key: string;
  date: string;
  text: string;
  channel?: string;
  /** Job CHƯA xong / thất bại — chỉ để báo trạng thái. */
  job?: AiJob;
  /** Bản chấm ĐÃ xong, đọc từ bảng lịch sử của server — mở ra xem được căn cứ. */
  qualification?: DealQualification;
  /** Một bản báo giá — mở ra xem nội dung đã gửi/đã soạn. */
  proposalId?: string;
};

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: "bản nháp",
  sent: "đã gửi khách",
  accepted: "khách chấp nhận",
  rejected: "khách từ chối",
  superseded: "đã thay bằng bản mới",
};

/**
 * Một dòng thời gian DUY NHẤT cho deal: các lần AI chấm điểm (lấy từ backend) và
 * các hoạt động khác (soạn báo giá, tải PDF, gửi khách...) trộn chung, xếp theo
 * thời gian.
 *
 * Trước đây tôi để hai danh sách tách rời — "Đánh giá AI" ở trên, "Hoạt động" ở
 * dưới — nên người dùng phải nhìn hai chỗ mới dựng lại được câu chuyện của deal,
 * mà hai chỗ lại còn kể trùng nhau.
 */
export function DealActivityTimeline({
  dealId,
  historyItems,
  proposals,
  onViewQualification,
  onViewProposal,
}: {
  dealId: string | undefined;
  historyItems: HistoryEntry[];
  proposals: { id: string; version_number: number; status: string; created_at: string }[];
  onViewQualification: (qualification: DealQualification) => void;
  onViewProposal: (proposalId: string) => void;
}) {
  const { data: jobs, isLoading } = useAiJobsForEntity("deal", dealId, "lead_qualifier");
  const { data: qualifications } = useDealQualifications(dealId);

  // Các lần chấm ĐÃ XONG lấy từ bảng lịch sử của server (`lead_scores`) — nguồn BỀN, và là
  // nơi duy nhất có bảng căn cứ chấm điểm. `ai_jobs` chỉ là hàng đợi tác vụ: nó có thể bị
  // dọn, và không giữ căn cứ.  #Huynh
  const qualItems: TimelineItem[] = (qualifications ?? []).map((q) => ({
    key: q.id,
    date: q.generated_at,
    text: `AI đã chấm điểm: ${q.score}/100 — ${q.level.toUpperCase()}`,
    qualification: q,
  }));

  // Các bản báo giá — kể ở ĐÂY, không phải tab "Tài liệu". Tab đó để dành cho thứ ĐANG
  // trao đổi với khách; còn "lần 1, lần 2, lần 3..." là chuyện đã qua.  #Huynh
  const proposalItems: TimelineItem[] = proposals.map((p) => ({
    key: `proposal-${p.id}`,
    date: p.created_at,
    text: `Báo giá lần ${p.version_number} — ${PROPOSAL_STATUS_LABEL[p.status] ?? p.status}`,
    proposalId: p.id,
  }));

  // Job đã xong thì bản chấm ở trên đã kể rồi — giữ lại là kể trùng. Chỉ lấy job CHƯA xong
  // hoặc THẤT BẠI, vì hai trạng thái đó không sinh ra bản chấm nào.
  const jobItems: TimelineItem[] = (jobs ?? [])
    .filter((job) => job.status !== "succeeded")
    .map((job) => ({
      key: job.id,
      date: job.created_at,
      text: aiJobText(job),
      job,
    }));

  const historyEntries: TimelineItem[] = historyItems
    // Bỏ mấy dòng "AI đánh giá deal: 50/100" cũ còn sót trong localStorage: giờ các
    // lần chấm điểm đã lấy thẳng từ backend, giữ lại là kể trùng.
    .filter((item) => !item.text.startsWith("AI đánh giá deal:"))
    .map((item, index) => ({
      key: item.id ?? `history-${index}`,
      date: item.date,
      text: item.text,
      channel: item.channel,
    }));

  const items = [...qualItems, ...proposalItems, ...jobItems, ...historyEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải hoạt động...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Hoạt động ({items.length})
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có hoạt động nào trên deal này.
        </div>
      ) : (
        // KHÔNG tự cuộn ở đây: tab "Lịch sử" bọc component này đã là khung cuộn
        // (overflow-y-auto). Thêm max-h + overflow ở đây nữa là sinh ra HAI thanh cuộn lồng
        // nhau. Chừa pl-2 để chấm tròn nhô ra bên trái <ol> không bị xén.
        <div className="pl-2 pr-2">
          <ol className="space-y-4 border-l-2 border-border pl-4">
            {items.map((item) => (
              <li key={item.key} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card",
                    item.job ? "bg-primary" : "bg-muted-foreground/50"
                  )}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {(item.job || item.qualification) && (
                        <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      {item.proposalId && <FileText className="h-3 w-3 shrink-0 text-primary" />}
                      {formatWhen(item.date)}
                      {item.channel && !item.job && <span>· {item.channel}</span>}
                    </div>
                    <div className="mt-1 text-sm">{item.text}</div>
                  </div>

                  {/* Mở lại bản chấm — đọc từ bảng lịch sử nên xem được cả căn cứ, và còn
                      xem được kể cả khi job đã bị dọn. */}
                  {item.proposalId && (
                    <button
                      type="button"
                      onClick={() => onViewProposal(item.proposalId!)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      Xem
                    </button>
                  )}

                  {item.qualification && (
                    <button
                      type="button"
                      onClick={() => onViewQualification(item.qualification!)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      Xem
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function aiJobText(job: AiJob): string {
  if (!isTerminal(job.status)) return "AI đang chấm điểm deal...";

  if (job.status === "succeeded") {
    const score = job.result?.ai_qualification_score as number | undefined;
    return score != null ? `AI đã chấm điểm deal: ${score}/100.` : "AI đã chấm điểm xong deal.";
  }
  if (job.status === "cancelled") return "Đã hủy lần chấm điểm AI.";

  return `AI chấm điểm deal thất bại. ${getAiJobErrorMessage(job) ?? ""}`.trim();
}

function formatWhen(value: string): string {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
