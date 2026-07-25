/**
 * Cho phép bấm thẳng vào chữ trong tờ báo giá rồi gõ — như Word, nhưng KHÔNG phải Word.
 *
 * Vì sao không cho gõ tự do cả tờ: làm thế thì nội dung biến thành một cục HTML, và cục đó
 * giết ba thứ:
 *
 *   1. Không moi được GIÁ ra khỏi cục chữ. Giá đang là một con số (`pricing_detail.
 *      final_price`); từ đó ta bơm sang `deal.estimated_value` và — quan trọng hơn — neo giá
 *      cho các báo giá sau. Cả hệ định giá sống nhờ "các dự án bạn đã chốt giá bao nhiêu".
 *      Giá thành chuỗi "371.000.000 VND" lẫn trong HTML thì phải đoán bằng regex, mà đoán
 *      sai một lần là neo sai mãi.
 *   2. Module hợp đồng đọc `scope_of_work`/`deliverables`/`out_of_scope` dạng DANH SÁCH.
 *      Thành cục HTML là hết chỗ lấy.
 *   3. HTML người dùng gõ/dán vào sẽ được LƯU rồi render lại trong trình duyệt của KHÁCH
 *      qua link chia sẻ — đó là stored XSS. Dán một đoạn từ web lạ là dính.
 *
 * Cách ở đây: mỗi mục là một ô riêng, sửa ở chế độ CHỮ THUẦN, và lúc đọc ra ta chỉ lấy
 * `innerText`. Trình duyệt hay thao tác dán có nhét rác HTML vào DOM thì cũng bị bỏ ngay khi
 * đọc — cục HTML không bao giờ được lưu. Người dùng vẫn thấy y như đang gõ vào tờ giấy, mà
 * bên dưới vẫn là `scope_of_work: ["...", "..."]`.
 *
 * Khung xem trước dùng `srcDoc` nên iframe CÙNG ORIGIN với trang cha — với tay vào từng ô
 * được thẳng, không cần nhét script vào template. Nhờ vậy bản PDF và trang chia sẻ vẫn sạch
 * script y như trước.  #Huynh
 */

/** Kiểu chữ cho phần sửa tại chỗ. Bơm lúc chạy, KHÔNG nằm trong template — nếu để trong
 *  template thì dòng gợi ý "nhấp để nhập" sẽ in thẳng vào PDF gửi khách. */

/**
 * Dựng bản xem trước thành một TỜ A4 thật.
 *
 * Template có `@page { size: A4; margin: 2cm }`, nhưng thứ đó chỉ chi phối lúc WeasyPrint in
 * ra PDF. Trong trình duyệt không tồn tại khái niệm "trang giấy", nên `<body>` cứ giãn hết
 * bề ngang khung — khung càng rộng thì chữ càng trải dài, và bản xem trước càng KHÁC bản PDF
 * mà khách nhận. Nới khung cho "thoáng" theo kiểu ngây thơ là tự phá cái bảo đảm "thấy sao
 * nhận vậy".
 *
 * Nên ta tự tay dựng lại cái trang giấy: rộng đúng 21cm, lề đúng 2cm — cột chữ ra 17cm, khớp
 * y hệt PDF. Khung có rộng thêm bao nhiêu thì phần dôi ra là nền xám hai bên, chữ không đổi
 * một dòng nào.
 *
 * Bơm LÚC CHẠY chứ không để trong template: đây là chuyện của màn soạn báo giá, PDF không
 * cần biết (và bóng đổ với nền xám thì in ra giấy cũng vô nghĩa).  #Huynh
 */
const PAGE_STYLE = `
  html {
    background: #eef1f5;
    padding: 20px 0;
  }
  body {
    width: 21cm;
    max-width: 100%;
    margin: 0 auto;
    padding: 2cm;
    box-sizing: border-box;
    background: #fff;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .12), 0 8px 24px rgba(0, 0, 0, .08);
  }
`;

