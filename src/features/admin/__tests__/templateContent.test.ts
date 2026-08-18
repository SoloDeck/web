import { describe, expect, it } from "vitest";
import {
  MAX_EXTRA_SECTIONS,
  TEMPLATE_OUTLINE,
  docExtraField,
  docTitleField,
  docClauseField,
  clauseTexts,
  sectionTitles,
  extraSections,
  themDauMuc,
  xoaDauMuc,
  xoaNoiDungMuc,
  coChu,
  contentBanDau,
  ghiField,
  ghiValidDays,
  mucDaSoan,
  nhanTrongDanBai,
  tenDauMucTrenGiay,
  HIDDEN_SECTIONS_KEY,
  HIDEABLE,
  KHOA_CAU_TRUC,
  EXTRA_SECTIONS_KEY,
  SECTION_TITLES_KEY,
  CLAUSE_TEXTS_KEY,
  giuKhoaCauTruc,
  batTatMuc,
  daSoanMuc,
  dangTat,
  hiddenSections,
  lyDoKhoa,
  truongTrenGiay,
  xoaChuMuc,
} from "@/features/admin/templateContent";

/**
 * Luật về nội dung một mẫu tài liệu.
 *
 * Trước đây những bất biến này được kiểm gián tiếp qua form soạn mẫu (toàn `<textarea>`). Màn
 * soạn giờ là một tờ giấy trong iframe — jsdom không dựng hình nên không kiểm được từ ngoài,
 * mà bản thân các luật thì chẳng liên quan gì tới pixel. Nên chúng chuyển xuống đây, dưới dạng
 * hàm thuần, và được kiểm thẳng.  #Huynh
 */

const MAU_THAT = {
  content: {
    valid_days: 14,
    out_of_scope: ["Mua font bản quyền"],
    standard_terms: "Bàn giao file nguồn sau khi thanh toán đủ 100%.",
    revision_policy: "2 vòng chỉnh sửa miễn phí.",
  },
};

describe("contentBanDau — mở mẫu ra sửa", () => {
  it("sửa một mục KHÔNG làm mất hạn hiệu lực", () => {
    // `PATCH` thay TOÀN BỘ `content`. Trước đây form không dựng lại `valid_days` nên admin mở
    // mẫu ra sửa một dấu phẩy là con số 14 bay mất vĩnh viễn, toast vẫn báo thành công.
    const sau = ghiField(contentBanDau(MAU_THAT as never), "proposal", "standard_terms", "Chữ mới");
    expect(sau.valid_days).toBe(14);
    expect(sau.standard_terms).toBe("Chữ mới");
  });

  it("khoá LẠ hoàn toàn cũng được mang theo, không cần biết trước", () => {
    // Chặn tận gốc thay vì trông chờ nhớ hết tên khoá — cái bẫy đã cắn sáu lần.
    const sau = contentBanDau({
      content: { ...MAU_THAT.content, khoa_tuong_lai: { a: 1 } },
    } as never);
    expect(sau.khoa_tuong_lai).toEqual({ a: 1 });
  });

  it("mẫu CŨ chỉ có khoá body vẫn mở ra sửa được", () => {
    // Ba trong bốn mẫu đang có trong DB dùng khoá này.
    const sau = contentBanDau({ content: { body: "Đặt cọc 50%." } } as never);
    expect(sau.standard_terms).toBe("Đặt cọc 50%.");
    expect(sau).not.toHaveProperty("body");
  });

  it("mẫu mới ghi rõ standard_terms thì khoá cũ KHÔNG đè lên", () => {
    const sau = contentBanDau({
      content: { body: "Bản cũ", standard_terms: "Bản mới" },
    } as never);
    expect(sau.standard_terms).toBe("Bản mới");
    expect(sau).not.toHaveProperty("body");
  });

  it("body toàn khoảng trắng thì không sinh ra khoá rỗng", () => {
    expect(contentBanDau({ content: { body: "   " } } as never)).toEqual({});
  });

  it("mẫu chưa có gì thì bắt đầu từ rỗng", () => {
    expect(contentBanDau()).toEqual({});
  });
});

