import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  attachInlineEdit,
  formatVnDate,
  injectPreviewPageStyle,
  parseVnDate,
  readField,
} from "./inlineEditPreview";

/**
 * jsdom KHÔNG có `innerText` (cũng không có `contentEditable` lẫn `execCommand`) — nó không
 * dựng hình nên không biết "chữ nhìn thấy" là gì. Code thật chạy trong trình duyệt phải đi
 * đường `innerText`, nên ở đây ta vá một bản tối giản để test đi ĐÚNG nhánh đó thay vì lặng
 * lẽ rơi xuống `textContent`.  #Huynh
 */
beforeAll(() => {
  // Bản vá phải BÁM SÁT trình duyệt, không được lấy đại `textContent`: `innerText` chỉ tính
  // thứ ĐƯỢC DỰNG HÌNH, nên nội dung <script>/<style> không được tính vào. Lấy `textContent`
  // là bản vá dễ dãi hơn thực tế -> test xanh sai, hoặc đỏ sai như lần đầu tôi viết nó.
  const rendered = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.nodeName.toLowerCase();
    if (tag === "script" || tag === "style") return "";
    return Array.from(node.childNodes).map(rendered).join("");
  };

  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get(this: HTMLElement) {
      return rendered(this).replace(/[ \t]+/g, " ");
    },
  });
});