const EDIT_STYLE = `
  [data-field] {
    outline: none;
    border-radius: 4px;
    transition: background-color .12s, box-shadow .12s;
  }
  [data-field]:hover {
    cursor: text;
    background-color: rgba(59, 130, 246, .06);
    box-shadow: 0 0 0 5px rgba(59, 130, 246, .06);
  }
  [data-field]:focus,
  [data-field]:focus-within {
    background-color: rgba(59, 130, 246, .04);
    box-shadow: 0 0 0 2px #3b82f6, 0 0 0 5px rgba(59, 130, 246, .12);
  }
  [data-field][data-kind="list"] { min-height: 1.6em; }
  [data-field].se-empty::before {
    content: attr(data-label) " — nhấp để nhập";
    color: #9ca3af;
    font-style: italic;
  }
`;

/**
 * Chữ đang hiện trong một phần tử.
 *
 * Ưu tiên `innerText` vì nó theo ĐÚNG thứ mắt nhìn thấy: gộp khoảng trắng thừa, và coi mỗi
 * `<br>` là một dòng mới — gõ Enter trong ô chữ thuần thì trình duyệt chèn `<br>`, dùng
 * `textContent` là mất trắng chỗ xuống dòng đó. `textContent` chỉ là đường lui cho môi
 * trường không dựng hình (jsdom lúc chạy test không hề có `innerText`).  #Huynh
 */
function textOf(element: HTMLElement): string {
  return element.innerText ?? element.textContent ?? "";
}

/** Ô rỗng thì không có gì để bấm vào. Đánh dấu để hiện dòng gợi ý mờ. */
function isBlank(element: HTMLElement): boolean {
  return textOf(element).replace(/\s/g, "") === "";
}

/**
 * Đọc ngày người dùng gõ (kiểu Việt) thành ISO cho máy: "24/07/2026" -> "2026-07-24".
 *
 * Vì sao ngày phải qua cửa này thay vì lưu thẳng như mọi ô khác: chữ nào cũng lưu được, còn
 * ngày thì backend phải TÍNH được (so với hôm nay để biết hết hạn chưa). Lưu nguyên chuỗi
 * "cuối tháng 8 nhé" là tờ giấy có chữ mà hệ thống mù — hạn hiệu lực thành ra vô nghĩa.
 *
 * Nhận cả `/`, `-`, `.` vì người Việt gõ lẫn lộn cả ba. KHÔNG nhận kiểu Mỹ (tháng trước
 * ngày): "07/04/2026" ở đây luôn là mùng 7 tháng 4 — đoán mò chỗ này là sai lệch cả tháng.
 * Trả `null` khi vô nghĩa để bên gọi hoàn tác, chứ không đoán bừa.  #Huynh
 */
export function parseVnDate(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/);
  if (!match) return null;

  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);

  // `new Date(2026, 1, 31)` tự trôi sang 03/03 chứ không báo lỗi — nên phải đối chiếu ngược
  // để bắt 31/02, 31/04...
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Ngược lại: "2026-07-24" -> "24/07/2026". ISO là kiểu của máy, không phải của khách. */
export function formatVnDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Chỉ bơm style "tờ giấy A4" mà KHÔNG bật sửa — dùng cho bản đọc-only (hợp đồng đã gửi/ký).
 *
 * Để bản đọc-only trông y như bản đang soạn (cùng khổ giấy, nền xám), khỏi cảnh nháp thì
 * đẹp như tờ giấy còn bản gửi đi lại trắng trơn tràn viền — lại thành hai thứ khác nhau.  #Huynh
 */
export function injectPreviewPageStyle(doc: Document): void {
  if (doc.getElementById("se-preview-page-style") || doc.getElementById("se-inline-edit-style")) {
    return;
  }
  const style = doc.createElement("style");
  style.id = "se-preview-page-style";
  style.textContent = PAGE_STYLE;
  doc.head.appendChild(style);
}

function markEmpty(element: HTMLElement): void {
  element.classList.toggle("se-empty", isBlank(element));
}

/**
 * Đọc giá trị một ô ra CHUỖI THUẦN.
 *
 * Danh sách trả về các dòng ngăn bằng `\n` — khớp đúng shape mà `EditFields` đang dùng.
 * Chỉ lấy `innerText`, nên mọi thẻ HTML (dù do trình duyệt sinh ra hay do dán vào) đều rụng
 * tại đây. Đó là chỗ chặn XSS, và cũng là chỗ giữ cho dữ liệu còn cấu trúc.
 */
