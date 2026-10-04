import { act, renderHook } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useContractInlineEditor } from "@/features/deals/hooks/useContractInlineEditor";
import type { ContractResponse } from "@/services/contractsService";

/**
 * Sửa hợp đồng ngay trên tờ giấy. Ô nội dung thường (`scope_of_work`...) lưu vào khoá cùng tên.
 * Ô CẤU TRÚC — tên điều (`title_*`) và chữ trong điều có sẵn (`clause_*`), chẳng hạn "Quyền và
 * nghĩa vụ của Bên A" — phải lưu vào `section_titles` / `clause_texts`: trước đây chúng bị ghi vào
 * khoá `clause_party_a_duties` mà bộ dựng giấy không bao giờ đọc, nên chữ sửa hiện trên màn rồi
 * biến mất khi mở lại, và bản gửi khách là bản mặc định.
 */

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock("@/features/deals/hooks/useContracts", () => ({
  useUpdateContract: () => ({ mutateAsync }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// jsdom không có `innerText`; vá bản tối giản bám sát trình duyệt (xem inlineEditPreview.test).
beforeAll(() => {
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

const GIAY = `
  <h2>Điều 4. <span data-field="title_party_a_duties" data-label="Tên điều">Quyền và Nghĩa Vụ Của Bên A</span></h2>
  <ul data-field="clause_party_a_duties" data-kind="list" data-label="Quyền và nghĩa vụ Bên A">
    <li>Thực hiện công việc đúng tiến độ.</li><li>Bảo mật thông tin.</li>
  </ul>
  <p data-field="clause_dispute" data-label="Tranh chấp">Giải quyết qua thương lượng.</p>
  <p data-field="scope_of_work" data-label="Phạm vi">Phạm vi cũ.</p>
  <h2><span data-field="extra_title_0">Quyền sử dụng</span></h2>
  <p data-field="extra_body_0">Một năm.</p>
`;

function hopDong(content: Record<string, unknown> = {}, status = "draft"): ContractResponse {
  return {
    id: "c1",
    deal_id: "d1",
    proposal_id: "p1",
    client_id: "k1",
    status,
    content: { parties: { client: { name: "Khách" } }, governing_law: "Vietnam", ...content },
  } as unknown as ContractResponse;
}

function dung(contract: ContractResponse) {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.body.innerHTML = GIAY;

  const hook = renderHook(({ previewHtml }) => useContractInlineEditor(contract, previewHtml), {
    initialProps: { previewHtml: undefined as string | undefined },
  });
  (hook.result.current.iframeRef as { current: HTMLIFrameElement | null }).current = iframe;
  hook.rerender({ previewHtml: "<html></html>" }); // effect gắn ô sửa chạy lại khi HTML đổi
  return { ...hook, doc };
}

const o = (doc: Document, field: string) =>
  doc.querySelector<HTMLElement>(`[data-field="${field}"]`)!;

function sua(doc: Document, field: string, text: string) {
  const node = o(doc, field);
  node.dispatchEvent(new Event("focus"));
  if (node.dataset.kind === "list") {
    node.innerHTML = text
      .split("\n")
      .map((line) => `<li>${line}</li>`)
      .join("");
  } else {
    node.textContent = text;
  }
  node.dispatchEvent(new Event("blur"));
}

async function luuNgay(result: { current: { flush: () => Promise<void> } }) {
  await act(async () => {
    await result.current.flush();
  });
}

const noiDungDaGui = () =>
  mutateAsync.mock.calls.at(-1)?.[0].payload.content as Record<string, unknown>;

beforeEach(() => {
  mutateAsync.mockClear();
});

describe("useContractInlineEditor — ô cấu trúc", () => {
  it("sửa 'Quyền và nghĩa vụ Bên A' (điều dạng danh sách) → clause_texts.party_a_duties, không phải khoá clause_*", async () => {
    const { result, doc } = dung(hopDong());

    sua(doc, "clause_party_a_duties", "Làm đúng hạn\nGiữ bí mật\nBáo cáo tuần");
    await luuNgay(result);

    const content = noiDungDaGui();
    expect(content.clause_texts).toEqual({
      party_a_duties: ["Làm đúng hạn", "Giữ bí mật", "Báo cáo tuần"],
    });
    expect(content).not.toHaveProperty("clause_party_a_duties");
  });

  it("sửa tên điều → section_titles, không phải khoá title_*", async () => {
    const { result, doc } = dung(hopDong());

    sua(doc, "title_party_a_duties", "Nghĩa vụ riêng của Bên A");
    await luuNgay(result);

    const content = noiDungDaGui();
    expect(content.section_titles).toEqual({ party_a_duties: "Nghĩa vụ riêng của Bên A" });
    expect(content).not.toHaveProperty("title_party_a_duties");
  });

  it("sửa chữ một điều dạng đoạn văn → clause_texts.<điều> là chuỗi", async () => {
    const { result, doc } = dung(hopDong());

    sua(doc, "clause_dispute", "Tranh chấp xử lý tại VIAC.");
    await luuNgay(result);

    expect(noiDungDaGui().clause_texts).toEqual({ dispute: "Tranh chấp xử lý tại VIAC." });
  });

  it("sửa đầu mục tự soạn → extra_sections đúng chỉ số, giữ mục khác", async () => {
    const { result, doc } = dung(
      hopDong({ extra_sections: [{ title: "Quyền sử dụng", body: "Một năm." }] })
    );

    sua(doc, "extra_body_0", "Hai năm.");
    await luuNgay(result);

    expect(noiDungDaGui().extra_sections).toEqual([{ title: "Quyền sử dụng", body: "Hai năm." }]);
  });

  it("GIỮ chữ đã sửa ở điều khác và mọi khoá có sẵn (parties, governing_law)", async () => {
    const { result, doc } = dung(hopDong({ clause_texts: { general: "Chung riêng" } }));

    sua(doc, "clause_dispute", "VIAC");
    await luuNgay(result);

    const content = noiDungDaGui();
    expect(content.clause_texts).toEqual({ general: "Chung riêng", dispute: "VIAC" });
    expect(content.parties).toEqual({ client: { name: "Khách" } });
    expect(content.governing_law).toBe("Vietnam");
  });

  it("sửa hai điều liên tiếp thì điều thứ hai không làm mất điều thứ nhất", async () => {
    const { result, doc } = dung(hopDong());

    sua(doc, "clause_dispute", "VIAC");
    sua(doc, "title_party_a_duties", "Tên mới");
    await luuNgay(result);

    const content = noiDungDaGui();
    expect(content.clause_texts).toEqual({ dispute: "VIAC" });
    expect(content.section_titles).toEqual({ party_a_duties: "Tên mới" });
  });

  it("xoá trắng điều đã sửa → khoá clause_texts biến mất, không để {}", async () => {
    const { result, doc } = dung(hopDong({ clause_texts: { dispute: "Chữ cũ" } }));

    sua(doc, "clause_dispute", "");
    await luuNgay(result);

    expect(noiDungDaGui()).not.toHaveProperty("clause_texts");
  });
});

describe("useContractInlineEditor — ô thường và việc bấm vào rồi ra", () => {
  it("ô nội dung thường vẫn lưu vào khoá cùng tên", async () => {
    const { result, doc } = dung(hopDong());

    sua(doc, "scope_of_work", "Phạm vi mới.");
    await luuNgay(result);

    expect(noiDungDaGui().scope_of_work).toBe("Phạm vi mới.");
  });

  it("bấm vào điều khoản rồi bấm ra mà KHÔNG gõ gì → không có lượt ghi nào", async () => {
    const { result, doc } = dung(hopDong());

    for (const field of ["clause_party_a_duties", "title_party_a_duties", "clause_dispute"]) {
      o(doc, field).dispatchEvent(new Event("focus"));
      o(doc, field).dispatchEvent(new Event("blur"));
    }
    await luuNgay(result);

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("gõ đúng chữ ĐÃ lưu sẵn trong hợp đồng (bản xem trước cũ hơn) thì không ghi lại", async () => {
    // Bản xem trước không nạp lại sau mỗi lần lưu, nên có thể tụt hậu so với hợp đồng: tờ giấy còn
    // hiện chữ mặc định trong khi `clause_texts` đã có sẵn chữ này. Gõ đúng chữ đó là không đổi gì.
    const { result, doc } = dung(hopDong({ clause_texts: { dispute: "VIAC" } }));

    sua(doc, "clause_dispute", "VIAC");
    await luuNgay(result);

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("hợp đồng đã gửi (không còn nháp) thì không cho sửa", async () => {
    const { result, doc } = dung(hopDong({}, "pending_signatures"));

    sua(doc, "clause_dispute", "VIAC");
    await luuNgay(result);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(o(doc, "clause_dispute").contentEditable).not.toBe("plaintext-only");
  });
});
