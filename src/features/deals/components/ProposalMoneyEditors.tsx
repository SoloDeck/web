import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { formatVND } from "@/utils/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEPOSIT_DEFAULT_PERCENT,
  DUE_CUSTOM,
  DUE_ON_COMPLETION,
  DUE_ON_SIGNING,
  DUE_TYPE_LABELS,
  costItemsIssue,
  depositAmount,
  depositPercentOf,
  displayDepositPercent,
  splitDeposit,
  paymentPercentIssue,
  splitEqually,
  type CostItem,
  type DueType,
  type PaymentMilestone,
} from "@/features/deals/proposalHtml";

/**
 * Hai editor có cấu trúc cho phần TIỀN của báo giá — sửa ở màn review (Stage 4).
 *
 * Vì sao KHÔNG sửa thẳng trong bảng ở tờ báo giá (như các đoạn chữ): bảng có thêm/xoá dòng,
 * và số tiền phải chia lại theo giá đã chốt — làm inline trong iframe `contentEditable` thì
 * rất dễ vỡ. Ở đây là panel gọn; sửa tới đâu tờ báo giá (do server dựng) refetch vẽ lại tới
 * đó, nên vẫn "thấy sao nhận vậy".  #Huynh
 */

const inputClass =
  "min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary";

/**
 * Nhãn cho MỌI thời điểm thu, kể cả cái không còn nằm trong danh sách mời chọn.
 *
 * Ô chọn lọc bớt "Khi ký hợp đồng", nhưng báo giá cũ vẫn mang giá trị đó — nếu chỗ tra nhãn
 * cũng thiếu nó thì nút hiện mã máy trần.
 */
const DUE_TYPE_ITEMS: Array<{ value: DueType; label: string }> = (
  Object.keys(DUE_TYPE_LABELS) as DueType[]
).map((type) => ({
  value: type,
  label: type === DUE_CUSTOM ? "Khác…" : DUE_TYPE_LABELS[type],
}));

