import type { QualificationScoreGaps } from "@/services/dealsService";

/**
 * Các ô có thể điền để bù điểm, và ô nào vá được tiêu chí nào.
 *
 * `fill_field` do backend gửi kèm từng khoảng thiếu (tra từ `FILL_FIELD` trong `scoring.py`)
 * — FE không tự đoán, nên hai bên không thể lệch.
 *
 * Tách khỏi file component vì Fast Refresh chỉ hoạt động khi một file chỉ export component.
 */
export type FillField = "client_budget" | "desired_timeline" | "notes";

export const FILL_FIELD_UI: Record<
  FillField,
  { label: string; hint: string; placeholder: string; multiline: boolean }
> = {
  client_budget: {
    label: "Ngân sách khách nêu",
    // Nhắc thẳng vì đây là chỗ dễ điền nhầm nhất, và điền nhầm thì AI chấm điểm dựa trên
    // một con số khách chưa từng nói.
    hint: 'Ghi lại con số KHÁCH nói, không phải giá bạn định chào. VD: "120 triệu", "50–80 triệu".',
    placeholder: "120 triệu",
    multiline: false,
  },
  desired_timeline: {
    label: "Mốc thời gian khách nêu",
    hint: 'Càng cụ thể càng được điểm cao. VD: "trước 30/09/2026", "trong 6 tuần".',
    placeholder: "trước 30/09/2026",
    multiline: false,
  },
  notes: {
    label: "Bổ sung nội dung yêu cầu",
    // Không dùng chữ "nối thêm" — đó là từ của người viết code, người dùng đọc thấy kỳ.
    // Chỉ cần cho họ yên tâm là phần mô tả cũ vẫn còn nguyên.
    hint: "Viết thêm những gì bạn hỏi được: hạng mục cần làm, sản phẩm bàn giao, ràng buộc, bối cảnh khách hàng. Phần mô tả cũ vẫn được giữ.",
    placeholder:
      "Khách cần 5 hạng mục: đăng nhập, giỏ hàng, thanh toán VNPay, CMS, báo cáo doanh thu...",
    multiline: true,
  },
};

/** Thứ tự cố định để form không nhảy chỗ giữa hai lần chấm. */
const FIELD_ORDER: FillField[] = ["client_budget", "desired_timeline", "notes"];

/**
 * Nhãn ngắn dùng khi ĐIỂM LẠI những gì đã bổ sung (khác nhãn trên form).
 *
 * Trên form đang hỏi nên nhãn dài cho rõ ("Ngân sách khách nêu"); còn khi liệt kê lại thứ đã
 * lưu thì nó nằm sau chữ "Bạn đã bổ sung", nhãn dài đọc thành thừa.
 */
export const FILL_FIELD_SHORT_LABEL: Record<FillField, string> = {
  client_budget: "Ngân sách",
  desired_timeline: "Mốc thời gian",
  notes: "Nội dung yêu cầu",
};

export type FillGapsValues = {
  client_budget?: string;
  desired_timeline?: string;
  /** Chữ NỐI THÊM vào `notes`, không phải thay thế. */
  notes_append?: string;
};

/**
 * Chỉ những ô vá được khoảng thiếu hiện tại.
 *
 * Bày cả năm ô thì người dùng phải tự đối chiếu xem ô nào ứng với dòng nào đang đỏ. Bảng
 * chấm điểm đã biết chính xác thiếu gì rồi — form phải hỏi đúng ngần ấy.  #Huynh
 */
export function fieldsToFill(gaps: QualificationScoreGaps): FillField[] {
  const needed = new Set(
    gaps.gaps
      .map((gap) => gap.fill_field)
      .filter((field): field is FillField => field !== null && field in FILL_FIELD_UI)
  );
  return FIELD_ORDER.filter((field) => needed.has(field));
}