describe("ghiField — gõ lên tờ giấy", () => {
  it("phạm vi công việc của BÁO GIÁ thành MẢNG", () => {
    const sau = ghiField({}, "proposal", "scope_of_work", "Khảo sát\nPhác thảo");
    expect(sau.scope_of_work).toEqual(["Khảo sát", "Phác thảo"]);
  });

  it("phạm vi công việc của HỢP ĐỒNG thành CHUỖI", () => {
    // Cùng một tên khoá, hai kiểu dữ liệu: tờ báo giá render <ul> gạch đầu dòng, Điều 1 của
    // hợp đồng render một đoạn văn. Gửi nhầm kiểu là in mảng vào chỗ chờ chuỗi.
    const sau = ghiField({}, "contract", "scope_of_work", "Thiết kế và bàn giao.");
    expect(sau.scope_of_work).toBe("Thiết kế và bàn giao.");
  });

  it("dòng trắng giữa danh sách bị bỏ, không đẻ ra gạch đầu dòng rỗng", () => {
    const sau = ghiField({}, "proposal", "out_of_scope", "Mua font\n\n  \nChi phí in ấn");
    expect(sau.out_of_scope).toEqual(["Mua font", "Chi phí in ấn"]);
  });

  it("xoá trắng một mục thì BỎ HẲN khoá, không ghi chuỗi rỗng", () => {
    // Khoá rỗng và khoá vắng mặt ra hai kết quả khác nhau trên giấy: một bên hiện mục trống,
    // một bên mục biến mất. Bộ đếm "đã soạn mấy mục" cũng đọc theo đó.
    const sau = ghiField({ timeline: "4 tuần" }, "proposal", "timeline", "   ");
    expect(sau).not.toHaveProperty("timeline");
  });

  it("không đụng tới các mục khác", () => {
    const sau = ghiField(
      { project_overview: "Giữ nguyên", valid_days: 14 },
      "proposal",
      "timeline",
      "4 tuần"
    );
    expect(sau.project_overview).toBe("Giữ nguyên");
    expect(sau.valid_days).toBe(14);
  });
});

describe("ghiValidDays", () => {
  it("nhận số ngày hợp lệ", () => {
    expect(ghiValidDays({}, "30").valid_days).toBe(30);
  });

  it("xoá trắng thì bỏ khoá, KHÔNG ghi 0", () => {
    expect(ghiValidDays({ valid_days: 14 }, "")).not.toHaveProperty("valid_days");
  });

  it("số âm hoặc rác cũng bỏ khoá", () => {
    expect(ghiValidDays({ valid_days: 14 }, "-5")).not.toHaveProperty("valid_days");
    expect(ghiValidDays({ valid_days: 14 }, "abc")).not.toHaveProperty("valid_days");
  });
});

describe("dàn bài", () => {
  it("đếm đúng số mục PHẦN THÂN đã soạn", () => {
    const content = { project_overview: "A", timeline: "B", standard_terms: "Điều khoản" };
    expect(mucDaSoan(content, "proposal", "than")).toEqual([
      "Tổng quan dự án",
      "Thời gian thực hiện",
    ]);
  });

  it("mẫu thuần điều khoản thì phần thân RỖNG", () => {
    // Đúng hình dạng hai mẫu đang nằm trong DB thật.
    const content = { out_of_scope: ["Mua font"], standard_terms: "x", revision_policy: "y" };
    expect(mucDaSoan(content, "proposal", "than")).toEqual([]);
    expect(mucDaSoan(content, "proposal", "dieu_khoan")).toHaveLength(3);
  });

  it("hợp đồng có bộ mục khác hẳn báo giá", () => {
    const cuaBaoGia = TEMPLATE_OUTLINE.proposal.map((m) => m.key);
    const cuaHopDong = TEMPLATE_OUTLINE.contract.map((m) => m.key);
    expect(cuaBaoGia).toContain("deliverables");
    expect(cuaHopDong).not.toContain("deliverables");
    expect(cuaHopDong).toContain("ip_ownership");
  });

  it("mảng rỗng KHÔNG tính là đã soạn", () => {
    expect(coChu([])).toBe(false);
    expect(coChu(["", "   "])).toBe(false);
    expect(coChu(["A"])).toBe(true);
  });
});

