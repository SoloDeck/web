import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CheckCircle2, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Deal } from "@/features/deals/types";
import { useCreateContract, useGenerateContractContent, useSendContract } from "@/features/deals/hooks/useContracts";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { getContractPreview } from "@/services/contractsService";
import { useContractInlineEditor } from "@/features/deals/hooks/useContractInlineEditor";
import type { ContractContentDTO, ContractResponse } from "@/services/contractsService";

function SectionRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{value}</p>
    </div>
  );
}

function renderContent(c: ContractContentDTO) {
  const rows: Array<{ label: string; value?: string | null }> = [
    { label: "Phạm vi công việc", value: c.scope_of_work },
    { label: "Điều khoản thanh toán", value: c.payment_terms },
    { label: "Chính sách chỉnh sửa", value: c.revision_policy },
    { label: "Sở hữu trí tuệ", value: c.ip_ownership },
    { label: "Điều khoản chấm dứt", value: c.termination_clause },
    { label: "Luật áp dụng", value: c.governing_law },
    { label: "Điều khoản bổ sung", value: c.custom_clauses },
  ];
  const hasContent = rows.some((r) => r.value);

  return (
    <div className="space-y-5">
      {c.parties && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bên cung cấp</div>
            <div className="font-medium">{c.parties.freelancer?.name ?? "Freelancer"}</div>
            {c.parties.freelancer?.email && <div className="text-xs text-muted-foreground">{c.parties.freelancer.email}</div>}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khách hàng</div>
            <div className="font-medium">{c.parties.client?.name ?? "Khách hàng"}</div>
            {c.parties.client?.email && <div className="text-xs text-muted-foreground">{c.parties.client.email}</div>}
          </div>
        </div>
      )}
      {hasContent ? (
        rows.map((r) => <SectionRow key={r.label} label={r.label} value={r.value} />)
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nội dung hợp đồng trống. Thử tạo lại.
        </div>
      )}
    </div>
  );
}

export function ContractModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const createContract = useCreateContract();
  const generateContract = useGenerateContractContent();
  const sendContract = useSendContract();

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const didGenerate = useRef(false);

  // Bản nháp vừa gen: cho sửa NGAY trong tờ giấy (bấm vào điều khoản gõ, tự lưu). Mỗi ngành
  // nghề / mỗi deal có điều khoản đặc thù nên phải cho chỉnh cho khớp.  #Huynh
  const editable = contract?.status === "draft";

  // Bản server render — CHÍNH XÁC tờ hợp đồng khách sẽ nhận. Xem ngay sau khi gen phải
  // trùng khít với lúc mở lại ở "Tài liệu → Xem nội dung" (cùng getContractPreview → iframe),
  // nếu không thì lại rơi vào cảnh hai màn hiện hai thứ khác nhau, nhìn như scam.  #Huynh
  const previewQuery = useQuery({
    queryKey: ["contract-preview", contract?.id ?? "", editable],
    queryFn: () => getContractPreview(contract!.id, editable),
    enabled: !!contract?.id && !isGenerating,
  });

  const { iframeRef } = useContractInlineEditor(contract ?? undefined, previewQuery.data);

  useEffect(() => {
    if (!deal || didGenerate.current) return;
    didGenerate.current = true;
    setIsGenerating(true);

    createContract.mutate(
      {
        deal_id: deal.id,
        client_id: deal.clientId,
        content: {},
      },
      {
        onSuccess: (draft) => {
          generateContract.mutate({ contractId: draft.id, templateId: null }, {
            onSuccess: (generated) => {
              setContract(generated);
              setIsGenerating(false);
              addDealHistoryEntry(deal.id, {
                date: new Date().toISOString(),
                text: "Hợp đồng AI đã được tạo và điền nội dung.",
                channel: "message",
              });
            },
            onError: () => {
              toast.error("Không thể tạo nội dung hợp đồng. Vui lòng thử lại.");
              setIsGenerating(false);
              onClose();
            },
          });
        },
        onError: () => {
          toast.error("Không thể tạo hợp đồng. Vui lòng thử lại.");
          setIsGenerating(false);
          onClose();
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

  function handleSend() {
    if (!contract) return;
    sendContract.mutate(contract.id, {
      onSuccess: () => {
        toast.success("Đã gửi hợp đồng cho khách ký.");
        if (deal) addDealHistoryEntry(deal.id, { date: new Date().toISOString(), text: "Đã gửi hợp đồng cho khách ký.", channel: "email" });
        onClose();
      },
      onError: () => toast.error("Gửi hợp đồng thất bại. Vui lòng thử lại."),
    });
  }

  if (!deal) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
          previewQuery.data && !isGenerating ? "max-w-4xl h-[85vh]" : "max-w-2xl max-h-[90vh]"
        }`}
      >

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Bot className="h-3.5 w-3.5" /> Hợp Đồng AI
            </span>
            <span className="text-sm font-semibold text-muted-foreground">· {deal.client}</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
          {isGenerating ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="relative">
                <Sparkles className="h-10 w-10 text-primary/30" />
                <Loader2 className="absolute inset-0 h-10 w-10 animate-spin text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI đang soạn hợp đồng...</p>
                <p className="mt-1 text-xs text-muted-foreground">AI đang điền đầy đủ các điều khoản dựa trên thông tin dự án.</p>
              </div>
            </div>
          ) : previewQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang dựng bản xem trước...
            </div>
          ) : previewQuery.data ? (
            <iframe
              ref={iframeRef}
              title="Nội dung hợp đồng"
              srcDoc={previewQuery.data}
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : contract?.content ? (
            <div className="min-h-0 flex-1 overflow-y-auto">{renderContent(contract.content)}</div>
          ) : null}
        </div>

        {/* Footer */}
        {!isGenerating && contract && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            {contract.status === "draft" ? (
              <>
                {editable && previewQuery.data && (
                  <p className="mb-3 text-center text-xs text-muted-foreground">
                    Bấm thẳng vào điều khoản để sửa cho khớp dự án · nội dung tự lưu
                  </p>
                )}
                <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  Lưu lại
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendContract.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendContract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendContract.isPending ? "Đang gửi..." : "Gửi cho khách ký"}
                </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Đã gửi cho khách ký
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
