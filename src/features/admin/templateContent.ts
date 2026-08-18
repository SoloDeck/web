import type { AdminTemplate, AdminTemplateType } from "@/services/adminService";

/**
 * Luật về NỘI DUNG của một mẫu tài liệu — tách khỏi giao diện.
 *
 * Màn soạn mẫu giờ là một tờ giấy trong iframe (xem `TemplateDocEditor`), mà iframe thì jsdom
 * không dựng hình nên không kiểm được từ bên ngoài. Những bất biến ĐẮT nhất ở đây lại không
 * liên quan gì tới pixel:
 *
 * - `scope_of_work` là MẢNG với báo giá nhưng là CHUỖI với hợp đồng — gửi nhầm kiểu là in một
 *   mảng vào chỗ chờ chuỗi;
 * - `PATCH /admin/templates/{id}` THAY TOÀN BỘ `content`, nên khoá nào không được mang theo là
 *   chết im lặng (đã làm mất `valid_days` một lần);
 * - mẫu kiểu cũ chỉ có khoá `body` vẫn phải mở ra sửa được.
 *
 * Nên chúng ở đây, dưới dạng hàm thuần, và được kiểm trực tiếp.  #Huynh
 */

/** Khớp `VALID_DAYS_KEY` bên backend (src/shared/domain/template_blocks.py). */
export const VALID_DAYS_KEY = "valid_days";

/** Khoá của bản CŨ: một đoạn văn duy nhất, đọc như bí danh của `standard_terms`. */
export const LEGACY_BODY_KEY = "body";

const NEW_LINE = String.fromCharCode(10);

export type OutlineItem = {
  key: string;
  label: string;
  /** `than` = phần đặc thù dự án; `dieu_khoan` = phần lặp lại theo nghề. */
  nhom: "than" | "dieu_khoan";
  /**
   * Ô này nằm dưới ĐẦU MỤC nào trên giấy — khớp khoá của `*_SECTION_DEFAULTS` bên backend.
   *
   * Không phải lúc nào cũng 1-1: "Ngoài phạm vi" và "Chính sách chỉnh sửa" cùng nằm dưới một
   * đầu mục "Điều Khoản Bổ Sung". Thiếu liên kết này thì admin đổi tên mục trên giấy mà dàn
   * bài bên trái đứng im — đúng chỗ vừa bị báo lỗi.  #Huynh
   */
  titleKey: string;
  /**
   * Ba tầng quyền sửa — xem `PROPOSAL_HIDEABLE` / `CONTRACT_HIDEABLE` bên backend.
   *
   * 1 = khoá cứng (thiếu thì tài liệu không còn là tài liệu đó)
   * 2 = sửa chữ được nhưng KHÔNG tắt (thứ Phiếu đề tài đã hứa, hoặc khung tối thiểu)
   * 3 = tắt được (tuỳ nghề)
   */
  tang: 1 | 2 | 3;
  /**
   * Chữ của mục này nằm ở đâu — quyết định cả chỗ nhảy tới lẫn dấu "đã soạn".
   *
   * `o`      — một ô riêng trong `content` (`content.scope_of_work`)
   * `dieu`   — một điều khoản, ghi đè chữ mặc định (`content.clause_texts.term`)
   * `co_dinh`— không có gì để mẫu soạn: danh tính hai bên, tiền, ô xác nhận đều điền theo
   *            TỪNG dự án. Vẫn liệt kê ra để dàn bài phản ánh đúng tờ giấy — thiếu chúng thì
   *            admin nhìn dàn bài tưởng tờ giấy chỉ có bấy nhiêu mục.
   */
  noiDung: "o" | "dieu" | "co_dinh";
};

/** `data-field` để nhảy tới trên giấy. Mục cố định thì nhảy tới chính cái tiêu đề. */
export function truongTrenGiay(muc: OutlineItem): string {
  if (muc.noiDung === "dieu") return `clause_${muc.key}`;
  if (muc.noiDung === "co_dinh") return `title_${muc.titleKey}`;
  return muc.key;
}

/** Mục này đã có chữ của admin chưa — mỗi loại nội dung nằm một chỗ khác nhau. */
export function daSoanMuc(content: Record<string, unknown>, muc: OutlineItem): boolean {
  if (muc.noiDung === "co_dinh") return false;
  if (muc.noiDung === "dieu") return coChu(clauseTexts(content)[muc.key]);
  return coChu(content[muc.key]);
}