/**
 * Thêm / xoá đầu mục.
 *
 * Bộ mục cứng của tờ giấy không phủ hết mọi nghề: nhiếp ảnh cần "Quyền sử dụng hình ảnh", dịch
 * thuật cần "Quy tắc thuật ngữ". Tên mục nằm trong dữ liệu chứ không trong template.  #Huynh
 */
describe("đầu mục tự soạn", () => {
  it("thêm mục mới KHÔNG đặt sẵn tên", () => {
    // Chữ mồi trong code mà admin quên đổi là đi thẳng vào tờ giấy gửi khách.
    const sau = themDauMuc({});
    expect(extraSections(sau)).toEqual([{ title: "", body: "" }]);
  });

  it("gõ tên và nội dung trên giấy thì vào đúng mục", () => {
    let content = themDauMuc(themDauMuc({}));
    content = ghiField(content, "proposal", "extra_title_1", "Quyền sử dụng hình ảnh");
    content = ghiField(content, "proposal", "extra_body_1", "Bên B được dùng cho thương mại.");

    expect(extraSections(content)[0]).toEqual({ title: "", body: "" });
    expect(extraSections(content)[1]).toEqual({
      title: "Quyền sử dụng hình ảnh",
      body: "Bên B được dùng cho thương mại.",
    });
  });

  it("xoá đúng mục được chọn, không lệch chỉ số", () => {
    let content = themDauMuc(themDauMuc(themDauMuc({})));
    content = ghiField(content, "proposal", "extra_title_0", "A");
    content = ghiField(content, "proposal", "extra_title_1", "B");
    content = ghiField(content, "proposal", "extra_title_2", "C");

    const sau = xoaDauMuc(content, 1);
    expect(extraSections(sau).map((m) => m.title)).toEqual(["A", "C"]);
  });

  it("xoá mục cuối cùng thì bỏ hẳn khoá, không để mảng rỗng", () => {
    const sau = xoaDauMuc(themDauMuc({}), 0);
    expect(sau).not.toHaveProperty("extra_sections");
  });

  it("không thêm quá trần — mẫu này in vào MỌI tờ giấy gửi khách", () => {
    let content: Record<string, unknown> = {};
    for (let i = 0; i < MAX_EXTRA_SECTIONS + 5; i += 1) content = themDauMuc(content);
    expect(extraSections(content)).toHaveLength(MAX_EXTRA_SECTIONS);
  });

  it("ô có chỉ số lạ thì bỏ qua chứ không nổ", () => {
    const content = themDauMuc({});
    expect(ghiField(content, "proposal", "extra_title_9", "lạc")).toBe(content);
    expect(docExtraField("standard_terms")).toBeNull();
    expect(docExtraField("extra_title_2")).toEqual({ loai: "title", index: 2 });
  });

  it("xoá nội dung một mục CỨNG = bỏ khoá, mục đó biến khỏi bản gửi khách", () => {
    const sau = xoaNoiDungMuc({ timeline: "4 tuần", project_overview: "A" }, "timeline");
    expect(sau).not.toHaveProperty("timeline");
    expect(sau.project_overview).toBe("A");
  });
});

/**
 * Đổi TÊN đầu mục có sẵn.
 *
 * Tên mục trước đây viết cứng trong hai file Jinja nên admin sửa được nội dung mà không sửa được
 * tên — trong khi cách gọi tên lại là thứ khác nhau nhiều nhất giữa các nghề.  #Huynh
 */
