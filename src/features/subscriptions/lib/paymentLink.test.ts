import { describe, expect, it } from "vitest";

import {
  isNavigableCheckout,
  readTransferDetails,
} from "@/features/subscriptions/lib/paymentLink";
import type { PaymentIntentResponse, PaymentLink } from "@/services/subscriptionsService";

/**
 * Vì sao file này tồn tại.
 *
 * Backend KHÔNG có trường riêng cho tên ngân hàng và số tài khoản — hai thứ người dùng
 * phải gõ vào app ngân hàng khi quét QR hỏng. Chúng chỉ nằm lẫn trong một câu tiếng Việt
 * và trong tham số của link ảnh QR. Bóc sai là dẫn người ta chuyển tiền vào một số tài
 * khoản không tồn tại — nên mỗi đường bóc phải có test riêng.
 */

function linkStub(over: Partial<PaymentLink> = {}): PaymentLink {
  return { type: "bank_transfer_instruction", url: null, qr_code_url: null, instructions: null, ...over };
}

function intentStub(
  link: Partial<PaymentLink> = {},
  over: Partial<Pick<PaymentIntentResponse, "amount" | "order_code">> = {}
) {
  return { amount: "199000.00", order_code: "SDDYFM83AS", payment_link: linkStub(link), ...over };
}

describe("isNavigableCheckout — cái gì được phép điều hướng trình duyệt", () => {
  it("link checkout http(s) của ví thì điều hướng được", () => {
    expect(isNavigableCheckout(linkStub({ type: "checkout_url", url: "https://test-payment.momo.vn/pay/abc" }))).toBe(true);
  });

  it("hướng dẫn chuyển khoản KHÔNG bao giờ điều hướng được — ảnh PNG cũng là https", () => {
    // Đây là ca quan trọng nhất file: SePay trả `url` là ảnh, chặn theo scheme sẽ LỌT.
    const sepay = linkStub({
      type: "bank_transfer_instruction",
      url: "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS",
    });
    expect(isNavigableCheckout(sepay)).toBe(false);
  });

  it("deeplink momo:// không điều hướng được — trên desktop là ngõ cụt câm lặng", () => {
    expect(isNavigableCheckout(linkStub({ type: "checkout_url", url: "momo://app?action=pay" }))).toBe(false);
  });

  it("thiếu url, url rác, hoặc không có link thì đều không điều hướng", () => {
    expect(isNavigableCheckout(linkStub({ type: "checkout_url", url: null }))).toBe(false);
    expect(isNavigableCheckout(linkStub({ type: "checkout_url", url: "khong-phai-url" }))).toBe(false);
    expect(isNavigableCheckout(null)).toBe(false);
    expect(isNavigableCheckout(undefined)).toBe(false);
  });
});

describe("readTransferDetails — bóc bốn dòng chuyển khoản", () => {
  it("đọc ngân hàng và số tài khoản từ query của link ảnh VietQR", () => {
    const details = readTransferDetails(
      intentStub({ qr_code_url: "https://vietqr.app/img?acc=40104887&bank=ACB&amount=199000&des=SDDYFM83AS" })
    );
    expect(details.accountNumber).toBe("40104887");
    expect(details.bank).toBe("ACB");
  });

  it("đọc được cả dạng đường dẫn img.vietqr.io/image/ACB-40104887-compact2.png", () => {
    const details = readTransferDetails(
      intentStub({ qr_code_url: "https://img.vietqr.io/image/ACB-40104887-compact2.png" })
    );
    expect(details.bank).toBe("ACB");
    expect(details.accountNumber).toBe("40104887");
  });

  it("link không mang thông tin thì đọc từ câu hướng dẫn tiếng Việt", () => {
    // NGUYÊN VĂN chuỗi backend đang trả (`_sepay_instructions`). Backend đổi câu này thì
    // test đỏ — đúng như mong muốn, vì đây là đường bóc mong manh nhất.
    const details = readTransferDetails(
      intentStub({
        qr_code_url: "https://vietqr.app/img",
        instructions: "Chuyển khoản 199.000đ tới số tài khoản 40104887 (ACB), nội dung ghi đúng: SDDYFM83AS",
      })
    );
    expect(details.accountNumber).toBe("40104887");
    expect(details.bank).toBe("ACB");
  });

  it("không đọc ra thì trả null, TUYỆT ĐỐI không đoán bừa một số tài khoản", () => {
    const details = readTransferDetails(intentStub({ qr_code_url: "https://vietqr.app/img" }));
    expect(details.accountNumber).toBeNull();
    expect(details.bank).toBeNull();
  });

  it("số tiền chép ra là chuỗi số trần — app ngân hàng không nhận '199.000 ₫'", () => {
    expect(readTransferDetails(intentStub()).amountRaw).toBe("199000");
  });

  it("nội dung chuyển khoản lấy từ order_code, không bóc từ tham số des của URL", () => {
    // `des` cố tình để KHÁC `order_code`: nếu ai đó bóc từ URL, test này đỏ.
    const details = readTransferDetails(
      intentStub({ qr_code_url: "https://vietqr.app/img?acc=1&bank=ACB&des=SAI_MA_NAY" })
    );
    expect(details.memo).toBe("SDDYFM83AS");
  });
});
