import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Paperclip, Plus, Save, Search, Trash2, User, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getClients, createClient, type ClientRecord } from "@/services/clientsService";
import { createDeal, updateDeal, type DealPayload } from "@/services/dealsService";
import { uploadDealAttachment } from "@/services/dealAttachmentsService";
import { dealAttachmentKeys } from "@/features/deals/hooks/useDealAttachments";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { dealKeys } from "@/features/deals/hooks/useDeals";
import { DEAL_SOURCE_LABELS, type Deal } from "@/features/deals/types";

/**
 * Bóc câu thông báo lỗi THẬT mà backend gửi về.
 *
 * Backend gói lỗi thành `{ success, code, error: { message, code } }` (xem
 * `src/shared/responses/response.py`) — KHÔNG có trường `detail`. Chỗ này trước đây đọc
 * `response.data.detail`, luôn ra `undefined`, nên mọi lỗi đều rơi về một câu chung
 * chung. Đó là lý do sự cố staging (409 "Object storage chưa được cấu hình") không để
 * lại dấu vết nào trên giao diện.
 *
 * Vẫn đọc `message`/`detail` làm phương án dự phòng: 422 của FastAPI và vài endpoint cũ
 * còn trả kiểu khác.  #Huynh
 */
function apiErrorMessage(err: unknown): string {
  const data = (
    err as {
      response?: { data?: { error?: { message?: string }; message?: string; detail?: string } };
    }
  )?.response?.data;
  return data?.error?.message ?? data?.message ?? data?.detail ?? "";
}

const SOURCE_OPTIONS = [
  { value: "inbound", label: DEAL_SOURCE_LABELS.inbound },
  { value: "referral", label: DEAL_SOURCE_LABELS.referral },
  { value: "outreach", label: DEAL_SOURCE_LABELS.outreach },
  { value: "platform", label: DEAL_SOURCE_LABELS.platform },
  { value: "other", label: DEAL_SOURCE_LABELS.other },
] as const;

type Form = {
  client_name: string;
  client_phone: string;
  client_email: string;
  client_notes: string;
  title: string;
  estimated_value: string;
  source: string;
  notes: string;
};

const INITIAL: Form = {
  client_name: "",
  client_phone: "",
  client_email: "",
  client_notes: "",
  title: "",
  estimated_value: "",
  source: "",
  notes: "",
};

function formReducer(state: Form, patch: Partial<Form>): Form {
  return { ...state, ...patch };
}

function normalizeMoneyInput(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function formatMoneyInput(value: string): string {
  if (!value) return "";
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function caretPositionFromDigitCount(formattedValue: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seenDigits = 0;
  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) {
      seenDigits += 1;
      if (seenDigits === digitCount) return index + 1;
    }
  }
  return formattedValue.length;
}