function el(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe("readField", () => {
  it("ô chữ: trả về chữ đã cắt khoảng trắng thừa của template", () => {
    // Template Jinja xuống dòng + thụt lề quanh biến, nên chuỗi thô luôn dính rác hai đầu.
    const node = el('<p data-field="project_overview">\n    Làm web bán cà phê.\n  </p>');
    expect(readField(node)).toBe("Làm web bán cà phê.");
  });

  it("danh sách: mỗi <li> thành một dòng", () => {
    const node = el(
      '<ul data-field="scope_of_work" data-kind="list"><li>Dựng hệ thống</li><li>Triển khai</li></ul>'
    );
    expect(readField(node)).toBe("Dựng hệ thống\nTriển khai");
  });

  it("danh sách: bỏ mục rỗng", () => {
    const node = el(
      '<ul data-field="deliverables" data-kind="list"><li>Bản chạy được</li><li></li><li>  </li></ul>'
    );
    expect(readField(node)).toBe("Bản chạy được");
  });

  it("LỘT SẠCH HTML — đây là chỗ chặn XSS, không phải lúc dán", () => {
    // Dán một đoạn từ web lạ vào là DOM dính đủ thứ. Nếu chỗ này trả HTML ra thì cục đó sẽ
    // được LƯU, rồi render lại trong trình duyệt của KHÁCH qua link chia sẻ — stored XSS.
    // Chỉ bóc chữ nên mọi thẻ đều rụng tại đây.
    const node = el(
      '<ul data-field="scope_of_work" data-kind="list">' +
        '<li><b>Đậm</b> và <i>nghiêng</i><script>alert(1)</script></li>' +
        '<li><img src=x onerror="alert(2)">Có ảnh</li>' +
        "</ul>"
    );
    const value = readField(node);
    expect(value).not.toMatch(/</);
    expect(value).not.toMatch(/script|onerror/i);
    expect(value).toBe("Đậm và nghiêng\nCó ảnh");
  });

  it("danh sách bị xoá sạch <li>: vẫn vớt được chữ trần", () => {
    // Bôi đen cả danh sách rồi Ctrl+A + Delete + gõ lại — trình duyệt có thể dọn hết <li>.
    const node = el('<ul data-field="deliverables" data-kind="list">Một\nHai</ul>');
    expect(readField(node)).toBe("Một\nHai");
  });
});

describe("parseVnDate", () => {
  it.each([
    ["24/07/2026", "2026-07-24"],
    ["4/8/2026", "2026-08-04"], // gõ tắt cũng nhận
    ["24-07-2026", "2026-07-24"],
    ["24.07.2026", "2026-07-24"],
    ["  24/07/2026  ", "2026-07-24"],
  ])("đọc %s thành %s", (raw, iso) => {
    expect(parseVnDate(raw)).toBe(iso);
  });

  it("07/04/2026 là mùng 7 tháng 4 — KHÔNG đoán theo kiểu Mỹ", () => {
    // Đoán mò chỗ này là sai lệch cả tháng, mà hạn hiệu lực thì không có chỗ cho đoán.
    expect(parseVnDate("07/04/2026")).toBe("2026-04-07");
  });

  it.each(["31/02/2026", "31/04/2026", "32/01/2026", "01/13/2026"])(
    "%s không tồn tại thì trả null chứ không trôi sang tháng sau",
    (raw) => {
      // `new Date(2026, 1, 31)` tự trôi thành 03/03 chứ không báo lỗi — nhận bừa là tờ báo
      // giá ghi một ngày khác hẳn thứ người dùng gõ.
      expect(parseVnDate(raw)).toBeNull();
    }
  );

  it.each(["", "cuối tháng 8 nhé", "24/07", "2026-07-24", "hôm nào đó"])(
    "%s vô nghĩa thì trả null",
    (raw) => {
      expect(parseVnDate(raw)).toBeNull();
    }
  );

  it("đi vòng tròn không mất mát", () => {
    expect(formatVnDate(parseVnDate("4/8/2026")!)).toBe("04/08/2026");
  });
});

describe("attachInlineEdit", () => {
  function makeDoc(body: string): Document {
    const doc = document.implementation.createHTMLDocument("bao gia");
    doc.body.innerHTML = body;
    return doc;
  }

  it("bật sửa tại chỗ và báo giá trị mới khi rời khỏi ô", () => {
    const doc = makeDoc('<p data-field="payment_terms" data-label="Thanh toán">Cọc 50%.</p>');
    const onChange = vi.fn();
    attachInlineEdit(doc, onChange);

    const node = doc.querySelector<HTMLElement>("[data-field]")!;
    expect(node.contentEditable).toBe("plaintext-only");

    node.textContent = "Cọc 30%, còn lại khi bàn giao.";
    node.dispatchEvent(new Event("blur"));

    expect(onChange).toHaveBeenCalledWith("payment_terms", "Cọc 30%, còn lại khi bàn giao.");
  });

  it("danh sách để contentEditable=true để Enter đẻ ra gạch đầu dòng mới", () => {
    // `plaintext-only` sẽ giết mất hành vi này — Enter chỉ xuống dòng chứ không tạo <li>.
    const doc = makeDoc('<ul data-field="scope_of_work" data-kind="list"><li>A</li></ul>');
    attachInlineEdit(doc, vi.fn());
    expect(doc.querySelector<HTMLElement>("[data-field]")!.contentEditable).toBe("true");
  });

  it("sửa hạn hiệu lực: gõ kiểu Việt, lưu xuống kiểu máy tính được", () => {
    const doc = makeDoc(
      '<span data-field="valid_until" data-kind="date" data-label="Hiệu lực đến">21/07/2026</span>'
    );
    const onChange = vi.fn();
    attachInlineEdit(doc, onChange);

    const node = doc.querySelector<HTMLElement>("[data-field]")!;
    node.textContent = "4/8/2026";
    node.dispatchEvent(new Event("blur"));

    // Backend phải TÍNH được ngày này (so với hôm nay để biết hết hạn chưa), nên chỉ chữ
    // thôi là chưa đủ — phải ra ISO.
    expect(onChange).toHaveBeenCalledWith("valid_until", "2026-08-04");
    // Và hiện lại đúng kiểu tờ giấy in ra.
    expect(node.textContent).toBe("04/08/2026");
  });

  it("gõ ngày bậy thì HOÀN TÁC, không lưu chữ vô nghĩa", () => {
    const doc = makeDoc(
      '<span data-field="valid_until" data-kind="date" data-label="Hiệu lực đến">21/07/2026</span>'
    );
    const onChange = vi.fn();
    const onInvalid = vi.fn();
    attachInlineEdit(doc, onChange, onInvalid);

    const node = doc.querySelector<HTMLElement>("[data-field]")!;
    node.textContent = "cuối tháng 8 nhé";
    node.dispatchEvent(new Event("blur"));

    // Lưu "cuối tháng 8 nhé" là tờ giấy có chữ mà hệ thống mù — hạn hiệu lực thành vô nghĩa.
    expect(onChange).not.toHaveBeenCalled();
    expect(node.textContent).toBe("21/07/2026");
    expect(onInvalid).toHaveBeenCalledWith("Hiệu lực đến");
  });

  it("dựng bản xem trước thành tờ A4 đúng khổ của PDF", () => {
    const doc = makeDoc('<p data-field="assumptions" data-label="Ghi chú">x</p>');
    attachInlineEdit(doc, vi.fn());
    const css = doc.getElementById("se-inline-edit-style")!.textContent!;

    // Template có `@page { size: A4; margin: 2cm }`, nhưng thứ đó CHỈ chi phối lúc WeasyPrint
    // in PDF — trình duyệt không có khái niệm "trang giấy" nên <body> giãn hết bề ngang
    // khung. Khung càng rộng thì chữ càng trải dài và bản xem trước càng khác bản khách
    // nhận. Hai con số này phải khớp `@page` thì cột chữ mới ra đúng 17cm như PDF.  #Huynh
    expect(css).toMatch(/width:\s*21cm/);
    expect(css).toMatch(/padding:\s*2cm/);
    expect(css).toMatch(/max-width:\s*100%/); // màn hẹp thì tờ giấy co lại, không tràn
  });

  it("không nhét gì vào template — PDF và trang chia sẻ vẫn sạch script", () => {
    // Kiểu chữ cho việc sửa được bơm LÚC CHẠY. Để trong template là dòng gợi ý "nhấp để
    // nhập" in thẳng vào bản PDF gửi khách.
    const doc = makeDoc('<p data-field="assumptions" data-label="Ghi chú"></p>');
    attachInlineEdit(doc, vi.fn());

    expect(doc.getElementById("se-inline-edit-style")).not.toBeNull();
    expect(doc.querySelectorAll("script")).toHaveLength(0);
  });

  it("ô rỗng được đánh dấu để hiện dòng gợi ý, gõ vào thì mất dấu", () => {
    const doc = makeDoc('<p data-field="assumptions" data-label="Ghi chú"></p>');
    attachInlineEdit(doc, vi.fn());

    const node = doc.querySelector<HTMLElement>("[data-field]")!;
    expect(node.classList.contains("se-empty")).toBe(true);

    node.textContent = "Giá chưa gồm chi phí tên miền.";
    node.dispatchEvent(new Event("blur"));
    expect(node.classList.contains("se-empty")).toBe(false);
  });

  it("gọi hai lần cũng không bơm kiểu chữ hai lần", () => {
    // iframe nạp lại mỗi khi giá đổi, nên hàm này bị gọi đi gọi lại suốt.
    const doc = makeDoc('<p data-field="assumptions" data-label="Ghi chú">x</p>');
    attachInlineEdit(doc, vi.fn());
    attachInlineEdit(doc, vi.fn());
    expect(doc.querySelectorAll("#se-inline-edit-style")).toHaveLength(1);
  });
});


describe("dấu cây bút cho ô sửa được", () => {
  /**
   * Freelancer mới không biết tờ giấy này bấm vào là sửa được. Cây bút mờ nói ra điều đó.
   *
   * Ràng buộc quan trọng hơn: nó TUYỆT ĐỐI không được lọt vào bản gửi khách hay bản PDF.
   */
  function makeDoc(body: string): Document {
    const doc = document.implementation.createHTMLDocument("bao gia");
    doc.body.innerHTML = body;
    return doc;
  }

  function styleText(doc: Document): string {
    return Array.from(doc.querySelectorAll("style"))
      .map((node) => node.textContent ?? "")
      .join(" ");
  }

  it("bản ĐANG SOẠN có dấu cây bút", () => {
    const doc = makeDoc('<p data-field="payment_terms">Cọc 30%.</p>');
    attachInlineEdit(doc, vi.fn());
    expect(styleText(doc)).toContain("data:image/svg+xml");
  });

  it("bản ĐỌC-ONLY (đã gửi / đã ký) KHÔNG có cây bút", () => {
    // Hợp đồng đã gửi chỉ bơm style tờ giấy, không bật sửa — không được có dấu hiệu mời sửa.
    const doc = makeDoc('<p data-field="payment_terms">Cọc 30%.</p>');
    injectPreviewPageStyle(doc);
    expect(styleText(doc)).not.toContain("data:image/svg+xml");
  });

  it("cây bút KHÔNG phải chữ nên không thể lọt vào dữ liệu đem lưu", () => {
    // Bảo đảm lớp hai: dùng ảnh nền trên `content: ""`. Kể cả trình duyệt nào đó có tính nội
    // dung sinh ra vào `innerText` thì phần cộng thêm cũng là chuỗi rỗng.
    const doc = makeDoc('<p data-field="payment_terms">Cọc 30%.</p>');
    attachInlineEdit(doc, vi.fn());

    expect(styleText(doc)).toMatch(/content:\s*""/);
    const node = doc.querySelector<HTMLElement>("[data-field]")!;
    expect(readField(node)).toBe("Cọc 30%.");
  });

  it("PDF do server dựng nên không có đường nào chạm tới style này", () => {
    // Kiểm bằng chính kiến trúc: style chỉ tồn tại sau khi gọi `attachInlineEdit` trên một
    // Document của trình duyệt. Tài liệu chưa gắn gì thì sạch trơn.
    const doc = makeDoc('<p data-field="payment_terms">Cọc 30%.</p>');
    expect(styleText(doc)).toBe("");
  });
});
