import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import axiosClient from "@/configs/axios";
import { createCheckout, type PaymentProvider } from "@/services/subscriptionsService";

/**
 * Vì sao file này phải tồn tại.
 *
 * Toàn bộ test của màn Gói dịch vụ đều mock THẲNG `createCheckout`, nên chúng chỉ chứng minh
 * được "trang truyền đúng cổng vào hàm" — chứ không chứng minh được "hàm gửi đúng cổng lên
 * backend". Khoảng trống đó đã che một lỗi thật: thân request ghi cứng `provider: "momo"`,
 * nên người dùng chọn SePay vẫn bị ném sang MoMo. Chín test xanh, không test nào thấy.
 *
 * Ở đây thay adapter của axios để bắt THÂN REQUEST đi ra, theo đúng khuôn `configs/axios.test.ts`.
 */

const realAdapter = axiosClient.defaults.adapter;

let sent: { url: string; body: Record<string, unknown> } | null = null;

beforeEach(() => {
  sent = null;
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
    sent = {
      url: config.url ?? "",
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    };
    return Promise.resolve({
      data: { data: { id: "intent-1", provider: sent.body.provider } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });
  }) as AxiosAdapter;
});

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
});

describe("createCheckout — cổng người dùng chọn phải tới được backend", () => {
  it.each<PaymentProvider>(["momo", "zalopay", "sepay"])(
    "chọn %s thì thân request mang đúng %s",
    async (provider) => {
      await createCheckout({
        planId: "plan-pro",
        provider,
        returnUrl: "https://app.test/?tab=subscription",
      });

      expect(sent?.url).toBe("/subscriptions/checkout");
      expect(sent?.body.provider).toBe(provider);
    }
  );

  it("KHÔNG ghi cứng momo — đây chính là lỗi đã lọt ra staging", async () => {
    await createCheckout({
      planId: "plan-pro",
      provider: "sepay",
      returnUrl: "https://app.test/?tab=subscription",
    });

    expect(sent?.body.provider).not.toBe("momo");
  });

  it("gửi đúng tên trường backend nhận: plan_id / return_url, không phải camelCase", async () => {
    await createCheckout({
      planId: "plan-pro",
      provider: "momo",
      returnUrl: "https://app.test/?tab=subscription",
    });

    expect(sent?.body).toMatchObject({
      plan_id: "plan-pro",
      return_url: "https://app.test/?tab=subscription",
    });
    expect(sent?.body).not.toHaveProperty("planId");
  });
});
