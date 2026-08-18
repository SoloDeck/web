import { Check, FileText, SquareDashed } from "lucide-react";

import type { TermTemplateOption } from "@/services/proposalsService";
import { cn } from "@/lib/utils";

/**
 * Bộ chọn mẫu — MỘT danh sách, hai cách dùng.
 *
 * Bản trước có nút gạt hai chế độ ở đầu, mỗi chế độ một danh sách. Nhưng cả hai liệt kê ĐÚNG
 * CÙNG một thư viện mẫu, nên nhìn ra là hai bản sao của nhau — người dùng đọc xong hỏi "sao
 * bên kia cũng có mấy cái này?".
 *
 * Cùng một mẫu phục vụ hai đường: nhờ AI thì AI đọc yêu cầu khách rồi viết phần thân, điều
 * khoản của mẫu chèn nguyên văn; tự soạn thì dùng thẳng phần mẫu đã có, freelancer điền nốt.
 * Đó là KHÁC BIỆT VỀ HÀNH ĐỘNG, không phải khác biệt về danh sách — nên nó thuộc về hai cái
 * NÚT ở dưới, không phải hai cái tab ở trên.  #Huynh
 */

/** Mẫu này mang lại gì — nói cả hai vế, vì hai vế tốn công khác hẳn nhau. */
function templateSubtitle(template: TermTemplateOption): string {
  const than = template.skeleton_blocks ?? [];
  const dieuKhoan = template.blocks ?? [];
  const phan: string[] = [];

  // PHẦN THÂN là phần gõ lâu nhất, nên nói trước.
  if (than.length > 0) phan.push(`Phần thân: ${than.join(" · ")}`);
  if (dieuKhoan.length > 0) phan.push(`Điều khoản: ${dieuKhoan.join(" · ")}`);
  if (phan.length === 0) return "Mẫu chưa có nội dung";
  if (than.length === 0) {
    // Mẫu chỉ có điều khoản: dòng còn ngắn, kèm luôn trích đoạn để phân biệt hai mẫu điền
    // cùng một khối — không có nó thì chúng nhìn y hệt nhau, đúng lỗi đã sửa đợt trước.
    const trich = template.preview ? ` — "${template.preview}"` : "";
    return `${phan[0]}${trich} — phần thân bạn tự điền`;
  }
  return phan.join(" — ");
}

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
        Chọn mẫu làm nền cho {docLabel} này, rồi chọn cách soạn ở dưới.
      </p>

      <div className="space-y-2">
        <Option
          icon={SquareDashed}
          title="Không dùng mẫu"
          subtitle="Tờ giấy trống — AI tự viết, hoặc bạn tự điền tất cả"
          selected={value === null}
          onClick={() => onChange(null)}
        />
        {templates.map((template) => (
          <Option
            key={template.id}
            icon={FileText}
            title={template.name}
            subtitle={templateSubtitle(template)}
            selected={value === template.id}
            onClick={() => onChange(template.id)}
          />
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có mẫu nào cho nghề của bạn — vẫn soạn được từ tờ giấy trống. Quản trị viên có
          thể thêm mẫu vào thư viện.
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
