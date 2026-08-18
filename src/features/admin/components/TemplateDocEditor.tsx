import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Minus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { attachInlineEdit } from "@/features/deals/inlineEditPreview";
import { PROFESSIONS } from "@/features/profile/types";
import { previewAdminTemplate } from "@/services/adminService";
import type { AdminTemplate, AdminTemplateType } from "@/services/adminService";
import { cn } from "@/lib/utils";
import {
  MAX_EXTRA_SECTIONS,
  TEMPLATE_OUTLINE,
  contentBanDau,
  daSoanMuc,
  extraSections,
  ghiField as ghiFieldVao,
  ghiValidDays,
  nhanTrongDanBai,
  tenDauMucTrenGiay,
  themDauMuc,
  xoaDauMuc,
  truongTrenGiay,
  xoaChuMuc,
  HIDEABLE,
  batTatMuc,
  dangTat,
  lyDoKhoa,
} from "@/features/admin/templateContent";

/**
 * Màn soạn mẫu kiểu TÀI LIỆU: admin gõ thẳng lên tờ giấy thật, thấy ngay kết quả.
 *
 * Bản trước là một form toàn ô chữ, còn tờ báo giá/hợp đồng thì chỉ freelancer mới thấy —
 * nghĩa là người soạn ra nội dung gửi khách hàng chưa từng nhìn thấy nội dung đó nằm trên
 * giấy: không biết mục mình gõ rơi vào đâu, dài ngắn ra sao, hay có bị nuốt mất vì rỗng.
 *
 * Ba thứ làm nó chạy được mà gần như không phải viết mới:
 * - `POST /admin/templates/preview` render CÙNG một template Jinja với bản khách nhận và với
 *   PDF, nên cái admin thấy không thể lệch với cái khách đọc;
 * - `editable=true` khiến mọi mục hiện ra kể cả khi trống — không có nó thì mục rỗng biến mất
 *   và không có chỗ nào để bấm vào nhập;
 * - `attachInlineEdit` là đúng bộ máy freelancer đang dùng để sửa tại chỗ.
 *
 * CỐ Ý không nạp lại iframe khi gõ: chữ trên màn CHÍNH LÀ thứ vừa gõ, vẽ lại chỉ để ra đúng
 * chừng đó mà đổi lại là mất con trỏ và mất chỗ đang xem. Chỉ nạp lại khi đổi LOẠI tài liệu —
 * lúc đó cả bộ khung đổi.  #Huynh
 */

export type TemplateDocPayload = {
  name: string;
  template_type: AdminTemplateType;
  profession: string | null;
  content: Record<string, unknown>;
  is_active: boolean;
};

