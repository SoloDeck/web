import { describe, expect, it } from "vitest";
import { pdfDownloadErrorMessage } from "./pdfDownloadError";

const withStatus = (status: number) => ({ response: { status, data: new Blob(["{}"]) } });

describe("pdfDownloadErrorMessage", () => {
  it("402 nói rõ là do gói, không bảo 'thử lại' — bấm lại cũng không qua", () => {
    const message = pdfDownloadErrorMessage(withStatus(402));
    expect(message).toContain("Gói");
    expect(message).not.toContain("thử lại");
  });

  it("404 bảo tải lại trang", () => {
    expect(pdfDownloadErrorMessage(withStatus(404))).toContain("Tải lại trang");
  });

  it("lỗi mạng hoặc 500 thì mới bảo thử lại", () => {
    expect(pdfDownloadErrorMessage(new Error("Network Error"))).toBe("Tải PDF thất bại. Vui lòng thử lại.");
    expect(pdfDownloadErrorMessage(withStatus(500))).toBe("Tải PDF thất bại. Vui lòng thử lại.");
  });
});
