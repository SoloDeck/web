import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import axiosClient from "@/configs/axios";
import { DELETED_ACCOUNT_MARKER, DELETED_ACCOUNT_MSG, register } from "@/services/authService";

/**
 * Đăng ký bằng email của một tài khoản đã xoá. Backend từng nổ 500 ở đây; nay trả 409 với câu
 * riêng, và màn đăng ký phải nói rõ "tài khoản đã bị xoá" chứ không phải "email đã được đăng ký".
 * Thay adapter của axios để đi đúng đường thật của hàm, theo khuôn `subscriptionsService.test.ts`.
 */

const realAdapter = axiosClient.defaults.adapter;

function tra409(message: string) {
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) =>
    Promise.reject({
      config,
      isAxiosError: true,
      response: {
        status: 409,
        config,
        headers: {},
        data: { success: false, code: 409, error: { message, code: "CONFLICT" } },
      },
    })) as AxiosAdapter;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
});

describe("register — 409", () => {
  const payload = { fullName: "Lại", email: "cu@example.com", password: "Test@1234!" };

  it("email của tài khoản đã xoá thì nói rõ, không bảo 'đã được đăng ký'", async () => {
    tra409(DELETED_ACCOUNT_MARKER);
    await expect(register(payload)).rejects.toThrow(DELETED_ACCOUNT_MSG);
  });

  it("email đang dùng thì vẫn là câu cũ", async () => {
    tra409("Email 'cu@example.com' is already registered");
    await expect(register(payload)).rejects.toThrow("Email này đã được đăng ký.");
  });
});
