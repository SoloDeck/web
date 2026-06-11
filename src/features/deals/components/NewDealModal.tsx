import { useEffect, useReducer, useRef, useState } from "react";
import { X, Plus, Loader2, User, Briefcase, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getClients, createClient, type ClientRecord } from "@/services/clientsService";
import { createDeal } from "@/services/dealsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";

const SOURCE_OPTIONS = [
  { value: "inbound",  label: "Khách tự liên hệ" },
  { value: "referral", label: "Giới thiệu" },
  { value: "outreach", label: "Tôi chủ động tìm" },
  { value: "platform", label: "Sàn / Nền tảng" },
  { value: "other",    label: "Khác" },
] as const;

type Form = {
  client_name: string;
  client_phone: string;
  client_email: string;
  title: string;
  estimated_value: string;
  source: string;
  notes: string;
};

const INITIAL: Form = {
  client_name: "", client_phone: "", client_email: "",
  title: "", estimated_value: "", source: "", notes: "",
};

function formReducer(state: Form, patch: Partial<Form>): Form {
  return { ...state, ...patch };
}

export function NewDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addDeal = useDealStore((s) => s.addDeal);
  const [form, dispatch] = useReducer(formReducer, INITIAL);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<ClientRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      dispatch({ [field]: e.target.value });

  // Search suggestions when typing client name
  useEffect(() => {
    const name = form.client_name.trim();

    // Already selected a client — don't search again until user clears
    if (selectedClient) return;

    if (name.length < 1) { setSuggestions([]); setShowDropdown(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const all = await getClients();
        const matched = all.filter((c) =>
          c.name.toLowerCase().includes(name.toLowerCase())
        );
        setSuggestions(matched.slice(0, 6));
        setShowDropdown(matched.length > 0);
      } catch {
        // silently ignore search errors
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.client_name, selectedClient]);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const selectExistingClient = (c: ClientRecord) => {
    setSelectedClient(c);
    dispatch({
      client_name:  c.name,
      client_phone: c.contact_info?.phone ?? "",
      client_email: c.email ?? "",
    });
    setShowDropdown(false);
    setSuggestions([]);
  };

  const clearSelectedClient = () => {
    setSelectedClient(null);
    dispatch({ client_name: "", client_phone: "", client_email: "" });
  };

  const handleClose = () => {
    dispatch(INITIAL);
    setSelectedClient(null);
    setSuggestions([]);
    setShowDropdown(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast.error("Vui lòng nhập tên khách hàng."); return; }
    if (!form.title.trim())       { toast.error("Vui lòng nhập tên dự án."); return; }

    setSubmitting(true);
    try {
      let clientId: string;
      let clientLabel: string;

      if (selectedClient) {
        // Existing client — reuse, skip POST /clients
        clientId = selectedClient.id;
        clientLabel = selectedClient.name;
      } else {
        // New client — create first
        const newClient = await createClient({
          name:  form.client_name.trim(),
          phone: form.client_phone.trim() || undefined,
          email: form.client_email.trim() || undefined,
        });
        clientId    = newClient.id;
        clientLabel = newClient.name;
      }

      const deal = await createDeal({
        client_id:       clientId,
        title:           form.title.trim(),
        source:          (form.source as "inbound" | "referral" | "outreach" | "platform" | "other") || undefined,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
        notes:           form.notes.trim() || undefined,
      });

      addDeal(deal);
      const action = selectedClient ? "Đã thêm dự án" : "Đã tạo khách hàng & dự án";
      toast.success(`${action} "${deal.projectType}" cho ${clientLabel}!`);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Không thể tạo. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const contactLocked = !!selectedClient;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">Thêm dự án mới</div>
              <div className="text-xs text-muted-foreground">
                {selectedClient ? "Khách hàng có sẵn · tạo dự án mới" : "Tạo khách hàng + dự án cùng lúc"}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ── Section 1: Khách hàng ── */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <User className="h-3 w-3" /> Thông tin khách hàng
            </div>
            <div className="space-y-3">
              {/* Client name with autocomplete */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Tên khách hàng <span className="text-destructive">*</span>
                </label>
                <div ref={wrapperRef} className="relative">
                  <div className="relative">
                    <input
                      value={form.client_name}
                      onChange={(e) => {
                        // If user edits name after selection → clear selected client
                        if (selectedClient && e.target.value !== selectedClient.name) {
                          clearSelectedClient();
                        }
                        dispatch({ client_name: e.target.value });
                      }}
                      onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                      placeholder="VD: Nguyễn Văn A / Công ty XYZ"
                      maxLength={255}
                      autoComplete="off"
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-8 ${
                        selectedClient
                          ? "border-success bg-success/5"
                          : "border-input bg-background"
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {selectedClient && (
                        <button type="button" onClick={clearSelectedClient} className="text-muted-foreground hover:text-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown suggestions */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/40">
                        Khách hàng có sẵn — chọn để dùng lại
                      </div>
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); selectExistingClient(c); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                        >
                          <div className={`h-7 w-7 rounded-full grid place-items-center shrink-0 text-xs font-bold text-white ${c.type === "company" ? "bg-violet-500" : "bg-primary"}`}>
                            {c.name.trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {[c.contact_info?.phone, c.email].filter(Boolean).join(" · ") || "Chưa có liên hệ"}
                            </div>
                          </div>
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected client banner */}
                {selectedClient && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Khách hàng có sẵn — sẽ không tạo mới
                  </div>
                )}
              </div>

              {/* Phone + Email — locked when existing client selected */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Số điện thoại
                    {contactLocked && <span className="text-[10px] text-muted-foreground ml-1">(từ hồ sơ)</span>}
                  </label>
                  <input
                    value={form.client_phone}
                    onChange={set("client_phone")}
                    disabled={contactLocked}
                    placeholder="0912 345 678"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Email
                    {contactLocked && <span className="text-[10px] text-muted-foreground ml-1">(từ hồ sơ)</span>}
                  </label>
                  <input
                    type="email"
                    value={form.client_email}
                    onChange={set("client_email")}
                    disabled={contactLocked}
                    placeholder="example@gmail.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-border" />

          {/* ── Section 2: Dự án ── */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Briefcase className="h-3 w-3" /> Thông tin dự án
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Tên dự án <span className="text-destructive">*</span></label>
                <input
                  value={form.title}
                  onChange={set("title")}
                  placeholder="VD: Thiết kế website bán hàng..."
                  maxLength={500}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Giá trị ước tính (VND)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.estimated_value}
                    onChange={set("estimated_value")}
                    placeholder="VD: 15000000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Nguồn</label>
                  <select
                    value={form.source}
                    onChange={set("source")}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Chọn nguồn —</option>
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  rows={3}
                  placeholder="Mô tả yêu cầu, điều kiện đặc biệt..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-border bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-medium hover:bg-secondary/70"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting
                ? "Đang tạo..."
                : selectedClient
                  ? "Tạo dự án"
                  : "Tạo khách hàng & dự án"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