/**
 * Mục nào của tờ giấy do mẫu soạn, theo ĐÚNG thứ tự hiện trên giấy.
 *
 * Phải khớp `PROPOSAL_SKELETON_BLOCKS` / `CONTRACT_SKELETON_BLOCKS` bên backend; `nhom` khớp
 * phép trừ `body_blocks_for()` = bộ khung TRỪ bộ điều khoản.
 */
export const TEMPLATE_OUTLINE: Record<AdminTemplateType, OutlineItem[]> = {
  proposal: [
    { key: "party_a", label: "Bên A · bên gửi báo giá", nhom: "than", titleKey: "party_a", tang: 1, noiDung: "co_dinh" },
    { key: "party_b", label: "Bên B · khách hàng", nhom: "than", titleKey: "party_b", tang: 1, noiDung: "co_dinh" },
    { key: "project_overview", label: "Tổng quan dự án", nhom: "than", titleKey: "project_overview", tang: 3, noiDung: "o" },
    { key: "scope_of_work", label: "Phạm vi công việc", nhom: "than", titleKey: "scope_of_work", tang: 2, noiDung: "o" },
    { key: "deliverables", label: "Sản phẩm bàn giao", nhom: "than", titleKey: "deliverables", tang: 2, noiDung: "o" },
    { key: "timeline", label: "Thời gian thực hiện", nhom: "than", titleKey: "timeline", tang: 2, noiDung: "o" },
    // Hai dòng dưới cùng nằm dưới đầu mục Chi phí: bảng giá do freelancer nhập theo dự án,
    // mẫu chỉ soạn được phần điều khoản thanh toán.
    { key: "pricing", label: "Bảng giá (freelancer nhập theo dự án)", nhom: "than", titleKey: "pricing", tang: 1, noiDung: "co_dinh" },
    { key: "payment_terms", label: "Điều khoản thanh toán", nhom: "than", titleKey: "pricing", tang: 2, noiDung: "o" },
    // Hai ô này dùng CHUNG một đầu mục trên giấy.
    { key: "out_of_scope", label: "Ngoài phạm vi", nhom: "dieu_khoan", titleKey: "additional_terms", tang: 3, noiDung: "o" },
    { key: "revision_policy", label: "Chính sách chỉnh sửa", nhom: "dieu_khoan", titleKey: "additional_terms", tang: 3, noiDung: "o" },
    { key: "assumptions", label: "Ghi chú và giả định", nhom: "than", titleKey: "assumptions", tang: 3, noiDung: "o" },
    { key: "standard_terms", label: "Điều khoản chuẩn", nhom: "dieu_khoan", titleKey: "standard_terms", tang: 3, noiDung: "o" },
    { key: "confirmation", label: "Xác nhận và chữ ký", nhom: "than", titleKey: "confirmation", tang: 1, noiDung: "co_dinh" },
  ],
  contract: [
    { key: "scope_of_work", label: "Nội dung và phạm vi công việc", nhom: "than", titleKey: "scope_of_work", tang: 1, noiDung: "o" },
    { key: "term", label: "Thời hạn thực hiện", nhom: "dieu_khoan", titleKey: "term", tang: 2, noiDung: "dieu" },
    // Hai dòng dưới cùng nằm ở Điều giá trị hợp đồng.
    { key: "payment_terms", label: "Phương thức thanh toán", nhom: "than", titleKey: "payment", tang: 1, noiDung: "o" },
    { key: "late_payment", label: "Chậm thanh toán", nhom: "dieu_khoan", titleKey: "payment", tang: 2, noiDung: "dieu" },
    { key: "party_a_duties", label: "Quyền và nghĩa vụ Bên A", nhom: "dieu_khoan", titleKey: "party_a_duties", tang: 2, noiDung: "dieu" },
    { key: "party_b_duties", label: "Quyền và nghĩa vụ Bên B", nhom: "dieu_khoan", titleKey: "party_b_duties", tang: 2, noiDung: "dieu" },
    { key: "confidentiality", label: "Bảo mật thông tin", nhom: "dieu_khoan", titleKey: "confidentiality", tang: 3, noiDung: "dieu" },
    { key: "ip_ownership", label: "Quyền sở hữu trí tuệ", nhom: "dieu_khoan", titleKey: "ip_ownership", tang: 2, noiDung: "o" },
    // Hai ô này dùng CHUNG Điều "Sửa Đổi và Chấm Dứt".
    { key: "termination_clause", label: "Sửa đổi và chấm dứt", nhom: "dieu_khoan", titleKey: "termination_clause", tang: 3, noiDung: "o" },
    { key: "revision_policy", label: "Chính sách chỉnh sửa và phát sinh", nhom: "than", titleKey: "termination_clause", tang: 3, noiDung: "o" },
    { key: "dispute", label: "Giải quyết tranh chấp", nhom: "dieu_khoan", titleKey: "dispute", tang: 2, noiDung: "dieu" },
    { key: "standard_terms", label: "Điều khoản chuẩn", nhom: "dieu_khoan", titleKey: "standard_terms", tang: 3, noiDung: "o" },
    { key: "custom_clauses", label: "Điều khoản bổ sung", nhom: "dieu_khoan", titleKey: "custom_clauses", tang: 3, noiDung: "o" },
    { key: "general", label: "Điều khoản chung", nhom: "dieu_khoan", titleKey: "general", tang: 2, noiDung: "dieu" },
  ],
};


