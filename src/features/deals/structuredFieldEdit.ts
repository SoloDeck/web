import {
  CLAUSE_TEXTS_KEY,
  EXTRA_SECTIONS_KEY,
  SECTION_TITLES_KEY,
  ghiField,
  laOCauTruc,
} from "@/features/admin/templateContent";
import type { AdminTemplateType } from "@/services/adminService";

/**
 * Sửa tại chỗ những ô CẤU TRÚC của báo giá/hợp đồng: tên đầu mục (`title_*`), chữ trong điều có
 * sẵn (`clause_*`) và đầu mục tự soạn (`extra_title_N` / `extra_body_N`).
 *
 * Ba loại ô này không lưu vào khoá cùng tên mà vào ba khoá gom: `section_titles`, `clause_texts`,
 * `extra_sections` — đúng thứ bộ dựng giấy đọc lại. Trước đây khung sửa của freelancer ghi thẳng
 * `content["clause_party_a_duties"]`, một khoá không ai đọc: chữ sửa vẫn hiện trên màn, nhưng mở
 * lại là về mặc định và bản gửi khách cũng là bản mặc định.
 *
 * Tách thành hàm thuần để báo giá (giữ ô sửa trong state riêng) và hợp đồng (gộp thẳng vào
 * content) dùng chung một cách tính, và để kiểm được mà không cần dựng iframe.  #Huynh
 */

/** Ba khoá gom mà một lần sửa ô cấu trúc có thể đụng tới. */
export const KHOA_CAU_TRUC_SUA_DUOC = [
  EXTRA_SECTIONS_KEY,
  SECTION_TITLES_KEY,
  CLAUSE_TEXTS_KEY,
] as const;

/** Khoá gom → giá trị mới; `null` nghĩa là XOÁ khoá đó (không còn chữ nào ghi đè). */
export type DoiCauTruc = Partial<Record<(typeof KHOA_CAU_TRUC_SUA_DUOC)[number], unknown>>;

export { laOCauTruc };

/**
 * Một lần sửa ô cấu trúc làm đổi những khoá gom nào. Rỗng = không đổi gì (bấm vào rồi bấm ra,
 * hoặc gõ lại đúng chữ đang có).
 *
 * Ô thường (`scope_of_work`...) cũng cho ra rỗng: `ghiField` chỉ đụng khoá của chính ô đó, mà hàm
 * này chỉ so ba khoá gom — nên không cần chặn riêng ở đầu hàm.
 */
export function tinhDoiCauTruc(
  content: Record<string, unknown>,
  templateType: AdminTemplateType,
  field: string,
  value: string
): DoiCauTruc {
  const sau = ghiField(content, templateType, field, value);
  const doi: DoiCauTruc = {};
  for (const khoa of KHOA_CAU_TRUC_SUA_DUOC) {
    if (JSON.stringify(sau[khoa] ?? null) !== JSON.stringify(content[khoa] ?? null)) {
      doi[khoa] = sau[khoa] ?? null;
    }
  }
  return doi;
}

/** Áp phần đổi lên content (không sửa bản gốc). `null` thì bỏ hẳn khoá. */
export function apDoiCauTruc<T extends Record<string, unknown>>(
  content: T,
  doi: DoiCauTruc
): T {
  const ra: Record<string, unknown> = { ...content };
  for (const khoa of KHOA_CAU_TRUC_SUA_DUOC) {
    if (!(khoa in doi)) continue;
    if (doi[khoa] === null || doi[khoa] === undefined) delete ra[khoa];
    else ra[khoa] = doi[khoa];
  }
  return ra as T;
}