describe("đổi tên đầu mục có sẵn", () => {
  it("gõ vào tiêu đề trên giấy thì ghi vào section_titles", () => {
    const sau = ghiField({}, "proposal", "title_deliverables", "Hạng mục nghiệm thu");
    expect(sectionTitles(sau)).toEqual({ deliverables: "Hạng mục nghiệm thu" });
  });

  it("đổi tên KHÔNG tính là đã soạn nội dung mục đó", () => {
    // Hai chuyện khác hẳn nhau: đặt lại tên cái ngăn, và bỏ đồ vào ngăn.
    const sau = ghiField({}, "proposal", "title_deliverables", "Hạng mục nghiệm thu");
    expect(mucDaSoan(sau, "proposal", "than")).toEqual([]);
  });

  it("gõ trắng thì trả về tên mặc định", () => {
    let content = ghiField({}, "proposal", "title_timeline", "Lịch chạy việc");
    content = ghiField(content, "proposal", "title_timeline", "   ");
    expect(content).not.toHaveProperty("section_titles");
  });

  it("đổi tên mục này không đụng tên mục khác", () => {
    let content = ghiField({}, "proposal", "title_timeline", "Lịch chạy việc");
    content = ghiField(content, "proposal", "title_deliverables", "Hạng mục nghiệm thu");
    expect(sectionTitles(content)).toEqual({
      timeline: "Lịch chạy việc",
      deliverables: "Hạng mục nghiệm thu",
    });
  });

  it("phân biệt được ô tiêu đề với ô nội dung cùng tên khoá", () => {
    // `timeline` vừa là tên một mục vừa là khoá nội dung — nhầm là gõ tên đè lên nội dung.
    let content = ghiField({}, "proposal", "timeline", "4 tuần");
    content = ghiField(content, "proposal", "title_timeline", "Lịch chạy việc");
    expect(content.timeline).toBe("4 tuần");
    expect(sectionTitles(content).timeline).toBe("Lịch chạy việc");
  });

  it("tên ô lạ thì không nhận nhầm là tiêu đề", () => {
    expect(docTitleField("title_deliverables")).toBe("deliverables");
    expect(docTitleField("extra_title_0")).toBeNull();
    expect(docTitleField("standard_terms")).toBeNull();
  });
});

/**
 * Sửa CHỮ trong các điều có sẵn.
 *
 * Trước đây admin đổi được TÊN điều mà không đổi được một chữ nào bên trong — bấm vào tiêu đề
 * thì sửa được, bấm vào đoạn ngay dưới thì không.  #Huynh
 */
describe("chữ trong điều có sẵn", () => {
  it("gõ vào một điều thì ghi vào clause_texts", () => {
    const sau = ghiField({}, "contract", "clause_confidentiality", "Hai Bên giữ kín vĩnh viễn.");
    expect(clauseTexts(sau)).toEqual({ confidentiality: "Hai Bên giữ kín vĩnh viễn." });
  });

  it("điều dạng DANH SÁCH tách thành mảng gạch đầu dòng", () => {
    const sau = ghiField({}, "contract", "clause_party_a_duties", "Nghĩa vụ A\nNghĩa vụ B");
    expect(clauseTexts(sau).party_a_duties).toEqual(["Nghĩa vụ A", "Nghĩa vụ B"]);
  });

  it("điều dạng ĐOẠN VĂN giữ nguyên chuỗi, không tách dòng", () => {
    const sau = ghiField({}, "contract", "clause_general", "Dòng 1\nDòng 2");
    expect(clauseTexts(sau).general).toBe("Dòng 1\nDòng 2");
  });

  it("gõ trắng thì quay về bản mặc định", () => {
    let content = ghiField({}, "contract", "clause_dispute", "Ra trọng tài.");
    content = ghiField(content, "contract", "clause_dispute", "   ");
    expect(content).not.toHaveProperty("clause_texts");
  });

  it("sửa điều này không đụng điều khác", () => {
    let content = ghiField({}, "contract", "clause_dispute", "Ra trọng tài.");
    content = ghiField(content, "contract", "clause_general", "Lập 03 bản.");
    expect(clauseTexts(content)).toEqual({
      dispute: "Ra trọng tài.",
      general: "Lập 03 bản.",
    });
  });

  it("KHÔNG lẫn với khoá nội dung hay tiêu đề cùng tên", () => {
    // `ip_ownership` vừa là khoá nội dung vừa là tên một điều — ba ô khác nhau, ba chỗ lưu.
    let content = ghiField({}, "contract", "ip_ownership", "Nội dung điều");
    content = ghiField(content, "contract", "title_ip_ownership", "Bản quyền");
    content = ghiField(content, "contract", "clause_confidentiality", "Chữ bảo mật");

    expect(content.ip_ownership).toBe("Nội dung điều");
    expect(sectionTitles(content).ip_ownership).toBe("Bản quyền");
    expect(clauseTexts(content).confidentiality).toBe("Chữ bảo mật");
  });

  it("tên ô lạ thì không nhận nhầm", () => {
    expect(docClauseField("clause_general")).toBe("general");
    expect(docClauseField("standard_terms")).toBeNull();
    expect(docClauseField("title_general")).toBeNull();
  });
});