export function NewDealModal({
  open,
  onClose,
  deal,
}: {
  open: boolean;
  onClose: () => void;
  deal?: Deal | null;
}) {
  const isEditing = Boolean(deal);
  const addDeal = useDealStore((s) => s.addDeal);
  const updateStoredDeal = useDealStore((s) => s.updateDeal);
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<ClientRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const estimatedValueRef = useRef<HTMLInputElement>(null);

  const contactLocked = !!selectedClient || isEditing;
  const canSubmit = form.client_name.trim() && form.title.trim();

  useEffect(() => {
    if (!open) return;
    if (deal) {
      dispatch({
        client_name: deal.client,
        client_phone: deal.clientPhone ?? "",
        client_email: deal.clientEmail ?? "",
        client_notes: "",
        title: deal.projectType,
        estimated_value: deal.value ? String(deal.value) : "",
        source: deal.source ?? "",
        notes: deal.notes ?? "",
      });
      setSelectedClient(null);
      return;
    }
    dispatch(INITIAL);
    setSelectedClient(null);
  }, [deal, open]);

  const set = (field: keyof Form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      dispatch({ [field]: event.target.value });

  const setEstimatedValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, "").length;
    const rawValue = normalizeMoneyInput(input.value);

    dispatch({ estimated_value: rawValue });

    // Format tiền làm React re-render value, nên cần đặt lại caret theo số chữ số đã gõ.
    window.requestAnimationFrame(() => {
      const node = estimatedValueRef.current;
      if (!node || document.activeElement !== node) return;
      const nextCaret = caretPositionFromDigitCount(
        formatMoneyInput(rawValue),
        Math.min(digitsBeforeCaret, rawValue.length)
      );
      node.setSelectionRange(nextCaret, nextCaret);
    });
  };

  useEffect(() => {
    const name = form.client_name.trim();
    if (!open || isEditing || selectedClient) return;
    if (name.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const matched = (await getClients({ name })).slice(0, 6);
        setSuggestions(matched);
        setShowDropdown(matched.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.client_name, isEditing, open, selectedClient]);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const modalCopy = useMemo(
    () => ({
      title: isEditing ? "Sửa yêu cầu" : "Thêm yêu cầu mới",
      description: isEditing
        ? "Cập nhật thông tin deal trước khi chuyển sang triển khai."
        : "Tạo khách hàng nếu chưa có, sau đó tạo yêu cầu mới ở cột Deal Mới.",
      submit: isEditing ? "Lưu thay đổi" : selectedClient ? "Tạo yêu cầu" : "Tạo khách hàng & yêu cầu",
    }),
    [isEditing, selectedClient]
  );

  const selectExistingClient = (client: ClientRecord) => {
    setSelectedClient(client);
    dispatch({
      client_name: client.name,
      client_phone: client.phone ?? "",
      client_email: client.email ?? "",
      client_notes: client.notes ?? "",
    });
    setShowDropdown(false);
    setSuggestions([]);
  };

  const clearSelectedClient = () => {
    setSelectedClient(null);
    dispatch({ client_name: "", client_phone: "", client_email: "", client_notes: "" });
  };

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter(
      (f) => !attachments.some((a) => a.name === f.name && a.size === f.size),
    );
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (submitting) return;
    dispatch(INITIAL);
    setSelectedClient(null);
    setSuggestions([]);
    setShowDropdown(false);
    setAttachments([]);
    onClose();
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      toast.error("Vui lòng nhập đủ tên khách hàng và tên yêu cầu.");
      return;
    }

    setSubmitting(true);
    try {
      if (deal) {
        const payload: DealPayload = {
          client_id: deal.clientId,
          title: form.title.trim(),
          stage: deal.stage,
          estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
          notes: form.notes.trim() || undefined,
          source: form.source || undefined,
        };
        const updated = await updateDeal(deal.id, payload);
        updateStoredDeal({ ...updated, client: deal.client, clientEmail: deal.clientEmail, clientPhone: deal.clientPhone });
        toast.success("Đã cập nhật yêu cầu.");
      } else {
        let client = selectedClient;
        if (!client) {
          client = await createClient({
            name: form.client_name.trim(),
            phone: form.client_phone.trim() || undefined,
            email: form.client_email.trim() || undefined,
            notes: form.client_notes.trim() || undefined,
          });
        }

        const created = await createDeal(
          {
            client_id: client.id,
            title: form.title.trim(),
            source: form.source || undefined,
            estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
            notes: form.notes.trim() || undefined,
          },
          client
        );
        addDeal(created);

        // Upload file SAU khi tạo deal, vì endpoint là POST /deals/{id}/attachments —
        // phải có deal.id trước. Trước đây khối này KHÔNG tồn tại: ô kéo-thả gom file vào
        // state, vẽ danh sách ra cho đẹp, rồi vứt đi. Không request nào rời khỏi trình
        // duyệt, nên AI chẳng có PDF nào mà đọc.
        //
        // Upload lỗi thì KHÔNG rollback deal: deal đã tạo là thật, mất file thì báo cho
        // người dùng đính kèm lại ở tab Tài liệu, chứ xoá deal của họ đi thì tệ hơn.  #Huynh
        if (attachments.length > 0) {
          const failed: string[] = [];
          // Giữ lý do THẬT của lần hỏng đầu tiên. Trước đây chỗ này là `catch {}` trần —
          // nuốt sạch. Trên staging, backend trả 409 "Object storage chưa được cấu hình"
          // suốt nhiều tuần mà người dùng chỉ thấy một câu chung chung, nên không ai lần
          // ra được nguyên nhân.  #Huynh
          let reason = "";
          for (const file of attachments) {
            try {
              await uploadDealAttachment(created.id, file);
            } catch (uploadErr: unknown) {
              failed.push(file.name);
              reason = reason || apiErrorMessage(uploadErr);
            }
          }
          queryClient.invalidateQueries({ queryKey: dealAttachmentKeys.forDeal(created.id) });

          if (failed.length > 0) {
            toast.error(
              `Đã tạo yêu cầu nhưng không tải lên được: ${failed.join(", ")}.` +
                (reason ? ` ${reason}` : "") +
                " Hãy đính kèm lại ở tab Tài liệu."
            );
            // KHÔNG bắn toast xanh nữa. Trước đây "Đã tạo yêu cầu" hiện ngay sau toast đỏ
            // và đè lên nó, nên người dùng tưởng mọi thứ ổn — deal thì có mà file thì
            // không, mãi tới lúc mở Detail thấy trống mới biết.  #Huynh
            queryClient.invalidateQueries({ queryKey: dealKeys.all });
            handleClose();
            return;
          }
        }

        toast.success(`Đã tạo yêu cầu "${created.projectType}" cho ${created.client}.`);
      }

      queryClient.invalidateQueries({ queryKey: dealKeys.all });
      handleClose();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err) || "Không thể lưu yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl" showCloseButton>
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
            {modalCopy.title}
          </DialogTitle>
          <DialogDescription>{modalCopy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          <section>
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Thông tin khách hàng
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tên khách hàng <span className="text-destructive">*</span>
                </label>
                <div ref={wrapperRef} className="relative">
                  <div className="relative">
                    <input
                      value={form.client_name}
                      onChange={(event) => {
                        if (selectedClient && event.target.value !== selectedClient.name) {
                          clearSelectedClient();
                        }
                        dispatch({ client_name: event.target.value });
                      }}
                      disabled={isEditing}
                      onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                      placeholder="VD: Nguyễn Văn A / Công ty XYZ"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {!searching && !selectedClient && !isEditing && (
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {selectedClient && (
                        <button type="button" onClick={clearSelectedClient} className="text-muted-foreground hover:text-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                      {suggestions.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectExistingClient(client);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                        >
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {client.name.trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{client.name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {[client.phone, client.email].filter(Boolean).join(" · ") || "Chưa có liên hệ"}
                            </div>
                          </div>
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Số điện thoại</label>
                  <input
                    value={form.client_phone}
                    onChange={set("client_phone")}
                    disabled={contactLocked}
                    placeholder="0912 345 678"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={form.client_email}
                    onChange={set("client_email")}
                    disabled={contactLocked}
                    placeholder="client@gmail.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ghi chú khách hàng</label>
                <textarea
                  value={form.client_notes}
                  onChange={set("client_notes")}
                  disabled={contactLocked}
                  rows={3}
                  placeholder="Thông tin thêm về khách hàng, cách xưng hô, lưu ý khi liên hệ..."
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-dashed border-border pt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Thông tin yêu cầu
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Tên yêu cầu <span className="text-destructive">*</span>
              </label>
              <input
                value={form.title}
                onChange={set("title")}
                placeholder="VD: Thiết kế website bán hàng..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Giá trị ước tính</label>
                <div className="relative">
                  <input
                    ref={estimatedValueRef}
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(form.estimated_value)}
                    onChange={setEstimatedValue}
                    placeholder="15.000.000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    VNĐ
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nguồn</label>
                <select
                  value={form.source}
                  onChange={set("source")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Chọn nguồn —</option>
                  {SOURCE_OPTIONS.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nội dung yêu cầu</label>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={4}
                placeholder="Mô tả yêu cầu, phạm vi, điều kiện bàn giao..."
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Tài liệu đính kèm
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">(PDF, Word, Excel, hình ảnh)</span>
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <Paperclip className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Kéo thả file vào đây hoặc bấm để chọn</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Tối đa 10MB mỗi file</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              />

              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}`}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <FileText className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {file.size < 1024 * 1024
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="flex gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? "Đang lưu..." : modalCopy.submit}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