/** Chỉ giữ chữ số — gõ "200.000.000" hay "200000000" đều ra cùng một số. */
function onlyDigits(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Một hạng mục thường — kéo được. Tách thành component vì `useSortable` là hook. */
function SortableCostRow({
  item,
  ordinal,
  disabled,
  canDelete,
  onPatch,
  onDelete,
}: {
  item: CostItem;
  ordinal: number;
  disabled?: boolean;
  canDelete: boolean;
  onPatch: (patch: Partial<CostItem>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id ?? String(ordinal),
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="space-y-1"
    >
      <div className="flex items-center gap-1.5">
        {/* TAY NẮM RIÊNG, không đặt listener lên cả hàng: hàng này có ba ô nhập, mà cho kéo
          trên toàn hàng thì thao tác bôi đen chữ trong ô biến thành thao tác kéo.  #Huynh */}
        <button
          type="button"
          disabled={disabled}
          {...attributes}
          {...listeners}
          aria-label={`Đổi vị trí hạng mục ${ordinal}`}
          title="Kéo để đổi vị trí"
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <input
          value={item.label}
          disabled={disabled}
          placeholder={`Hạng mục ${ordinal}`}
          onChange={(event) => onPatch({ label: event.target.value })}
          className={inputClass}
        />
        {/* Ô tiền GÕ ĐƯỢC. Trước đây là <span> chỉ để đọc, hiện số chia đều mà số đó
          không bao giờ được gửi đi — panel nói một đằng, tờ báo giá in một nẻo.  #Huynh */}
        <input
          value={item.amount ? item.amount.toLocaleString("vi-VN") : ""}
          disabled={disabled}
          inputMode="numeric"
          placeholder="0"
          aria-label={`Số tiền hạng mục ${ordinal}`}
          onChange={(event) => onPatch({ amount: onlyDigits(event.target.value) })}
          className="w-28 shrink-0 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={disabled || !canDelete}
          onClick={onDelete}
          className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
          aria-label="Xoá hạng mục"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* THỜI ĐIỂM THU — LOẠI có sẵn chứ không phải chữ tự do: bản trước để gõ chữ, và giao
        diện phải đoán xem câu đó có nghĩa "thu trước" không bằng cách dò từ khoá tiếng Việt —
        gõ "Ngay sau khi hai bên xác nhận" là đoán trượt, cảnh báo hiện sai.  #Huynh */}
      {/* `items` KHÔNG thừa: <Select> dùng chung tra nhãn từ đây để vẽ chữ trên nút. Bỏ đi
        thì lúc chưa mở danh sách, ô hiện thẳng mã máy ("on_completion") thay vì câu tiếng
        Việt — và danh sách bên trong lại lọc bớt nên không tra nhãn thay được. */}
      <Select
        items={DUE_TYPE_ITEMS}
        value={item.due_type ?? DUE_ON_COMPLETION}
        disabled={disabled}
        onValueChange={(value) => onPatch({ due_type: value as DueType })}
      >
        {/* "Khi ký hợp đồng" KHÔNG còn là lựa chọn của hạng mục thường.
          Khoản thu trước giờ có hàng riêng ghim đầu bảng; để lựa chọn này ở đây nữa là hai
          đường làm cùng một việc, và freelancer đặt hai hạng mục "khi ký" thì tờ báo giá có
          hai khoản đòi trước mà không dòng nào tên là tạm ứng.

          VẪN hiện nếu hạng mục ĐANG mang giá trị đó — báo giá cũ sinh ra dưới luật "hạng mục
          đầu mặc định thu khi ký". Bỏ khỏi danh sách mà không chừa là ô chọn hiện trống rỗng,
          rồi chạm vào một cái là âm thầm đổi thời điểm thu của một khoản tiền.  #Huynh */}
        <SelectTrigger
          aria-label={`Thời điểm thu hạng mục ${ordinal}`}
          className="h-auto w-full rounded-md border-border bg-background px-2 py-1 text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(DUE_TYPE_LABELS) as DueType[])
            .filter((type) => type !== DUE_ON_SIGNING || item.due_type === DUE_ON_SIGNING)
            .map((type) => (
              <SelectItem key={type} value={type}>
                {type === DUE_CUSTOM ? "Khác…" : DUE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {/* Ô ghi chú CHỈ hiện khi chọn "Khác" — hợp đồng thật hay có điều kiện riêng ("khi
        bên A duyệt bản demo"), ép về hai câu cố định là làm nghèo tờ giấy. Nhưng bày sẵn
        một ô trống cho mọi dòng thì panel tốn ba dòng mỗi hạng mục mà hầu như không ai
        điền.  #Huynh */}
      {item.due_type === DUE_CUSTOM && (
        <input
          value={item.due_note ?? ""}
          disabled={disabled}
          autoFocus
          placeholder="Ghi rõ khi nào thu, vd: Sau khi bên A duyệt bản demo"
          aria-label={`Ghi rõ thời điểm thu hạng mục ${ordinal}`}
          onChange={(event) => onPatch({ due_note: event.target.value })}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
        />
      )}
    </div>
  );
}

export function LineItemsEditor({
  items,
  agreedTotal,
  onChange,
  disabled,
}: {
  /** Hạng mục kèm SỐ TIỀN — freelancer gõ tay, không còn chia đều tự động. */
  items: CostItem[];
  /** Giá chào khách, để đối chiếu. Lệch thì cảnh báo và khoá nút gửi. */
  agreedTotal: number;
  onChange: (items: CostItem[]) => void;
  disabled?: boolean;
}) {
  // Ô % và ô tiền của khoản cọc giữ bản nháp riêng lúc đang gõ: không có nó thì gõ "3" đã bị
  // quy thành 3% rồi giãn lại cả bảng, chưa kịp gõ nốt số "0".  #Huynh
  const [percentDraft, setPercentDraft] = useState<string | null>(null);
  const [depositDraft, setDepositDraft] = useState<string | null>(null);

  const sensors = useSensors(
    // Đúng khuôn bảng Kanban: phải kéo quá 5px mới tính, để bấm vào tay nắm không thành kéo.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Tay nắm là nút bấm được, nên bàn phím cũng đổi được vị trí — chuột không phải lối duy nhất.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const deposit = items.find((item) => item.is_deposit);
  const rows = items.filter((item) => !item.is_deposit);

  /** Định vị theo ID chứ không theo index — kéo xong index đổi, sửa theo index là sửa nhầm dòng. */
  const patchById = (id: string | undefined, patch: Partial<CostItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  // Luật khớp tổng dùng CHUNG với nút gửi và với guard bên backend — ba chỗ tự cộng lại mỗi
  // nơi một kiểu là ra ba câu trả lời khác nhau về TIỀN.  #Huynh
  const issue = costItemsIssue(items, agreedTotal);
  const sum = items.reduce((acc, item) => acc + (item.amount || 0), 0);

  /** Chia đều lại cho khớp giá chào — lối thoát nhanh khi đang lệch. Khoản cọc giữ nguyên. */
  const splitEvenly = () => {
    const amounts = splitEqually(agreedTotal - (deposit?.amount ?? 0), rows.length);
    const evened = rows.map((item, i) => ({ ...item, amount: amounts[i] ?? 0 }));
    onChange(deposit ? [deposit, ...evened] : evened);
  };

  /** Mọi thay đổi về cọc đi qua ĐÚNG một đường, để không có hai cách tính tiền. */
  const setDepositPercent = (percent: number) =>
    onChange(splitDeposit(items, agreedTotal, percent));

  /**
   * Áp tỷ lệ mới, NHƯNG chỉ khi nó thật sự ra được một khoản tiền.
   *
   * Bản đầu gọi thẳng `setDepositPercent` sau mỗi phím gõ, và vì `splitDeposit(…, 0)` là XOÁ
   * hàng cọc nên hàng biến mất ngay giữa lúc đang nhập: xoá trắng ô để gõ lại là mất hàng;
   * gõ chữ số đầu tiên của "50.000.000" là 5 đồng, làm tròn về 0, cũng mất hàng. Người dùng
   * gõ được đúng một ký tự rồi ô nhập tự đóng.
   *
   * Nay bàn phím KHÔNG bao giờ xoá được hàng — chỉ nút thùng rác mới xoá. Giá trị dở dang
   * nằm yên trong bản nháp cho tới khi gõ ra một số dùng được.  #Huynh
   */
  const applyDepositPercent = (percent: number) => {
    if (!Number.isFinite(percent) || percent <= 0) return;
    if (depositAmount(agreedTotal, percent, rows.length) <= 0) return;
    setDepositPercent(percent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((item) => item.id === active.id);
    const to = rows.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    const moved = arrayMove(rows, from, to);
    onChange(deposit ? [deposit, ...moved] : moved);
  };

  return (
    <div className="space-y-2">
      {/* PHÍ TRẢ TRƯỚC — ghim trên cùng, NGOÀI vùng kéo thả.
        Vì sao là một hàng của bảng chứ không phải một khoản riêng bên ngoài: hạng mục chi phí
        đã là ĐƠN VỊ THU TIỀN (một dòng = một việc = một hoá đơn), và luật "tổng hạng mục =
        giá chào khách" đang được ba nơi kiểm cùng lúc. Để cọc ra ngoài bảng là phải sửa cả
        ba, rồi bảng doanh thu với guard đóng dự án lặng lẽ thiếu mất khoản đó.  #Huynh */}
      {deposit ? (
        <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2">
          <div className="flex items-center gap-2">
            <input
              value={deposit.label}
              disabled={disabled}
              placeholder="Phí trả trước"
              aria-label="Tên khoản trả trước"
              onChange={(event) => patchById(deposit.id, { label: event.target.value })}
              className={inputClass}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setPercentDraft(null);
                setDepositDraft(null);
                setDepositPercent(0);
              }}
              className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
              aria-label="Bỏ phí trả trước"
              title="Bỏ phí trả trước"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex w-20 shrink-0 items-center gap-1">
              <input
                value={
                  percentDraft ??
                  displayDepositPercent(deposit.deposit_percent ?? DEPOSIT_DEFAULT_PERCENT)
                }
                disabled={disabled}
                inputMode="decimal"
                aria-label="Tỷ lệ trả trước"
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d.]/g, "");
                  setPercentDraft(raw);
                  setDepositDraft(null);
                  applyDepositPercent(Number(raw));
                }}
                // Bỏ bản nháp khi rời ô: ô hiện lại đúng con số đang có thật. Gõ dở rồi bỏ đi
                // thì không mất khoản cọc — muốn bỏ hẳn thì bấm nút xoá.
                onBlur={() => setPercentDraft(null)}
                className={`${inputClass} text-right`}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {/* Gõ ô tiền cũng quy về ĐÚNG lời gọi trên: một đường tính duy nhất. Hệ quả là số
              bị nắn về bội 1.000 ₫ — chấp nhận được, cả bảng vốn đã làm tròn như vậy. */}
            <input
              value={depositDraft ?? (deposit.amount ? deposit.amount.toLocaleString("vi-VN") : "")}
              disabled={disabled}
              inputMode="numeric"
              aria-label="Số tiền trả trước"
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                const next = digits ? Number(digits) : 0;
                setDepositDraft(digits ? next.toLocaleString("vi-VN") : "");
                setPercentDraft(null);
                applyDepositPercent(depositPercentOf(agreedTotal, next));
              }}
              onBlur={() => setDepositDraft(null)}
              className="w-28 shrink-0 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-primary"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          // Chưa chốt giá thì không tính ra được đồng nào, bấm vào sẽ KHÔNG xảy ra gì. Một nút
          // không phản ứng còn tệ hơn không có nút: người dùng tưởng bấm trượt rồi bấm lại
          // mấy lần. Khoá lại và nói rõ lý do bằng tooltip.  #Huynh
          disabled={disabled || rows.length === 0 || agreedTotal <= 0}
          title={
            agreedTotal <= 0 ? "Chốt giá chào khách trước rồi mới đặt được phí trả trước" : undefined
          }
          onClick={() => setDepositPercent(DEPOSIT_DEFAULT_PERCENT)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm phí trả trước {DEPOSIT_DEFAULT_PERCENT}%
        </button>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={rows.map((item, index) => item.id ?? String(index))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {rows.map((item, index) => (
              <SortableCostRow
                key={item.id ?? index}
                item={item}
                ordinal={index + 1}
                disabled={disabled}
                canDelete={rows.length > 1}
                onPatch={(patch) => patchById(item.id, patch)}
                onDelete={() => onChange(items.filter((row) => row.id !== item.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange([...items, { label: "", amount: 0, id: crypto.randomUUID() }])
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm hạng mục
        </button>
        <span className="text-xs text-muted-foreground">
          Tổng <span className="font-semibold text-foreground">{formatVND(sum)}</span>
        </span>
      </div>

      {issue ? (
        <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{issue.message}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={splitEvenly}
            className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80 disabled:opacity-40"
          >
            Chia đều
          </button>
        </div>
      ) : (
        agreedTotal > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5" /> Khớp giá chào khách
          </div>
        )
      )}

      {/* Cảnh báo MỀM, không khoá nút gửi: thu tiền theo hạng mục nghĩa là chỉ được tiền sau
        khi đã làm xong, nên nếu không có khoản trả trước thì freelancer làm không công suốt
        giai đoạn đầu — đúng cái rủi ro SoloDesk sinh ra để ngăn. Không chặn vì có freelancer
        chấp nhận không cọc với khách quen; nhưng phải nói ra.  #Huynh */}
      {!issue && rows.length > 0 && !deposit && (
        <div className="flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            Không có khoản thu trước khi bắt đầu — bạn sẽ làm xong mới nhận được đồng đầu tiên.
            Bấm <b>Thêm phí trả trước</b> nếu muốn giữ khoản đặt cọc.
          </span>
        </div>
      )}
    </div>
  );
}

export function MilestonesEditor({
  milestones,
  onChange,
  disabled,
}: {
  milestones: PaymentMilestone[];
  onChange: (milestones: PaymentMilestone[]) => void;
  disabled?: boolean;
}) {
  const patchAt = (index: number, patch: Partial<PaymentMilestone>) =>
    onChange(milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  // Luật 100% dùng CHUNG với nút gửi và với guard bên backend — không tự cộng lại ở đây,
  // ba chỗ tính khác nhau một chút là ra ba câu trả lời khác nhau về TIỀN.  #Huynh
  const issue = paymentPercentIssue(milestones);
  const sumPercent = milestones.reduce((sum, m) => sum + (m.percent ?? 0), 0);
  const hasPercent = milestones.some((m) => m.percent != null);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {/* Mỗi đợt = một khối HAI DÒNG (mô tả / tỷ lệ + thời điểm), không còn nhồi bốn thứ
          trên một hàng. Panel này nằm trong cột trái ~400px của modal báo giá: xếp ngang thì
          mỗi ô còn ~80px, gõ "Khi nghiệm thu & bàn giao" vào đó là vô phương đọc lại.  #Huynh */}
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className="space-y-1.5 rounded-md border border-border/60 bg-background/40 p-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={milestone.label}
                disabled={disabled}
                placeholder={`Đợt ${index + 1} — mô tả`}
                onChange={(event) => patchAt(index, { label: event.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                disabled={disabled || milestones.length <= 1}
                onClick={() => onChange(milestones.filter((_, i) => i !== index))}
                className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label="Xoá đợt"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex w-20 shrink-0 items-center gap-1">
                <input
                  value={milestone.percent ?? ""}
                  disabled={disabled}
                  inputMode="numeric"
                  placeholder="%"
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    patchAt(index, { percent: digits === "" ? null : Number(digits) });
                  }}
                  className={`${inputClass} text-right`}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <input
                value={milestone.due ?? ""}
                disabled={disabled}
                placeholder="Thời điểm / điều kiện"
                onChange={(event) => patchAt(index, { due: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange([...milestones, { label: "", percent: null, amount: "", due: "" }])
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm đợt
        </button>
        {hasPercent && !issue && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-600" /> Tổng tỷ lệ: {sumPercent}%
          </span>
        )}
      </div>

      {/* Sai tổng là CHẶN GỬI, nên phải nói thẳng bằng màu lỗi chứ không phải một dòng cam
        mờ như trước — người dùng cần biết vì sao nút gửi bị khoá.  #Huynh */}
      {issue && (
        <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs font-medium leading-4 text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{issue.message}</span>
        </p>
      )}
    </div>
  );
}