/**
 * Dàn bài bên trái phải ĐỔI THEO khi admin đổi tên đầu mục trên giấy.
 *
 * Lỗi đã báo: sửa tên trên giấy được, mà cột trái đứng im — vì dàn bài liệt kê Ô NỘI DUNG còn
 * tên lại lưu ở `section_titles`, hai bộ không nối với nhau.  #Huynh
 */
describe("dàn bài đọc tên đã đổi", () => {
  function tim(key: string, type: "proposal" | "contract" = "proposal") {
    return TEMPLATE_OUTLINE[type].find((m) => m.key === key)!;
  }

  it("đầu mục chỉ có MỘT ô thì nhãn đổi theo tên mới", () => {
    const content = ghiField({}, "proposal", "title_assumptions", "Lưu ý khi triển khai");
    expect(nhanTrongDanBai(tim("assumptions"), "proposal", content)).toBe("Lưu ý khi triển khai");
  });

  it("chưa đổi tên thì giữ nhãn mặc định", () => {
    expect(nhanTrongDanBai(tim("assumptions"), "proposal", {})).toBe("Ghi chú và giả định");
  });

  it("đầu mục có NHIỀU ô thì giữ nhãn từng ô, không thay cả hai thành một tên", () => {
    // "Ngoài phạm vi" và "Chính sách chỉnh sửa" cùng nằm dưới "Điều Khoản Bổ Sung" — thay cả
    // hai là ra hai dòng giống hệt nhau, không phân biệt được.
    const content = ghiField({}, "proposal", "title_additional_terms", "Ràng buộc thêm");
    expect(nhanTrongDanBai(tim("out_of_scope"), "proposal", content)).toBe("Ngoài phạm vi");
    expect(nhanTrongDanBai(tim("revision_policy"), "proposal", content)).toBe(
      "Chính sách chỉnh sửa"
    );
    // ...nhưng dòng gộp phía trên thì phải đổi, để đổi tên KHÔNG bị mất hút.
    expect(tenDauMucTrenGiay("additional_terms", "proposal", content)).toBe("Ràng buộc thêm");
  });

  it("dòng gộp chưa đổi tên thì ghép nhãn các ô con", () => {
    expect(tenDauMucTrenGiay("additional_terms", "proposal", {})).toBe(
      "Ngoài phạm vi · Chính sách chỉnh sửa"
    );
  });

  it("đầu mục Chi phí chứa hai dòng, đổi tên thì DÒNG GỘP đổi chứ không phải từng dòng", () => {
    // Bảng giá do freelancer nhập theo dự án, mẫu chỉ soạn được điều khoản thanh toán — hai
    // dòng cùng một đầu mục. Thay nhãn cả hai thành "Bảng giá" là hai dòng giống hệt nhau.
    const content = ghiField({}, "proposal", "title_pricing", "Bảng giá");
    expect(tenDauMucTrenGiay("pricing", "proposal", content)).toBe("Bảng giá");
    expect(nhanTrongDanBai(tim("payment_terms"), "proposal", content)).toBe(
      "Điều khoản thanh toán"
    );
  });

  it("hợp đồng cũng có một Điều chứa hai ô", () => {
    const content = ghiField({}, "contract", "title_termination_clause", "Kết thúc hợp tác");
    expect(nhanTrongDanBai(tim("termination_clause", "contract"), "contract", content)).toBe(
      "Sửa đổi và chấm dứt"
    );
    expect(tenDauMucTrenGiay("termination_clause", "contract", content)).toBe("Kết thúc hợp tác");
  });

  it("mọi ô đều khai titleKey — thiếu là dàn bài đứng im, im lặng", () => {
    for (const type of ["proposal", "contract"] as const) {
      for (const muc of TEMPLATE_OUTLINE[type]) {
        expect(muc.titleKey, `${type}/${muc.key}`).toBeTruthy();
      }
    }
  });
});

