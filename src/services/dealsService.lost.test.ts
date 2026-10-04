import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import axiosClient from "@/configs/axios";
import {
  countArchivedDeals,
  countLostDeals,
  getArchivedDeals,
  getLostDeals,
  updateDealStage,
} from "@/services/dealsService";

/**
 * Dự án KHÔNG THÀNH CÔNG ở tầng gọi API: "Loại bỏ dự án" gửi kèm lý do, mục Không thành công của
 * kho lấy đúng các deal `lost` (phân trang thật, đóng gần đây nhất lên đầu), và lý do hiện lại
 * trên từng deal. Thay adapter axios theo khuôn `remindersService.dealReminders.test.ts` để đi
 * đúng đường thật, không mock hàm service.
 */

type Seen = {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
};

const realAdapter = axiosClient.defaults.adapter;
let seen: Seen[] = [];

const LOST_DEAL = {
  id: "l1",
  client_id: "c1",
  title: "Logo thương hiệu",
  stage: "lost",
  source: "zalo",
  estimated_value: 15_000_000,
  actual_value: null,
  currency: "VND",
  notes: null,
  created_at: "2026-09-01T08:00:00Z",
  updated_at: "2026-09-20T08:00:00Z",
  closed_at: "2026-09-20T08:00:00Z",
  lost_reason: "Khách chọn bên khác: báo giá thấp hơn 30%",
};

beforeEach(() => {
  seen = [];
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    seen.push({
      method: config.method ?? "",
      url,
      params: config.params,
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    });
    const body =
      url === "/deals"
        ? {
            data: [LOST_DEAL],
            pagination: { total: 23, page: 2, page_size: 10, total_pages: 3 },
          }
        : url === "/clients"
          ? { data: [{ id: "c1", name: "Hoa Huynh", phone: null, email: null }] }
          : url.endsWith("/stage")
            ? { data: LOST_DEAL }
            : {};
    return Promise.resolve({ data: body, status: 200, statusText: "OK", headers: {}, config });
  }) as AxiosAdapter;
});

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
});

const dealListCalls = () => seen.filter((call) => call.url === "/deals" && call.method === "get");

describe("updateDealStage — lý do không thành công", () => {
  it("chuyển sang lost thì gửi kèm lý do", async () => {
    await updateDealStage("l1", "lost", "Khách chọn bên khác");

    const call = seen.find((c) => c.url === "/deals/l1/stage");
    expect(call?.method).toBe("post");
    expect(call?.body).toEqual({ stage: "lost", reason: "Khách chọn bên khác" });
  });

  it("các giai đoạn khác KHÔNG gửi trường lý do", async () => {
    await updateDealStage("l1", "active");

    const call = seen.find((c) => c.url === "/deals/l1/stage");
    expect(call?.body).toEqual({ stage: "active" });
  });

  it("deal trả về mang lý do để hiện lại", async () => {
    const deal = await updateDealStage("l1", "lost", "Khách chọn bên khác");

    expect(deal.stage).toBe("lost");
    expect(deal.lostReason).toBe("Khách chọn bên khác: báo giá thấp hơn 30%");
  });
});

describe("getLostDeals — mục Không thành công của kho", () => {
  it("xin đúng các deal lost, sắp theo ngày đóng, phân trang thật", async () => {
    await getLostDeals({ page: 2 });

    expect(dealListCalls()).toHaveLength(1);
    expect(dealListCalls()[0].params).toEqual({
      stage: "lost",
      sort_by: "closed_at",
      page: 2,
      page_size: 10,
    });
  });

  it("KHÔNG gửi `archived` — dự án không thành công vào kho ngay, không chờ 90 ngày", async () => {
    await getLostDeals({ page: 1 });

    expect(dealListCalls()[0].params).not.toHaveProperty("archived");
  });

  it("từ khoá tìm kiếm được cắt khoảng trắng; để trống thì không gửi", async () => {
    await getLostDeals({ page: 1, title: "  logo  " });
    await getLostDeals({ page: 1, title: "   " });

    expect(dealListCalls()[0].params).toEqual(expect.objectContaining({ title: "logo" }));
    expect(dealListCalls()[1].params).not.toHaveProperty("title");
  });

  it("trả về tổng số, số trang, tên khách và lý do của từng deal", async () => {
    const result = await getLostDeals({ page: 2 });

    expect(result.total).toBe(23);
    expect(result.totalPages).toBe(3);
    expect(result.deals).toHaveLength(1);
    expect(result.deals[0]).toEqual(
      expect.objectContaining({
        id: "l1",
        projectType: "Logo thương hiệu",
        client: "Hoa Huynh",
        stage: "lost",
        lostReason: "Khách chọn bên khác: báo giá thấp hơn 30%",
      })
    );
  });
});

describe("kho 'Đã hoàn thành' không bị ảnh hưởng", () => {
  it("getArchivedDeals vẫn lọc theo `archived` và KHÔNG lọc theo giai đoạn", async () => {
    await getArchivedDeals({ page: 1 });

    expect(dealListCalls()[0].params).toEqual({
      archived: true,
      sort_by: "closed_at",
      page: 1,
      page_size: 10,
    });
  });
});

describe("đếm số dự án trong kho", () => {
  it("countLostDeals xin 1 bản ghi và đọc `total`", async () => {
    const total = await countLostDeals();

    expect(total).toBe(23);
    expect(dealListCalls()[0].params).toEqual({ stage: "lost", page_size: 1 });
  });

  it("countArchivedDeals vẫn đếm mục Đã hoàn thành", async () => {
    const total = await countArchivedDeals();

    expect(total).toBe(23);
    expect(dealListCalls()[0].params).toEqual({ archived: true, page_size: 1 });
  });
});
