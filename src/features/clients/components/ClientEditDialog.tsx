import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateClient } from "@/features/clients/hooks/useClients";
import type {
  ClientRecord,
  ClientPayload,
  ClientStatus,
  ClientType,
} from "@/services/clientsService";

const TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "individual", label: "Cá nhân" },
  { value: "company", label: "Công ty" },
];

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "prospect", label: "Tiềm năng" },
  { value: "active", label: "Đang hợp tác" },
  { value: "inactive", label: "Ngưng hợp tác" },
  { value: "archived", label: "Lưu trữ" },
];

const TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((opt) => [opt.value, opt.label])
);

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((opt) => [opt.value, opt.label])
);

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65";

type FormState = {
  name: string;
  type: ClientType;
  status: ClientStatus;
  email: string;
  phone: string;
  website: string;
  linkedin_url: string;
  address_city: string;
  address_country: string;
  notes: string;
  description: string;
};

function toForm(client: ClientRecord): FormState {
  return {
    name: client.name ?? "",
    type: client.type,
    status: client.status,
    email: client.email ?? "",
    phone: client.phone ?? "",
    website: client.website ?? "",
    linkedin_url: client.linkedin_url ?? "",
    address_city: client.address_city ?? "",
    address_country: client.address_country ?? "",
    notes: client.notes ?? "",
    description: client.description ?? "",
  };
}

/** Chuyển FormState sang payload gửi PATCH: string rỗng → null để backend xoá giá trị cũ. */
function toPayload(form: FormState): ClientPayload {
  const orNull = (value: string) => (value.trim() ? value.trim() : null);
  return {
    name: form.name.trim(),
    type: form.type,
    status: form.status,
    email: orNull(form.email),
    phone: orNull(form.phone),
    website: orNull(form.website),
    linkedin_url: orNull(form.linkedin_url),
    address_city: orNull(form.address_city),
    address_country: orNull(form.address_country),
    notes: orNull(form.notes),
    description: orNull(form.description),
  };
}

export function ClientEditDialog({
  client,
  open,
  onClose,
}: {
  client: ClientRecord;
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(client));
  const [wasOpen, setWasOpen] = useState(open);
  const { mutate: updateClient, isPending } = useUpdateClient();

  // Nạp lại form từ dữ liệu mới nhất mỗi khi dialog chuyển từ đóng sang mở
  // (điều chỉnh state ngay khi render — tránh setState trong useEffect).
  if (open && !wasOpen) {
    setWasOpen(true);
    setForm(toForm(client));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    updateClient(
      { id: client.id, payload: toPayload(form) },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin khách hàng</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin liên hệ và ghi chú của khách hàng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Tên khách hàng <span className="text-destructive">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Nguyễn Văn A / Công ty ABC"
              className={INPUT_CLASS}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Loại khách hàng</label>
              <Select
                items={TYPE_ITEMS}
                value={form.type}
                onValueChange={(v) => v && patch({ type: v })}
              >
                <SelectTrigger className={INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Trạng thái</label>
              <Select
                items={STATUS_ITEMS}
                value={form.status}
                onValueChange={(v) => v && patch({ status: v })}
              >
                <SelectTrigger className={INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="email@example.com"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="09xx xxx xxx"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Website</label>
              <input
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">LinkedIn</label>
              <input
                value={form.linkedin_url}
                onChange={(e) => patch({ linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Thành phố</label>
              <input
                value={form.address_city}
                onChange={(e) => patch({ address_city: e.target.value })}
                placeholder="TP. HCM"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Quốc gia</label>
              <input
                value={form.address_country}
                onChange={(e) => patch({ address_country: e.target.value })}
                placeholder="Việt Nam"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Ghi chú khách hàng</label>
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
              placeholder="Ghi chú nội bộ về khách hàng..."
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
              placeholder="Mô tả ngắn về khách hàng, lĩnh vực hoạt động..."
              className={INPUT_CLASS}
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu thay đổi
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