/**
 * BA TẦNG quyền sửa. Phải khớp `PROPOSAL_HIDEABLE` / `CONTRACT_HIDEABLE` bên backend —
 * `tests/unit/shared/test_template_blocks.py::TestBaTangQuyenSua` giữ đầu kia.
 *
 * Backend vẫn lọc lại một lượt nên lệch ở đây không mở được cửa sau, nhưng lệch là giao diện
 * nói dối: hiện công tắc cho mục backend sẽ bỏ qua, hoặc giấu công tắc của mục tắt được.
 */
describe("ba tầng quyền sửa", () => {
  const LOAI = ["proposal", "contract"] as const;

  it("mỗi ô đều khai tầng, và tầng 3 đúng bằng tập tắt được", () => {
    for (const type of LOAI) {
      for (const muc of TEMPLATE_OUTLINE[type]) {
        expect([1, 2, 3], `${type}/${muc.key}`).toContain(muc.tang);
        expect(muc.tang === 3, `${type}/${muc.key}`).toBe(HIDEABLE[type].has(muc.titleKey));
      }
    }
  });

  it("tập tắt được đúng bằng danh sách backend", () => {
    // Chép tay từ `PROPOSAL_HIDEABLE` / `CONTRACT_HIDEABLE`. Đổi một bên mà quên bên kia thì
    // bài này đỏ — đó là mục đích duy nhất của nó.
    expect([...HIDEABLE.proposal].sort()).toEqual([
      "additional_terms",
      "assumptions",
      "project_overview",
      "standard_terms",
    ]);
    expect([...HIDEABLE.contract].sort()).toEqual([
      "confidentiality",
      "custom_clauses",
      "standard_terms",
      "termination_clause",
    ]);
  });

  it("mục TIỀN và danh tính hai bên không nằm trong tập tắt được", () => {
    for (const khoa of ["pricing", "payment", "party_a", "party_b", "confirmation"]) {
      expect(HIDEABLE.proposal.has(khoa), khoa).toBe(false);
      expect(HIDEABLE.contract.has(khoa), khoa).toBe(false);
    }
  });

  it("năm mục Phiếu đề tài liệt kê cho báo giá đều là tầng 2, không có công tắc", () => {
    // "phạm vi công việc, sản phẩm bàn giao, tiến độ, giá, điều khoản thanh toán" — giá nằm ở
    // đầu mục Chi phí (tầng 1), bốn thứ còn lại là tầng 2.
    for (const khoa of ["scope_of_work", "deliverables", "timeline", "payment_terms"]) {
      const muc = TEMPLATE_OUTLINE.proposal.find((m) => m.key === khoa)!;
      expect(muc.tang, khoa).toBe(2);
      expect(HIDEABLE.proposal.has(muc.titleKey), khoa).toBe(false);
    }
  });

  it("bật/tắt ghi đúng khoá hidden_sections", () => {
    const tat = batTatMuc({}, "contract", "confidentiality");
    expect(hiddenSections(tat)).toEqual(["confidentiality"]);
    expect(dangTat(tat, "confidentiality")).toBe(true);
  });

  it("bật lại hết thì BỎ HẲN khoá, không để mảng rỗng", () => {
    // Mảng rỗng vẫn là một khoá trong `content`, và `content` rỗng-hay-không là điều kiện của
    // nút Lưu. Để lại mảng rỗng là một mẫu trắng trơn vẫn lưu được.
    const tat = batTatMuc({}, "proposal", "standard_terms");
    const bat = batTatMuc(tat, "proposal", "standard_terms");
    expect(HIDDEN_SECTIONS_KEY in bat).toBe(false);
  });

  it("tắt nhiều mục thì giữ đủ, tắt cái này không xoá cái kia", () => {
    let content: Record<string, unknown> = {};
    for (const khoa of ["confidentiality", "standard_terms", "custom_clauses"]) {
      content = batTatMuc(content, "contract", khoa);
    }
    expect(hiddenSections(content).sort()).toEqual([
      "confidentiality",
      "custom_clauses",
      "standard_terms",
    ]);
  });

  it("gọi tắt một mục KHÔNG thuộc tầng 3 thì không đổi gì", () => {
    const content = { scope_of_work: "x" };
    expect(batTatMuc(content, "proposal", "pricing")).toBe(content);
    expect(batTatMuc(content, "contract", "ip_ownership")).toBe(content);
  });

  it("tắt mục KHÔNG đụng tới chữ bên trong — bật lại là thấy nguyên", () => {
    // Đây là chỗ phân biệt "tắt" với "xoá chữ": tắt là quyết định về CẤU TRÚC mẫu.
    const co = { standard_terms: "Bàn giao file nguồn sau khi thanh toán đủ." };
    const tat = batTatMuc(co, "proposal", "standard_terms");
    expect(tat.standard_terms).toBe(co.standard_terms);
  });

  it("mọi tầng đều nêu được lý do khoá, không để trống", () => {
    for (const type of LOAI) {
      for (const muc of TEMPLATE_OUTLINE[type].filter((m) => m.tang !== 3)) {
        expect(lyDoKhoa(muc, type).length, `${type}/${muc.key}`).toBeGreaterThan(20);
      }
    }
  });
});