/**
 * Khoá nhận MẢNG chuỗi — KHÁC NHAU theo loại tài liệu, y như bên backend.
 *
 * `scope_of_work` là danh sách gạch đầu dòng trên tờ báo giá (`<ul data-field=...>`) nhưng là
 * một đoạn văn ở Điều 1 của hợp đồng (`<p data-field=...>`).
 */
export const LIST_KEYS: Record<AdminTemplateType, ReadonlySet<string>> = {
  proposal: new Set(["scope_of_work", "deliverables", "out_of_scope"]),
  contract: new Set<string>(),
};

/** Một giá trị có chữ thật hay không — chuỗi trắng và mảng rỗng đều tính là trống. */
export function coChu(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((x) => String(x).trim().length > 0);
  return String(value ?? "").trim().length > 0;
}

/**
 * Nội dung khởi đầu của màn soạn.
 *
 * Giữ NGUYÊN mọi khoá lạ: lượt lưu sau đó thay toàn bộ `content`, nên khoá nào rơi ở đây là
 * mất vĩnh viễn. Quy `body` kiểu cũ về `standard_terms` rồi bỏ hẳn — giữ cả hai là nhân đôi
 * cùng một đoạn chữ trong tài liệu.
 */
export function contentBanDau(template?: Pick<AdminTemplate, "content">): Record<string, unknown> {
  const goc = { ...((template?.content ?? {}) as Record<string, unknown>) };
  if (!coChu(goc[LEGACY_BODY_KEY])) {
    delete goc[LEGACY_BODY_KEY];
    return goc;
  }
  if (!coChu(goc.standard_terms)) goc.standard_terms = String(goc[LEGACY_BODY_KEY]).trim();
  delete goc[LEGACY_BODY_KEY];
  return goc;
}

/**
 * Ghi một mục vừa sửa trên giấy vào nội dung mẫu.
 *
 * Xoá trắng thì BỎ HẲN khoá chứ không ghi chuỗi rỗng: khoá rỗng và khoá vắng mặt ra hai kết
 * quả khác nhau trên tờ giấy (mục hiện ra trống vs mục biến mất), và bộ đếm "đã soạn mấy mục"
 * cũng đọc theo đó.
 */
