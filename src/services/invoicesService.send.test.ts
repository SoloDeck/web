import { afterEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import axiosClient from "@/configs/axios";
import { sendInvoice } from "@/services/invoicesService";

/**
 * Gửi hóa đơn xin backend đặt sẵn lời nhắc thanh toán THEO quy tắc "Nhắc trước khi hóa đơn tới hạn"
 * của người dùng. Web KHÔNG gửi số ngày, giờ, kênh hay giọng nào — mọi thứ do quy tắc quyết định,
 * để chỉ có một nơi cấu hình. Thay adapter của axios để đi đúng đường thật của hàm (khuôn
 * `authService.register.test.ts`).
 */

const realAdapter = axiosClient.defaults.adapter;
let sent: { url?: string; body: unknown } | null = null;

function capture(data: unknown) {
  sent = null;
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
    sent = { url: config.url, body: JSON.parse(String(config.data ?? "null")) };
    return Promise.resolve({ status: 200, statusText: "OK", headers: {}, config, data });
  }) as AxiosAdapter;
}

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
});

describe("sendInvoice", () => {
  it("xin đặt lời nhắc theo quy tắc và không mang thông số nào khác", async () => {
    capture({ success: true, data: { id: "inv-1", status: "sent" } });

    await sendInvoice("inv-1");

    expect(sent?.url).toBe("/invoices/inv-1/send");
    expect(sent?.body).toEqual({ schedule_payment_reminder: true });
  });

  it("trả về hóa đơn kèm kết quả đặt lời nhắc mà backend báo", async () => {
    const reminder = { scheduled: true, days_before_due: 3, requires_approval: true };
    capture({ success: true, data: { id: "inv-1", status: "sent", payment_reminder: reminder } });

    const invoice = await sendInvoice("inv-1");

    expect(invoice.payment_reminder).toEqual(reminder);
  });
});
