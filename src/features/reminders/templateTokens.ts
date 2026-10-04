import type { ReminderTemplateVariable } from "@/services/remindersService";

/**
 * Nội dung mẫu lời nhắc lưu ở server dưới dạng `{client_name}`, `{deal_title}`… — đúng thứ bộ máy
 * thay chuỗi cần, nhưng người dùng đọc vào chẳng hiểu gì. Ở ô soạn thì hiện bằng CHỮ TIẾNG VIỆT
 * trong ngoặc vuông (`[Tên khách hàng]`, `[Tên dự án]`), lúc lưu đổi ngược về dạng của server.
 *
 * Nhờ vậy người dùng nhìn là biết chỗ nào là tên khách, chỗ nào là tên dự án; muốn thêm thì bấm nút
 * chèn, hoặc tự gõ đúng tên trong ngoặc. Khung xem trước (xem `previewParts`) cho thấy ngay thứ khách
 * sẽ đọc, nên gõ sai tên thì nhìn là thấy.  #Huynh
 */

/** Thông tin mẫu cho khung xem trước. Khoá là tên biến, không kèm ngoặc nhọn. */
export const SAMPLE_VALUES: Record<string, string> = {
  client_name: "Nguyễn Văn An",
  deal_title: "Website bán hàng",
  invoice_number: "INV-20261017-AB12",
  due_date: "17/10/2026",
  amount: "50.000.000 ₫",
  days_late: "3",
};

type Variable = Pick<ReminderTemplateVariable, "token" | "label">;

/** `[Tên khách hàng]` — dạng người dùng thấy và gõ. */
export function friendlyToken(variable: Variable): string {
  return `[${variable.label}]`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `{client_name}` → `client_name`. */
function nameOf(variable: Variable): string {
  return variable.token.replace(/^\{|\}$/g, "");
}

/** Dạng server → dạng người dùng thấy: mọi `{client_name}` thành `[Tên khách hàng]`. */
export function toFriendly(stored: string, variables: Variable[]): string {
  let text = stored;
  for (const variable of variables) {
    text = text.split(variable.token).join(friendlyToken(variable));
  }
  return text;
}

/**
 * Dạng người dùng gõ → dạng server: `[Tên khách hàng]` thành `{client_name}`.
 *
 * Không phân biệt hoa thường và chịu được khoảng trắng thừa trong ngoặc (`[ tên khách hàng ]`) vì
 * đây là chữ người dùng tự gõ. Ngoặc vuông nào không khớp tên biến nào thì để nguyên là chữ thường.
 */
export function fromFriendly(text: string, variables: Variable[]): string {
  let stored = text;
  for (const variable of variables) {
    const pattern = new RegExp(`\\[\\s*${escapeRegExp(variable.label)}\\s*\\]`, "gi");
    stored = stored.replace(pattern, variable.token);
  }
  return stored;
}

export type PreviewPart = {
  text: string;
  /** Có giá trị = đoạn này là thông tin điền tự động; giá trị là nhãn tiếng Việt của biến. */
  variable?: string;
};

/**
 * Cắt nội dung (dạng server) thành các đoạn để hiện xem trước: chữ thường xen kẽ chỗ được điền
 * bằng thông tin mẫu. Biến không có thông tin mẫu thì để nguyên chữ `[Nhãn]` cho người dùng thấy.
 */
export function previewParts(stored: string, variables: Variable[]): PreviewPart[] {
  const byToken = new Map(variables.map((variable) => [variable.token, variable]));
  if (byToken.size === 0) return stored ? [{ text: stored }] : [];

  const splitter = new RegExp(
    `(${variables.map((variable) => escapeRegExp(variable.token)).join("|")})`,
    "g"
  );
  const parts: PreviewPart[] = [];
  for (const piece of stored.split(splitter)) {
    if (piece === "") continue;
    const variable = byToken.get(piece);
    if (!variable) {
      parts.push({ text: piece });
      continue;
    }
    const sample = SAMPLE_VALUES[nameOf(variable)];
    parts.push(
      sample === undefined
        ? { text: friendlyToken(variable) }
        : { text: sample, variable: variable.label }
    );
  }
  return parts;
}
