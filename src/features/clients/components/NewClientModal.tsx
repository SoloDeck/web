import { useReducer, useState } from "react";
import { X, Plus, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient, type ClientRecord } from "@/services/clientsService";

type Form = { name: string; phone: string; email: string };
const INITIAL: Form = { name: "", phone: "", email: "" };

function formReducer(state: Form, patch: Partial<Form>): Form {
  return { ...state, ...patch };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: ClientRecord) => void;
};

export function NewClientModal({ open, onClose, onCreated }: Props) {
  const [form, dispatch] = useReducer(formReducer, INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ [field]: e.target.value });

  const handleClose = () => {
    dispatch(INITIAL);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Vui lòng nhập tên khách hàng."); return; }

    setSubmitting(true);
    try {
      const client = await createClient({
        name:  form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      toast.success(`Đã thêm khách hàng "${client.name}"!`);
      onCreated?.(client);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Không thể tạo khách hàng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">Thêm khách hàng mới</div>
              <div className="text-xs text-muted-foreground">Tạo hồ sơ khách hàng</div>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Tên khách hàng <span className="text-destructive">*</span>
            </label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="VD: Nguyễn Văn A / Công ty XYZ"
              maxLength={255}
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={set("phone")}
                placeholder="0912 345 678"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="example@gmail.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

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
              {submitting ? "Đang tạo..." : "Tạo khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