describe("dàn bài phản ánh đúng tờ giấy", () => {
  it("liệt kê cả đầu mục KHÔNG có ô nội dung", () => {
    // Thiếu chúng thì admin nhìn dàn bài tưởng tờ báo giá chỉ có bấy nhiêu mục, và không hiểu
    // vì sao có thứ mình không đụng vào được — đúng câu hỏi đã bị hỏi.
    const khoa = TEMPLATE_OUTLINE.proposal.map((m) => m.key);
    expect(khoa).toContain("party_a");
    expect(khoa).toContain("party_b");
    expect(khoa).toContain("confirmation");
    expect(TEMPLATE_OUTLINE.contract.map((m) => m.key)).toContain("confidentiality");
  });

  it("mục cố định thì không bao giờ tính là đã soạn", () => {
    const muc = TEMPLATE_OUTLINE.proposal.find((m) => m.key === "party_a")!;
    expect(daSoanMuc({ party_a: "cố nhét vào" }, muc)).toBe(false);
  });

  it("điều khoản tính đã soạn theo clause_texts, không theo ô cùng tên", () => {
    const muc = TEMPLATE_OUTLINE.contract.find((m) => m.key === "confidentiality")!;
    expect(daSoanMuc({}, muc)).toBe(false);
    expect(daSoanMuc({ clause_texts: { confidentiality: "Chữ riêng" } }, muc)).toBe(true);
  });

  it("mỗi loại nội dung nhảy tới đúng data-field trên giấy", () => {
    const tim2 = (key: string, type: "proposal" | "contract" = "proposal") =>
      TEMPLATE_OUTLINE[type].find((m) => m.key === key)!;
    expect(truongTrenGiay(tim2("scope_of_work"))).toBe("scope_of_work");
    expect(truongTrenGiay(tim2("confidentiality", "contract"))).toBe("clause_confidentiality");
    expect(truongTrenGiay(tim2("party_a"))).toBe("title_party_a");
  });

  it("xoá chữ một ĐIỀU là trả về mặc định, không phải để trống", () => {
    const muc = TEMPLATE_OUTLINE.contract.find((m) => m.key === "term")!;
    const sau = xoaChuMuc({ clause_texts: { term: "Chữ riêng" } }, muc);
    expect("clause_texts" in sau).toBe(false);
  });

  it("xoá chữ một Ô là bỏ hẳn khoá đó", () => {
    const muc = TEMPLATE_OUTLINE.proposal.find((m) => m.key === "assumptions")!;
    expect(xoaChuMuc({ assumptions: "x", timeline: "y" }, muc)).toEqual({ timeline: "y" });
  });
});