export function readField(element: HTMLElement): string {
  if (element.dataset.kind !== "list") return textOf(element).trim();

  const items = Array.from(element.querySelectorAll("li"))
    .map((li) => textOf(li).trim())
    .filter(Boolean);
  if (items.length > 0) return items.join("\n");

  // Bôi đen cả danh sách rồi xoá thì trình duyệt có thể dọn sạch <li>, để lại chữ trần trong
  // <ul>. Không vớt ở đây là mất trắng thứ người dùng vừa gõ.
  return textOf(element)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Bật chế độ sửa tại chỗ cho toàn bộ ô `[data-field]` trong tài liệu xem trước.
 *
 * Gọi lại mỗi lần iframe nạp xong (`onLoad`) — tài liệu cũ bị vứt nguyên nên không cần gỡ
 * listener.
 */
export function attachInlineEdit(
  doc: Document,
  onFieldChange: (field: string, value: string) => void,
  /** Gõ ngày sai kiểu — ô tự hoàn tác, chỗ này để bên gọi nói cho người dùng biết vì sao. */
  onInvalidDate?: (label: string) => void
): void {
  if (doc.getElementById("se-inline-edit-style")) return;

  const style = doc.createElement("style");
  style.id = "se-inline-edit-style";
  // Trang giấy trước, rồi mới tới ô sửa. Cả hai đều là thẻ <style> chèn CUỐI <head> nên
  // thắng phần `body {...}` sẵn có của template ở thế ngang cơ về độ ưu tiên.
  style.textContent = PAGE_STYLE + EDIT_STYLE;
  doc.head.appendChild(style);

  doc.querySelectorAll<HTMLElement>("[data-field]").forEach((element) => {
    const field = element.dataset.field;
    if (!field) return;

    const isList = element.dataset.kind === "list";

    // Danh sách phải để `true` thì Enter mới đẻ ra gạch đầu dòng mới — đúng phản xạ Word.
    // Ô chữ thường để `plaintext-only`: trình duyệt tự lột định dạng khi dán.
    element.contentEditable = isList ? "true" : "plaintext-only";
    element.spellcheck = false;
    markEmpty(element);

    // Ngày cần nhớ giá trị cũ để hoàn tác khi gõ sai.
    if (element.dataset.kind === "date") element.dataset.prev = textOf(element).trim();

    // Dán: ép về chữ thuần ngay lúc dán, cho ô danh sách (ô chữ `plaintext-only` thì trình
    // duyệt đã tự lột rồi).
    //
    // Đây chỉ là chuyện NHÌN cho sạch, KHÔNG phải hàng rào an toàn: hàng rào thật nằm ở
    // `readField()` — nó chỉ bóc chữ ra, nên rác HTML dù có lọt vào DOM cũng không bao giờ
    // được lưu. Vì thế `execCommand` (một API đã cũ) mà biến mất thì cứ để trình duyệt dán
    // theo cách của nó, không việc gì phải nổ.
    element.addEventListener("paste", (event: ClipboardEvent) => {
      if (typeof doc.execCommand !== "function") return;
      event.preventDefault();
      doc.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? "");
    });

    element.addEventListener("focus", () => {
      element.classList.remove("se-empty");
      // Danh sách rỗng thì chưa có <li> nào để đặt con trỏ vào — tạo một cái.
      if (isList && !element.querySelector("li")) {
        element.appendChild(doc.createElement("li"));
      }
    });

    element.addEventListener("blur", () => {
      markEmpty(element);

      if (element.dataset.kind === "date") {
        const iso = parseVnDate(textOf(element));
        if (iso === null) {
          // Hoàn tác về giá trị cũ. KHÔNG được lưu chữ vô nghĩa rồi để backend tự xoay:
          // hạn hiệu lực là thứ phải tính được, không phải thứ để đọc cho vui.
          element.textContent = element.dataset.prev ?? "";
          markEmpty(element);
          onInvalidDate?.(element.dataset.label ?? field);
          return;
        }
        // Gõ "4/8/2026" thì hiện lại thành "04/08/2026" — đúng kiểu tờ giấy in ra.
        element.textContent = formatVnDate(iso);
        element.dataset.prev = element.textContent;
        onFieldChange(field, iso);
        return;
      }

      onFieldChange(field, readField(element));
    });
  });
}
