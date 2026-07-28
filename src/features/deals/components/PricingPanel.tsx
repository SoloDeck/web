import { useState } from "react";
import { AlertTriangle, Check, ChevronRight, Cpu, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/utils/format";
import type { PricingDetail } from "@/features/deals/proposalHtml";

/**
 * Thanh chốt giá — MỘT dòng.
 *
 * Vì sao màn này tồn tại: bản báo giá cũ ra "0 ₫" kèm dòng "Giá sẽ được báo sau khi thống
 * nhất phạm vi công việc" — AI không hề định giá, nó chỉ chép lại ô "Giá trị dự kiến" mà
 * freelancer tự nhập. Vô dụng ở đúng cái việc khó nhất. Giờ backend neo vào GIÁ THẬT
 * freelancer đã chốt ở các dự án cùng loại rồi nhân hệ số, ra một KHOẢNG.
 *
 * Vì sao nó TEO LẠI thành một thanh: bản trước bày hết căn cứ ra màn hình — mốc neo, ba hệ
 * số kèm lý do, cảnh báo, bảng hạng mục — chiếm gần hết chỗ và ép tờ báo giá (thứ người ta
 * thực sự cần nhìn) xuống dưới. Tệ hơn: khi chưa có lịch sử để neo thì CẢ BA hệ số đều ×1,
 * tức là chúng không làm lệch giá một đồng nào, vậy mà mỗi cái vẫn chiếm ba dòng giải
 * thích. Giải thích cặn kẽ một thứ vô tác dụng thì chỉ là nhiễu.
 *
 * Nên: giá + thanh kéo luôn hiện; căn cứ nằm sau "Vì sao giá này?", ai cần thì bấm. Bảng
 * hạng mục bỏ hẳn ở đây — nó đã nằm trong mục "7. Bảng Chi Phí" của chính tờ báo giá bên
 * dưới, bày hai lần chỉ tổ mâu thuẫn nhau.  #Huynh
 */

const CONFIDENCE_UI: Record<
  PricingDetail["anchor"]["confidence"],
  { label: string; className: string; hint: string }
> = {
  high: {
    label: "Tin cậy cao",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    hint: "Neo vào các dự án bạn đã thực sự chốt — khoảng giá hẹp.",
  },
  medium: {
    label: "Tin cậy vừa",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    hint: "Có dữ liệu thật nhưng còn ít — khoảng giá nới rộng hơn.",
  },
  low: {
    label: "Tin cậy thấp",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    hint: "Chưa có dự án nào đã chốt để đối chiếu — khoảng giá rộng.",
  },
};

/** Bước kéo 500.000 ₫ — khớp đúng mức làm tròn của backend, để mọi giá kéo được đều "đẹp". */
const STEP = 500_000;

/** 1.234.000 — dấu chấm hàng nghìn, không kèm "₫" (ô nhập có ký hiệu riêng bên cạnh). */
const groupThousands = (n: number) => n.toLocaleString("vi-VN");

export function PricingPanel({
  detail,
  onChange,
  isSaving,
  readOnly,
}: {
  detail: PricingDetail;
  /** Gọi mỗi khi người dùng kéo/gõ. Cha tự hoãn rồi lưu — không có nút "Chốt". */
  onChange: (price: number) => void;
  isSaving: boolean;
  readOnly?: boolean;
}) {
  const committed = detail.final_price ?? null;

  // KHÔNG đồng bộ lại bằng useEffect. Component được mount kèm `key` đổi theo giá đề xuất
  // và giá đã chốt, nên sinh lại báo giá là React tự dựng lại state từ đầu — không cần
  // effect, không có nhấp nháy một khung hình với giá cũ.  #Huynh
  const [price, setPriceState] = useState<number>(committed ?? detail.suggested);
  const [whyOpen, setWhyOpen] = useState(false);

  // Kéo tới đâu báo cha tới đó. Cha hoãn ~0.7s rồi mới lưu, nên tờ báo giá bên dưới luôn
  // hiện ĐÚNG giá đang kéo — người dùng thấy thứ mình sắp gửi, không phải giá cũ.
  //
  // KHÔNG có nút "Chốt giá này": kéo xong là xong. Việc "con người quyết" đã nằm ở hộp
  // thoại lúc gửi ("Gửi báo giá 91.500.000 ₫ cho ...?") — bắt xác nhận hai lần không làm nó
  // "người" hơn, chỉ làm phiền.  #Huynh
  const setPrice = (next: number) => {
    setPriceState(next);
    onChange(next);
  };

  // Cho kéo RỘNG HƠN khoảng đề xuất. Freelancer biết những điều hệ thống không biết (khách
  // quen, muốn lấy dự án làm portfolio, đang cần việc gấp). Ngoài khoảng thì CẢNH BÁO,
  // không CẤM — phần mềm không được quyết hộ họ.
  const sliderMin = Math.max(STEP, Math.floor((detail.range_min * 0.6) / STEP) * STEP);
  const sliderMax = Math.ceil((detail.range_max * 1.4) / STEP) * STEP;

  const outsideRange = price < detail.range_min || price > detail.range_max;

  // Vị trí dải "khoảng đề xuất" trên thanh kéo, tính theo %.
  const bandLeft = ((detail.range_min - sliderMin) / (sliderMax - sliderMin)) * 100;
  const bandWidth = ((detail.range_max - detail.range_min) / (sliderMax - sliderMin)) * 100;

  const confidence = CONFIDENCE_UI[detail.anchor.confidence];

  // CHỈ bày hệ số nào thực sự làm lệch giá. Hệ số ×1 không đổi một đồng nào — kể lể về nó
  // là bắt người đọc lọc nhiễu để tìm tín hiệu.  #Huynh
  const movingFactors = detail.factors.filter((factor) => factor.factor !== 1);

  return (
    <div className="space-y-3">
      {/* Xếp DỌC, không còn là một thanh ngang.
          Panel này giờ nằm trong CỘT TRÁI rộng ~400px của modal báo giá. Bản cũ xếp ba thứ
          (con số | thanh kéo | trạng thái lưu) trên một hàng `flex-wrap` — hợp với dải ngang
          chiếm hết bề rộng modal, nhưng ở cột hẹp thì thanh kéo bị bóp còn ~180px rồi trạng
          thái rớt xuống dòng riêng, nhìn vỡ.  #Huynh */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Giá bạn chào khách
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Đã lưu
              </>
            )}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={groupThousands(price)}
            disabled={readOnly}
            aria-label="Giá chào khách"
            // Gõ tay: bóc hết dấu chấm rồi mới ép số, nếu không "371.000.000" thành 371.
            onChange={(event) =>
              setPrice(Math.max(0, Number(event.target.value.replace(/\D/g, "")) || 0))
            }
            style={{ width: `${groupThousands(price).length + 0.5}ch` }}
            className="border-0 border-b border-dashed border-transparent bg-transparent p-0 text-2xl font-black tabular-nums text-primary outline-none hover:border-border focus:border-primary disabled:opacity-60"
          />
          <span className="text-2xl font-black text-primary">₫</span>
        </div>
      </div>

      <div>
        <div className="relative">
          {/* Dải xanh = khoảng đề xuất. Kéo ra ngoài vẫn được, nhưng thấy rõ là ra ngoài. */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted">
            <div
              className="absolute h-full rounded-full bg-primary/25"
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            />
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={STEP}
            value={price}
            disabled={readOnly}
            onChange={(event) => setPrice(Number(event.target.value))}
            aria-label="Kéo để chỉnh giá"
            className="relative w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>
            Đề xuất <span className="font-semibold">{formatVND(detail.suggested)}</span>
          </span>
          <span>
            {formatVND(detail.range_min)} – {formatVND(detail.range_max)}
          </span>
        </div>
      </div>

      {outsideRange && (
        <p className="flex items-start gap-1.5 text-xs leading-4 text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Ngoài khoảng đề xuất. Vẫn chốt được — bạn biết những điều hệ thống không biết.
          </span>
        </p>
      )}

      {/* Căn cứ — bấm mới mở. Cần MỘT lần để tin, không cần lần nào cũng đọc. */}
      <div>
        <button
          type="button"
          onClick={() => setWhyOpen((open) => !open)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", whyOpen && "rotate-90")} />
          Vì sao giá này?
          <span
            className={cn(
              "ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              confidence.className
            )}
          >
            {confidence.label}
          </span>
        </button>

        {whyOpen && (
          <div className="mt-2 space-y-3 rounded-lg bg-muted/40 p-3">
            <p className="text-xs leading-4 text-muted-foreground">
              AI không tự nghĩ ra con số — giá neo vào các dự án bạn đã chốt, rồi nhân hệ số.
              Bạn là người quyết.
            </p>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mốc neo
                </span>
                <span className="text-sm font-bold">{formatVND(detail.anchor.value)}</span>
              </div>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail.anchor.source}</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground/70">{confidence.hint}</p>
            </div>

            {movingFactors.length > 0 ? (
              <ul className="space-y-2">
                {movingFactors.map((factor) => (
                  <li key={factor.key} className="flex items-start gap-2.5">
                    {/* Nhãn AI/Máy tính là điểm mấu chốt về độ tin: cái nào máy tính ra,
                        cái nào AI phán. */}
                    <span
                      title={
                        factor.decided_by === "code"
                          ? "Máy tính ra, không phải AI phán"
                          : "AI chấm, kèm lý do trích từ dữ liệu"
                      }
                      className={cn(
                        "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        factor.decided_by === "code"
                          ? "bg-sky-500/10 text-sky-600"
                          : "bg-violet-500/10 text-violet-600"
                      )}
                    >
                      {factor.decided_by === "code" ? (
                        <Cpu className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {factor.decided_by === "code" ? "Máy tính" : "AI"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{factor.label}</span>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-bold tabular-nums",
                            factor.factor > 1 ? "text-amber-600" : "text-emerald-600"
                          )}
                        >
                          ×{factor.factor}
                        </span>
                      </div>
                      {factor.reason && (
                        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                          {factor.reason}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-4 text-muted-foreground">
                Không hệ số nào làm lệch giá — giá đề xuất bằng đúng mốc neo ở trên.
              </p>
            )}

            {detail.warnings.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                {detail.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex items-start gap-2 text-xs leading-4 text-amber-700"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