/**
 * Khoá CẤU TRÚC phải sống sót qua một lượt lưu của freelancer.
 *
 * Màn soạn báo giá dựng lại content từ các ô nhập rồi `PATCH` đè TOÀN BỘ, nên khoá nào không
 * được gọi tên là biến mất im lặng. Đã cắn sáu lần; bộ này là cái chốt để không có lần bảy.
 */
describe("giữ khoá cấu trúc qua lượt lưu", () => {
  it("phủ đúng bốn khoá cấu trúc đang có", () => {
    expect([...KHOA_CAU_TRUC].sort()).toEqual([
      "clause_texts",
      "extra_sections",
      "hidden_sections",
      "section_titles",
    ]);
  });

  it("mọi hằng số khoá cấu trúc đều có mặt trong danh sách", () => {
    // Thêm khoá thứ năm mà quên khai là bài này đỏ — đó là toàn bộ lý do nó tồn tại.
    for (const khoa of [
      EXTRA_SECTIONS_KEY,
      SECTION_TITLES_KEY,
      CLAUSE_TEXTS_KEY,
      HIDDEN_SECTIONS_KEY,
    ]) {
      expect(KHOA_CAU_TRUC, khoa).toContain(khoa);
    }
  });

  it("mang đủ bốn khoá từ bản trước sang bản sắp lưu", () => {
    const truoc = {
      hidden_sections: ["assumptions"],
      section_titles: { deliverables: "Sản phẩm giao cho khách" },
      clause_texts: { standard_terms: "Chữ riêng" },
      extra_sections: [{ title: "Quyền hình ảnh", body: "1 năm" }],
    };
    expect(giuKhoaCauTruc(truoc, { project_overview: "x" })).toEqual({
      project_overview: "x",
      ...truoc,
    });
  });

  it("KHÔNG đè lên giá trị bản sắp lưu đã có", () => {
    // Người dùng sửa thật thì tôn trọng; hàm này chỉ vá chỗ bị bỏ sót.
    const sau = giuKhoaCauTruc(
      { hidden_sections: ["assumptions"] },
      { hidden_sections: ["standard_terms"] }
    );
    expect(sau.hidden_sections).toEqual(["standard_terms"]);
  });

  it("không tự bịa khoá khi bản trước cũng không có", () => {
    expect(giuKhoaCauTruc({}, { project_overview: "x" })).toEqual({ project_overview: "x" });
    expect(giuKhoaCauTruc(null, { project_overview: "x" })).toEqual({ project_overview: "x" });
  });

  it("giữ được mảng rỗng — 'admin xoá hết mục tự soạn' khác 'chưa từng có'", () => {
    const sau: Record<string, unknown> = giuKhoaCauTruc(
      { extra_sections: [] },
      { project_overview: "x" }
    );
    expect(sau.extra_sections).toEqual([]);
  });
});