export function ghiField(
  content: Record<string, unknown>,
  templateType: AdminTemplateType,
  field: string,
  value: string
): Record<string, unknown> {
  // Ô của đầu mục tự soạn mang tên có chỉ số (`extra_title_2`) chứ không phải một khoá cố
  // định, nên phải tách ra trước khi tra bảng khoá-mảng.
  // Tiêu đề mục cũng là một ô sửa tại chỗ, nhưng nó ghi vào `section_titles` chứ không phải
  // vào khoá nội dung cùng tên — đổi tên "Sản phẩm bàn giao" không có nghĩa là đã soạn mục đó.
  const titleKey = docTitleField(field);
  if (titleKey) return ghiSectionTitle(content, titleKey, value);

  // Chữ trong các điều CÓ SẴN ghi vào `clause_texts`, tách khỏi khoá nội dung cùng tên.
  const clauseKey = docClauseField(field);
  if (clauseKey) return ghiClauseText(content, clauseKey, value);

  const extra = docExtraField(field);
  if (extra) {
    const sections = extraSections(content);
    if (!sections[extra.index]) return content;
    const sau = sections.map((sec, i) =>
      i === extra.index ? { ...sec, [extra.loai]: value.trim() } : sec
    );
    return ghiExtraSections(content, sau);
  }

  const sau = { ...content };
  const sach = value.trim();
  if (!sach) {
    delete sau[field];
    return sau;
  }
  sau[field] = LIST_KEYS[templateType].has(field)
    ? sach.split(NEW_LINE).map((x) => x.trim()).filter(Boolean)
    : sach;
  return sau;
}

/** Đặt/xoá số ngày hiệu lực. Số không hợp lệ hoặc ≤ 0 thì bỏ khoá, không ghi 0. */
export function ghiValidDays(
  content: Record<string, unknown>,
  raw: string
): Record<string, unknown> {
  const sau = { ...content };
  const so = Number(raw);
  if (raw.trim() !== "" && Number.isFinite(so) && so > 0) sau[VALID_DAYS_KEY] = Math.round(so);
  else delete sau[VALID_DAYS_KEY];
  return sau;
}

/** Nhãn những mục mẫu này đã soạn, lọc theo nhóm nếu cần. */
export function mucDaSoan(
  content: Record<string, unknown>,
  templateType: AdminTemplateType,
  nhom?: OutlineItem["nhom"]
): string[] {
  return TEMPLATE_OUTLINE[templateType]
    .filter((m) => (nhom ? m.nhom === nhom : true))
    .filter((m) => daSoanMuc(content, m))
    .map((m) => m.label);
}

/** Khớp `EXTRA_SECTIONS_KEY` bên backend. */
export const EXTRA_SECTIONS_KEY = "extra_sections";

/** Chặn trên, khớp `MAX_EXTRA_SECTIONS` bên backend. */
export const MAX_EXTRA_SECTIONS = 12;

export type ExtraSection = { title: string; body: string };

/**
 * Đầu mục do admin tự đặt tên.
 *
 * Bộ mục cứng của tờ giấy không phủ hết mọi nghề: nhiếp ảnh cần "Quyền sử dụng hình ảnh", dịch
 * thuật cần "Quy tắc thuật ngữ". Tên mục nằm trong DỮ LIỆU chứ không nằm trong template, nên
 * admin đặt gì cũng được.  #Huynh
 */
export function extraSections(content: Record<string, unknown>): ExtraSection[] {
  const raw = content[EXTRA_SECTIONS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({ title: String(x.title ?? ""), body: String(x.body ?? "") }));
}

function ghiExtraSections(
  content: Record<string, unknown>,
  sections: ExtraSection[]
): Record<string, unknown> {
  const sau = { ...content };
  if (sections.length === 0) delete sau[EXTRA_SECTIONS_KEY];
  else sau[EXTRA_SECTIONS_KEY] = sections;
  return sau;
}

/**
 * Thêm một đầu mục trống ở cuối.
 *
 * CỐ Ý để tiêu đề RỖNG, không đặt sẵn "Đầu mục mới": chữ mồi trong code mà admin quên đổi là
 * đi thẳng vào tờ giấy gửi khách. Mục chưa có tên vẫn hiện ở màn soạn (backend giữ lại bằng
 * `keep_untitled`) nhưng KHÔNG hiện trên bản gửi khách.
 */
export function themDauMuc(content: Record<string, unknown>): Record<string, unknown> {
  const hienCo = extraSections(content);
  if (hienCo.length >= MAX_EXTRA_SECTIONS) return content;
  return ghiExtraSections(content, [...hienCo, { title: "", body: "" }]);
}

export function xoaDauMuc(
  content: Record<string, unknown>,
  index: number
): Record<string, unknown> {
  return ghiExtraSections(
    content,
    extraSections(content).filter((_, i) => i !== index)
  );
}

