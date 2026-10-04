import { describe, expect, it } from "vitest";
import {
  apDoiCauTruc,
  laOCauTruc,
  tinhDoiCauTruc,
} from "@/features/deals/structuredFieldEdit";

/**
 * Ô cấu trúc của báo giá/hợp đồng (tên đầu mục, chữ trong điều có sẵn, đầu mục tự soạn) không lưu
 * vào khoá cùng tên mà vào `section_titles` / `clause_texts` / `extra_sections` — đúng thứ bộ dựng
 * giấy đọc lại. Ghi thẳng `content["clause_party_a_duties"]` thì chữ sửa mất khi mở lại.
 */

describe("laOCauTruc", () => {
  it.each(["title_party_a_duties", "clause_dispute", "extra_title_0", "extra_body_3"])(
    "'%s' là ô cấu trúc",
    (field) => {
      expect(laOCauTruc(field)).toBe(true);
    }
  );

  it.each(["scope_of_work", "payment_terms", "valid_until", "standard_terms", "custom_clauses"])(
    "'%s' là ô nội dung thường",
    (field) => {
      expect(laOCauTruc(field)).toBe(false);
    }
  );
});

describe("tinhDoiCauTruc", () => {
  it("sửa chữ một điều dạng DANH SÁCH → clause_texts.<điều> là mảng các dòng", () => {
    const doi = tinhDoiCauTruc({}, "contract", "clause_party_a_duties", "Dòng 1\nDòng 2");

    expect(doi).toEqual({ clause_texts: { party_a_duties: ["Dòng 1", "Dòng 2"] } });
  });

  it("sửa chữ một điều dạng ĐOẠN VĂN → clause_texts.<điều> là chuỗi", () => {
    const doi = tinhDoiCauTruc({}, "contract", "clause_dispute", "Tranh chấp xử lý tại VIAC");

    expect(doi).toEqual({ clause_texts: { dispute: "Tranh chấp xử lý tại VIAC" } });
  });

  it("đổi tên đầu mục → section_titles.<mục>", () => {
    const doi = tinhDoiCauTruc({}, "contract", "title_party_a_duties", "Nghĩa vụ của bên A");

    expect(doi).toEqual({ section_titles: { party_a_duties: "Nghĩa vụ của bên A" } });
  });

  it("sửa đầu mục tự soạn → extra_sections đúng chỉ số", () => {
    const content = {
      extra_sections: [
        { title: "Quyền sử dụng", body: "Một năm." },
        { title: "Bảo hành", body: "30 ngày." },
      ],
    };

    expect(tinhDoiCauTruc(content, "proposal", "extra_body_1", "60 ngày.")).toEqual({
      extra_sections: [
        { title: "Quyền sử dụng", body: "Một năm." },
        { title: "Bảo hành", body: "60 ngày." },
      ],
    });
    expect(tinhDoiCauTruc(content, "proposal", "extra_title_0", "Quyền dùng ảnh")).toEqual({
      extra_sections: [
        { title: "Quyền dùng ảnh", body: "Một năm." },
        { title: "Bảo hành", body: "30 ngày." },
      ],
    });
  });

  it("GIỮ các điều đã sửa trước đó, chỉ thêm điều mới", () => {
    const content = { clause_texts: { dispute: "Chữ cũ", general: "Chung cũ" } };

    const doi = tinhDoiCauTruc(content, "contract", "clause_dispute", "Chữ mới");

    expect(doi).toEqual({ clause_texts: { dispute: "Chữ mới", general: "Chung cũ" } });
  });

  it("gõ lại đúng chữ đang có → không đổi gì", () => {
    const content = { clause_texts: { dispute: "Chữ cũ" }, section_titles: { term: "Hạn" } };

    expect(tinhDoiCauTruc(content, "contract", "clause_dispute", "Chữ cũ")).toEqual({});
    expect(tinhDoiCauTruc(content, "contract", "title_term", "Hạn")).toEqual({});
  });

  it("xoá trắng điều duy nhất đã sửa → khoá gom bị XOÁ (null), không để lại {}", () => {
    const content = { clause_texts: { dispute: "Chữ cũ" } };

    const doi = tinhDoiCauTruc(content, "contract", "clause_dispute", "   ");

    expect(doi).toEqual({ clause_texts: null });
  });

  it("xoá trắng một điều khi còn điều khác → chỉ rụng điều đó", () => {
    const content = { clause_texts: { dispute: "A", general: "B" } };

    expect(tinhDoiCauTruc(content, "contract", "clause_dispute", "")).toEqual({
      clause_texts: { general: "B" },
    });
  });

  it("chỉ báo khoá gom THỰC SỰ đổi, không kéo theo khoá khác", () => {
    const content = { section_titles: { term: "Hạn" }, clause_texts: { dispute: "A" } };

    const doi = tinhDoiCauTruc(content, "contract", "clause_dispute", "B");

    expect(Object.keys(doi)).toEqual(["clause_texts"]);
  });

  it("ô thường (scope_of_work...) không phải việc của hàm này → rỗng", () => {
    expect(tinhDoiCauTruc({}, "contract", "scope_of_work", "Phạm vi mới")).toEqual({});
  });

  it("đầu mục tự soạn không tồn tại → không đổi gì, không nổ", () => {
    expect(tinhDoiCauTruc({}, "proposal", "extra_body_5", "x")).toEqual({});
  });

  it("không sửa content đầu vào", () => {
    const content = { clause_texts: { dispute: "A" } };

    tinhDoiCauTruc(content, "contract", "clause_dispute", "B");

    expect(content).toEqual({ clause_texts: { dispute: "A" } });
  });
});

describe("apDoiCauTruc", () => {
  it("đặt khoá gom mới và giữ nguyên mọi khoá khác", () => {
    const content = { scope_of_work: "Phạm vi", parties: { client: { name: "A" } } };

    const sau = apDoiCauTruc(content, { clause_texts: { dispute: "VIAC" } });

    expect(sau).toEqual({
      scope_of_work: "Phạm vi",
      parties: { client: { name: "A" } },
      clause_texts: { dispute: "VIAC" },
    });
  });

  it("null thì bỏ hẳn khoá", () => {
    const sau = apDoiCauTruc({ clause_texts: { dispute: "A" }, scope_of_work: "x" }, {
      clause_texts: null,
    });

    expect(sau).toEqual({ scope_of_work: "x" });
    expect("clause_texts" in sau).toBe(false);
  });

  it("không nhắc tới khoá nào thì khoá đó đứng yên", () => {
    const sau = apDoiCauTruc({ section_titles: { term: "Hạn" } }, { clause_texts: { a: "b" } });

    expect(sau.section_titles).toEqual({ term: "Hạn" });
  });

  it("không sửa bản gốc", () => {
    const content = { clause_texts: { dispute: "A" } };

    apDoiCauTruc(content, { clause_texts: null });

    expect(content).toEqual({ clause_texts: { dispute: "A" } });
  });

  it("đi cùng tinhDoiCauTruc ra đúng content mà backend đọc", () => {
    const content = { scope_of_work: "x" };
    const doi = tinhDoiCauTruc(content, "contract", "clause_party_a_duties", "Một\nHai");

    expect(apDoiCauTruc(content, doi)).toEqual({
      scope_of_work: "x",
      clause_texts: { party_a_duties: ["Một", "Hai"] },
    });
  });
});