export function TemplateDocEditor({
  template,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  template?: AdminTemplate;
  isSubmitting: boolean;
  onSubmit: (payload: TemplateDocPayload) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [templateType, setTemplateType] = useState<AdminTemplateType>(
    template?.template_type ?? "proposal"
  );
  const [profession, setProfession] = useState(template?.profession ?? "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [content, setContent] = useState<Record<string, unknown>>(() => contentBanDau(template));
  const [html, setHtml] = useState("");

  const frameRef = useRef<HTMLIFrameElement>(null);
  // Nội dung mới nhất cho callback của iframe đọc — callback được gắn MỘT lần lúc iframe nạp
  // xong nên nó ôm mất giá trị của lần render đó; thiếu ref là gõ mục thứ hai làm mất mục đầu.
  const contentRef = useRef(content);
  // Đồng bộ trong effect chứ không gán thẳng khi render: React coi việc chạm `.current` lúc
  // render là lỗi, và effect này khai TRƯỚC effect dựng lại nên tới lượt kia ref đã mới.
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const preview = useMutation({
    mutationFn: (payload: { template_type: AdminTemplateType; content: Record<string, unknown> }) =>
      previewAdminTemplate(payload),
    onSuccess: setHtml,
    onError: () => toast.error("Không dựng được bản xem trước. Kiểm tra kết nối rồi thử lại."),
  });

  // Dựng lại tờ giấy khi MỞ và khi đổi LOẠI — không phải mỗi lần gõ.
  const dungLai = preview.mutate;
  useEffect(() => {
    dungLai({ template_type: templateType, content: contentRef.current });
  }, [templateType, dungLai]);

  const outline = TEMPLATE_OUTLINE[templateType];
  const daSoan = useMemo(
    () => new Set(outline.filter((m) => daSoanMuc(content, m)).map((m) => m.key)),
    [outline, content]
  );
  // Chỉ đếm ô do MẪU soạn: danh tính hai bên và bảng giá điền theo từng dự án, kể vào mẫu số
  // là cái đích không bao giờ tới được.
  const soThan = outline.filter((m) => m.nhom === "than" && m.noiDung === "o");
  const mucTuSoan = useMemo(() => extraSections(content), [content]);
  /** Đầu mục nào trên giấy chứa NHIỀU ô — những ô đó cần một dòng gộp phía trên. */
  const dungChung = useMemo(() => {
    const dem = new Map<string, number>();
    for (const m of outline) dem.set(m.titleKey, (dem.get(m.titleKey) ?? 0) + 1);
    return new Set([...dem].filter(([, n]) => n > 1).map(([k]) => k));
  }, [outline]);
  const thanDaSoan = soThan.filter((m) => daSoan.has(m.key)).length;

  function ghiField(field: string, value: string) {
    setContent((truoc) => ghiFieldVao(truoc, templateType, field, value));
  }

  /**
   * Thêm/xoá đầu mục là ĐỔI CẤU TRÚC tờ giấy, nên phải dựng lại iframe.
   *
   * Khác hẳn lúc gõ chữ: gõ thì chữ đã nằm sẵn trên màn, vẽ lại chỉ để ra đúng chừng đó mà đổi
   * lại là mất con trỏ. Còn thêm một mục thì mục đó chưa tồn tại trong DOM — không dựng lại là
   * bấm "Thêm đầu mục" xong không thấy gì.  #Huynh
   */
  function doiCauTruc(sau: Record<string, unknown>) {
    setContent(sau);
    dungLai({ template_type: templateType, content: sau });
  }

  function batSuaTaiCho() {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    attachInlineEdit(doc, ghiField, (label) =>
      toast.error(`${label}: ngày không hợp lệ. Nhập kiểu 24/07/2026.`)
    );
  }

  /** Bấm một mục ở dàn bài → cuộn tới đúng chỗ đó trên giấy và đặt con trỏ vào. */
  function nhayToi(field: string) {
    const doc = frameRef.current?.contentDocument;
    const node = doc?.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.focus();
  }

  const luuDuoc = name.trim().length > 0 && Object.keys(content).length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 gap-4">
        {/* ── DÀN BÀI + phần KHÔNG nằm trên giấy ─────────────────────────── */}
        <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto pr-1">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tên mẫu</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Khung thiết kế nhận diện"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Loại tài liệu</span>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as AdminTemplateType)}
              disabled={!!template}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="proposal">Báo giá</option>
              <option value="contract">Hợp đồng</option>
            </select>
            {template && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Không đổi được loại sau khi tạo.
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Áp dụng cho nghề</span>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Dùng chung cho mọi nghề</option>
              {PROFESSIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* Hạn hiệu lực là một CON SỐ ngày, còn trên giấy in ra một NGÀY cụ thể (phụ thuộc
            lúc freelancer gửi) — nên nó không sửa tại chỗ được, phải có ô riêng ở đây.  #Huynh */}
          {templateType === "proposal" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Hiệu lực báo giá (ngày)</span>
              <input
                type="number"
                min={1}
                value={String(content.valid_days ?? "")}
                onChange={(e) => setContent((truoc) => ghiValidDays(truoc, e.target.value))}
                placeholder="VD: 14"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Đổi số rồi bấm “Dựng lại” để xem trên giấy.
              </span>
            </label>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Đầu mục · phần thân {thanDaSoan}/{soThan.length}
              </p>
              <button
                type="button"
                onClick={() => dungLai({ template_type: templateType, content })}
                disabled={preview.isPending}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Dựng lại
              </button>
            </div>
            <ul className="space-y-0.5">
              {outline.map((muc, i) => (
                <Fragment key={`${muc.nhom}-${muc.key}`}>
                  {/* Dòng gộp cho các ô DÙNG CHUNG một đầu mục trên giấy — có nó thì đổi tên
                    "Điều Khoản Bổ Sung" là bên trái đổi theo, chứ không đứng im.  #Huynh */}
                  {dungChung.has(muc.titleKey) && outline[i - 1]?.titleKey !== muc.titleKey && (
                    <li className="px-2 pb-0.5 pt-1.5 text-xs font-medium text-muted-foreground">
                      {tenDauMucTrenGiay(muc.titleKey, templateType, content)}
                    </li>
                  )}
                <li className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => nhayToi(truongTrenGiay(muc))}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    {muc.noiDung === "co_dinh" ? (
                      <Minus className="size-3.5 shrink-0 text-muted-foreground/40" />
                    ) : daSoan.has(muc.key) ? (
                      <Check className="size-3.5 shrink-0 text-success" />
                    ) : (
                      <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        daSoan.has(muc.key) ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {nhanTrongDanBai(muc, templateType, content)}
                    </span>
                    {dangTat(content, muc.titleKey) && (
                      <span className="shrink-0 text-[10px] font-medium uppercase text-warning">
                        tắt
                      </span>
                    )}
                    {muc.nhom === "dieu_khoan" && (
                      <span className="shrink-0 text-[10px] uppercase text-muted-foreground/60">
                        đk
                      </span>
                    )}
                  </button>
                  {/* BA TẦNG. Bản trước chỉ có thùng rác, và nó chỉ hiện khi mục ĐÃ CÓ CHỮ —
                    nên "xoá được hay không" phụ thuộc việc admin đã gõ gì, chứ không phụ thuộc
                    mục đó quan trọng đến đâu. Admin nhìn mục trống tưởng bị cấm.  #Huynh */}
                  {/* BA TẦNG. Bản trước chỉ có thùng rác, và nó chỉ hiện khi mục ĐÃ CÓ CHỮ —
                    nên "xoá được hay không" phụ thuộc việc admin đã gõ gì, chứ không phụ thuộc
                    mục đó quan trọng đến đâu. Admin nhìn mục trống tưởng bị cấm.

                    Xoá chữ ≠ tắt mục, nên thùng rác có ở MỌI tầng: tầng 2 sửa chữ được thì
                    cũng phải xoá chữ được. Chỉ công tắc mới giới hạn theo tầng.  #Huynh */}
                  {daSoan.has(muc.key) && (
                    <button
                      type="button"
                      title={
                        muc.noiDung === "dieu"
                          ? `Trả "${muc.label}" về chữ mặc định`
                          : `Xoá chữ trong "${muc.label}" (mục vẫn còn, chỉ trống)`
                      }
                      onClick={() => doiCauTruc(xoaChuMuc(content, muc))}
                      className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  {muc.tang === 3 && HIDEABLE[templateType].has(muc.titleKey) ? (
                    <button
                      type="button"
                      title={
                        dangTat(content, muc.titleKey)
                          ? "Đang tắt — bật lại để mục này hiện trên bản gửi khách"
                          : "Tắt mục này — sẽ không hiện trên bản gửi khách, chữ vẫn được giữ"
                      }
                      onClick={() => doiCauTruc(batTatMuc(content, templateType, muc.titleKey))}
                      className="shrink-0 rounded p-1 text-muted-foreground/60 transition hover:bg-secondary hover:text-foreground"
                    >
                      {dangTat(content, muc.titleKey) ? (
                        <EyeOff className="size-3.5 text-warning" />
                      ) : (
                        <Eye className="size-3.5 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    <span
                      title={lyDoKhoa(muc, templateType)}
                      className="shrink-0 p-1 text-muted-foreground/35"
                    >
                      <Lock className="size-3.5" />
                    </span>
                  )}
                </li>
                </Fragment>
              ))}
            </ul>

            {/* ĐẦU MỤC TỰ SOẠN — bộ mục cứng không phủ hết mọi nghề. */}
            <div className="mt-3 border-t border-border pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Đầu mục tự thêm
              </p>
              <ul className="space-y-0.5">
                {mucTuSoan.map((muc, i) => (
                  <li key={`extra-${i}`} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nhayToi(`extra_title_${i}`)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      {muc.title.trim() ? (
                        <Check className="size-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-warning" />
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          muc.title.trim() ? "text-foreground" : "text-warning-foreground"
                        )}
                      >
                        {muc.title.trim() || "Chưa đặt tên — gõ tên trên giấy"}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Xoá hẳn đầu mục này"
                      onClick={() => doiCauTruc(xoaDauMuc(content, i))}
                      className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={mucTuSoan.length >= MAX_EXTRA_SECTIONS}
                onClick={() => doiCauTruc(themDauMuc(content))}
                className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-3.5" /> Thêm đầu mục
              </button>
              {mucTuSoan.length >= MAX_EXTRA_SECTIONS && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tối đa {MAX_EXTRA_SECTIONS} đầu mục — mẫu này in vào mọi tờ giấy gửi khách.
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Bật mẫu này
          </label>
          {!isActive && (
            <p className="flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              Mẫu đang tắt — freelancer sẽ không thấy mẫu này.
            </p>
          )}
        </aside>

        {/* ── TỜ GIẤY THẬT, gõ thẳng lên ─────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border bg-secondary/30 p-3">
          {preview.isPending && !html ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang dựng tờ giấy...
            </div>
          ) : html ? (
            <iframe
              ref={frameRef}
              onLoad={batSuaTaiCho}
              title="Mẫu tài liệu — bấm vào chữ để sửa"
              srcDoc={html}
              // `sandbox` KHÔNG kèm `allow-scripts`: tờ giấy là HTML/CSS thuần (hai template
              // Jinja không có thẻ <script> nào), nên chặn script trong khung là miễn phí. Giữ
              // `allow-same-origin` để trang cha còn chạm được `contentDocument` cho sửa tại chỗ.
              sandbox="allow-same-origin"
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : (
            <p className="flex-1 py-16 text-center text-sm text-muted-foreground">
              Chưa dựng được bản xem trước.
            </p>
          )}
          <p className="mt-2 shrink-0 text-center text-xs text-muted-foreground">
            Bấm vào bất kỳ mục nào trên giấy để gõ — kể cả TÊN đầu mục. Phần trong ngoặc như
            “(Tên khách hàng)” là chỗ hệ thống tự điền cho từng dự án, mẫu không đụng tới.
          </p>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2 border-t border-border pt-3">
        <Button
          type="button"
          size="sm"
          disabled={!luuDuoc || isSubmitting}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              template_type: templateType,
              profession: profession || null,
              content,
              is_active: isActive,
            })
          }
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {template ? "Lưu mẫu" : "Tạo mẫu mới"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        {!luuDuoc && (
          <span className="text-xs text-muted-foreground">
            Cần đặt tên mẫu và soạn ít nhất một mục.
          </span>
        )}
      </div>
    </div>
  );
}