/**
 * Xoá NỘI DUNG một mục có sẵn của tờ giấy.
 *
 * Mục cứng thì không bỏ khỏi cấu trúc được, nhưng bỏ trống là nó KHÔNG hiện trên bản gửi khách
 * — đúng thứ admin muốn khi bấm "xoá". Ở màn soạn nó vẫn còn để bấm vào gõ lại.
 */
export function xoaNoiDungMuc(
  content: Record<string, unknown>,
  field: string
): Record<string, unknown> {
  const sau = { ...content };
  delete sau[field];
  return sau;
}

/** `data-field="extra_title_2"` -> `{loai: "title", index: 2}`. Không khớp thì `null`. */
export function docExtraField(field: string): { loai: "title" | "body"; index: number } | null {
  const khop = /^extra_(title|body)_(\d+)$/.exec(field);
  if (!khop) return null;
  return { loai: khop[1] as "title" | "body", index: Number(khop[2]) };
}

/** Khớp `SECTION_TITLES_KEY` bên backend. */
export const SECTION_TITLES_KEY = "section_titles";

/** `data-field="title_deliverables"` -> `"deliverables"`. Không khớp thì `null`. */
export function docTitleField(field: string): string | null {
  const khop = /^title_([a-z_]+)$/.exec(field);
  return khop ? khop[1] : null;
}

export function sectionTitles(content: Record<string, unknown>): Record<string, string> {
  const raw = content[SECTION_TITLES_KEY];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])
  );
}

/**
 * Đổi TÊN một đầu mục có sẵn của tờ giấy.
 *
 * Tên mục trước đây viết cứng trong hai file Jinja nên admin sửa được nội dung mà không sửa
 * được tên — trong khi cách gọi tên lại là thứ khác nhau nhiều nhất giữa các nghề: chỗ gọi
 * "Sản phẩm bàn giao", chỗ gọi "Hạng mục nghiệm thu".
 *
 * Gõ trắng = trả về tên mặc định. Backend còn lọc thêm một lượt: tên trùng mặc định thì bỏ,
 * nên bấm vào tiêu đề rồi bấm ra không đẻ ra khoá thừa trên tờ giấy.  #Huynh
 */
export function ghiSectionTitle(
  content: Record<string, unknown>,
  key: string,
  value: string
): Record<string, unknown> {
  const hienCo = sectionTitles(content);
  const sach = value.trim();
  if (sach) hienCo[key] = sach;
  else delete hienCo[key];

  const sau = { ...content };
  if (Object.keys(hienCo).length === 0) delete sau[SECTION_TITLES_KEY];
  else sau[SECTION_TITLES_KEY] = hienCo;
  return sau;
}

/** Khớp `CLAUSE_TEXTS_KEY` bên backend. */
export const CLAUSE_TEXTS_KEY = "clause_texts";

/** Khớp `CLAUSE_LIST_KEYS` — hai điều này là danh sách gạch đầu dòng, không phải đoạn văn. */
export const CLAUSE_LIST_KEYS: ReadonlySet<string> = new Set([
  "party_a_duties",
  "party_b_duties",
]);

/** `data-field="clause_confidentiality"` -> `"confidentiality"`. Không khớp thì `null`. */
export function docClauseField(field: string): string | null {
  const khop = /^clause_([a-z_]+)$/.exec(field);
  return khop ? khop[1] : null;
}

