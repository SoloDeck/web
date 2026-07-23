import { Check, FileText, Sparkles } from "lucide-react";

import type { TermTemplateOption } from "@/services/proposalsService";
import { cn } from "@/lib/utils";

/**
 * Bộ chọn cơ sở soạn tài liệu: "AI tự viết" (không mẫu) + các mẫu điều khoản admin.
 *
 * Thuần hiển thị — danh sách mẫu do nơi gọi truyền vào (qua useTermTemplates). `value` là
 * id mẫu đang chọn, hoặc `null` = "AI tự viết".
 */
export function DocTemplateChooser({
  templates,
  value,
  onChange,
  docLabel,
}: {
  templates: TermTemplateOption[];
  value: string | null;
  onChange: (templateId: string | null) => void;
  /** "báo giá" hoặc "hợp đồng" — để mô tả cho đúng ngữ cảnh. */
  docLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Chọn điều khoản áp cho {docLabel} này. AI vẫn viết phần nội dung; điều khoản của mẫu
        được chèn nguyên văn (bạn sửa lại được sau khi tạo).
      </p>

      <div className="space-y-2">
        <Option
          icon={Sparkles}
          title="AI tự viết"
          subtitle="Không dùng mẫu điều khoản có sẵn"
          selected={value === null}
          onClick={() => onChange(null)}
        />
        {templates.map((template) => (
          <Option
            key={template.id}
            icon={FileText}
            title={template.name}
            subtitle="Mẫu điều khoản do quản trị viên soạn"
            selected={value === template.id}
            onClick={() => onChange(template.id)}
          />
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có mẫu điều khoản nào cho nghề của bạn — AI sẽ tự viết. Quản trị viên có thể
          thêm mẫu vào thư viện.
        </p>
      )}
    </div>
  );
}

function Option({
  icon: Icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}
