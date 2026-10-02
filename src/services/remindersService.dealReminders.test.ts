import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import axiosClient from "@/configs/axios";
import { listDealReminders } from "@/services/remindersService";

/**
 * Tab Nhắc nhở của deal phải thấy cả lời nhắc về HOÁ ĐƠN và HỢP ĐỒNG của deal.
 *
 * Bản cũ chỉ lấy `target_type = "deal"`, trong khi nhắc thanh toán tự sinh nhắm vào hoá đơn và
 * nhắc ký nhắm vào hợp đồng — lời nhắc "Chờ bạn duyệt" có mà không hiện ở đâu để duyệt.
 * Thay adapter axios theo khuôn `subscriptionsService.test.ts`, để đi đúng đường thật.
 */

const realAdapter = axiosClient.defaults.adapter;

const REMINDERS = [
  { id: "r-deal", target_type: "deal", target_id: "deal-1" },
  { id: "r-deal-khac", target_type: "deal", target_id: "deal-2" },
  { id: "r-hoa-don", target_type: "invoice", target_id: "inv-1" },
  { id: "r-hoa-don-khac", target_type: "invoice", target_id: "inv-9" },
  { id: "r-hop-dong", target_type: "contract", target_id: "ct-1" },
  { id: "r-khach", target_type: "client", target_id: "cl-1" },
];

beforeEach(() => {
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    const body =
      url === "/reminders"
        ? { data: REMINDERS }
        : url === "/invoices"
          ? {
              data: config.params?.deal_id === "deal-1" ? [{ id: "inv-1", deal_id: "deal-1" }] : [],
              pagination: { total: 1, page: 1, page_size: 100, total_pages: 1 },
            }
          : url === "/contracts"
            ? { data: config.params?.deal_id === "deal-1" ? [{ id: "ct-1", deal_id: "deal-1" }] : [] }
            : {};
    return Promise.resolve({ data: body, status: 200, statusText: "OK", headers: {}, config });
  }) as AxiosAdapter;
});

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
});

describe("listDealReminders", () => {
  it("gồm lời nhắc của deal, của hoá đơn và hợp đồng thuộc deal — không lẫn deal khác", async () => {
    const ids = (await listDealReminders("deal-1")).map((r) => r.id).sort();
    expect(ids).toEqual(["r-deal", "r-hoa-don", "r-hop-dong"]);
  });
});