export function clauseTexts(content: Record<string, unknown>): Record<string, unknown> {
  const raw = content[CLAUSE_TEXTS_KEY];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

/**
 * Sửa CHỮ trong một điều có sẵn của tờ giấy.
 *
 * Trước đây admin đổi được TÊN điều mà không đổi được một chữ nào bên trong — bấm vào tiêu đề
 * thì sửa được, bấm vào đoạn ngay dưới thì không. Không nhất quán, và khoá cứng đúng những điều
 * pháp lý mà mỗi nghề diễn đạt một kiểu.
 *
 * Gõ trắng = quay về bản mặc định. Backend còn lọc thêm một lượt: chữ trùng mặc định thì bỏ,
 * nên bấm vào rồi bấm ra không đẻ ra khoá thừa.  #Huynh
 */
export function ghiClauseText(
  content: Record<string, unknown>,
  key: string,
  value: string
): Record<string, unknown> {
  const hienCo = clauseTexts(content);
  const sach = value.trim();

  if (!sach) delete hienCo[key];
  else if (CLAUSE_LIST_KEYS.has(key)) {
    const muc = sach.split(NEW_LINE).map((x) => x.trim()).filter(Boolean);
    if (muc.length === 0) delete hienCo[key];
    else hienCo[key] = muc;
  } else hienCo[key] = sach;

  const sau = { ...content };
  if (Object.keys(hienCo).length === 0) delete sau[CLAUSE_TEXTS_KEY];
  else sau[CLAUSE_TEXTS_KEY] = hienCo;
  return sau;
}

/**
 * Nhãn hiện trong dàn bài cho một ô, ĐÃ tính tên admin đổi trên giấy.
 *
 * Chỉ thay nhãn khi đầu mục đó chỉ chứa ĐÚNG một ô. Đầu mục chứa nhiều ô ("Điều Khoản Bổ Sung"
 * gồm cả Ngoài phạm vi lẫn Chính sách chỉnh sửa) thì giữ nhãn của từng ô — thay cả hai thành
 * cùng một tên là hai dòng giống hệt nhau, không phân biệt được.  #Huynh
 */
export function nhanTrongDanBai(
  muc: OutlineItem,
  templateType: AdminTemplateType,
  content: Record<string, unknown>
): string {
  const dungChung =
    TEMPLATE_OUTLINE[templateType].filter((m) => m.titleKey === muc.titleKey).length > 1;
  if (dungChung) return muc.label;
  return sectionTitles(content)[muc.titleKey] || muc.label;
}

/** Tên đầu mục đang hiện trên giấy — dùng làm dòng gộp cho các ô dùng chung một đầu mục. */
export function tenDauMucTrenGiay(
  titleKey: string,
  templateType: AdminTemplateType,
  content: Record<string, unknown>
): string {
  const rieng = sectionTitles(content)[titleKey];
  if (rieng) return rieng;
  const muc = TEMPLATE_OUTLINE[templateType].filter((m) => m.titleKey === titleKey);
  return muc.map((m) => m.label).join(" · ");
}

/**
 * Xoá chữ của một mục — KHÔNG phải tắt mục.
 *
 * Với ô riêng, xoá là để trống: mục vẫn nằm trong cấu trúc nhưng không hiện trên bản gửi
 * khách, để AI hoặc freelancer điền theo từng dự án. Với một điều khoản, xoá phần admin gõ
 * là quay về CHỮ MẶC ĐỊNH chứ không thành trống — điều đó luôn có chữ.  #Huynh
 */
export function xoaChuMuc(
  content: Record<string, unknown>,
  muc: OutlineItem
): Record<string, unknown> {
  if (muc.noiDung === "co_dinh") return content;
  if (muc.noiDung === "dieu") return ghiClauseText(content, muc.key, "");
  return xoaNoiDungMuc(content, muc.key);
}

/** Khớp `HIDDEN_SECTIONS_KEY` bên backend. */
export const HIDDEN_SECTIONS_KEY = "hidden_sections";

/**
 * Những khoá mô tả CẤU TRÚC tờ giấy do mẫu của admin quyết — một nguồn duy nhất.
 *
 * Bốn khoá này khác hẳn phần nội dung: chúng không phải chữ freelancer gõ, mà là quyết định
 * của admin đi theo tài liệu suốt đời nó (mục nào tắt, đầu mục tên gì, điều khoản viết sao,
 * có thêm mục tự soạn nào).
 *
 * Có danh sách này vì màn soạn báo giá lưu bằng cách DỰNG LẠI content từ các ô nhập rồi
 * `PATCH` đè TOÀN BỘ. Khoá nào không được gọi tên là biến mất im lặng ở lượt lưu đầu tiên —
 * cái bẫy đã cắn năm lần trước (`deliverables`, `payment_milestones`, `pricing_items`,
 * `standard_terms`, `revision_policy`, xem chú thích trong `ProposalModal.tsx`). Lần này chữa
 * bằng một danh sách chung thay vì thêm dòng thứ sáu, và có test khoá lại.  #Huynh
 */
export const KHOA_CAU_TRUC = [
  EXTRA_SECTIONS_KEY,
  SECTION_TITLES_KEY,
  CLAUSE_TEXTS_KEY,
  HIDDEN_SECTIONS_KEY,
] as const;

/**
 * Mang khoá cấu trúc từ bản trước sang bản sắp lưu.
 *
 * Chỉ chép khi bản sắp lưu CHƯA có khoá đó — người dùng sửa thật thì tôn trọng, còn hàm dựng
 * content bỏ sót thì vá. Không tự bịa giá trị: khoá nào bản trước cũng không có thì thôi.
 */
export function giuKhoaCauTruc<T extends Record<string, unknown>>(
  truoc: Record<string, unknown> | null | undefined,
  sau: T
): T {
  if (!truoc) return sau;
  const ra = { ...sau } as Record<string, unknown>;
  for (const khoa of KHOA_CAU_TRUC) {
    if (ra[khoa] === undefined && truoc[khoa] !== undefined) ra[khoa] = truoc[khoa];
  }
  return ra as T;
}

/**
 * Đầu mục TẦNG 3 — admin tắt được. Phải khớp `PROPOSAL_HIDEABLE` / `CONTRACT_HIDEABLE`.
 *
 * Backend vẫn lọc lại một lượt, nên lệch ở đây chỉ làm giao diện hiện sai công tắc chứ không
 * mở được cửa sau. Dù vậy có bài test khoá hai bên khớp nhau.
 */
export const HIDEABLE: Record<AdminTemplateType, ReadonlySet<string>> = {
  proposal: new Set(["project_overview", "additional_terms", "assumptions", "standard_terms"]),
  contract: new Set([
    "confidentiality",
    "termination_clause",
    "standard_terms",
    "custom_clauses",
  ]),
};

export function hiddenSections(content: Record<string, unknown>): string[] {
  const raw = content[HIDDEN_SECTIONS_KEY];
  return Array.isArray(raw) ? raw.map((x) => String(x)) : [];
}

export function dangTat(content: Record<string, unknown>, sectionKey: string): boolean {
  return hiddenSections(content).includes(sectionKey);
}

/**
 * Bật/tắt một ĐẦU MỤC (không phải một ô nội dung).
 *
 * Tắt ≠ xoá chữ. Tắt là quyết định mục đó không thuộc mẫu này, áp cho MỌI tài liệu sinh ra từ
 * nó; chữ bên trong vẫn còn nguyên, bật lại là thấy. Còn để trống chỉ có nghĩa "mẫu chưa soạn,
 * để AI hoặc freelancer điền" — hai chuyện khác hẳn nhau, nên phải có công tắc riêng chứ không
 * suy đoán từ việc rỗng hay không.  #Huynh
 */
export function batTatMuc(
  content: Record<string, unknown>,
  templateType: AdminTemplateType,
  sectionKey: string
): Record<string, unknown> {
  if (!HIDEABLE[templateType].has(sectionKey)) return content;

  const hienCo = hiddenSections(content);
  const sau = hienCo.includes(sectionKey)
    ? hienCo.filter((k) => k !== sectionKey)
    : [...hienCo, sectionKey];

  const ra = { ...content };
  if (sau.length === 0) delete ra[HIDDEN_SECTIONS_KEY];
  else ra[HIDDEN_SECTIONS_KEY] = sau;
  return ra;
}

/** Vì sao mục này không tắt được — hiện trong tooltip, để admin không phải đoán. */
export function lyDoKhoa(muc: OutlineItem, templateType: AdminTemplateType): string {
  if (muc.tang === 1) {
    return templateType === "contract"
      ? "Giữ cố định — thiếu mục này thì không còn là hợp đồng dịch vụ. Bạn vẫn sửa được chữ bên trong."
      : "Giữ cố định — thiếu mục này thì không còn là báo giá. Bạn vẫn sửa được chữ bên trong.";
  }
  return templateType === "contract"
    ? "Giữ cố định — đây là khung tối thiểu của một hợp đồng dịch vụ. Bạn vẫn sửa được chữ bên trong."
    : "Giữ cố định — phiếu đề tài định nghĩa báo giá đầy đủ gồm mục này. Bạn vẫn sửa được chữ bên trong.";
}
