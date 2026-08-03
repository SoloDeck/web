import type { LeadScore } from "@/features/deals/types";

/**
 * Dữ liệu cho bảng Kanban mô phỏng ở hero.
 *
 * Trước đây chỗ này là một khung viền đứt rỗng chờ ai đó chụp màn hình dán vào
 * (`HERO_IMAGE_SRC = ""`). Thay bằng bảng tự chạy thì không cần bảo trì ảnh, và quan
 * trọng hơn: nó tái hiện đúng hành vi của bảng thật chứ không phải hình trang trí.
 */

/** Bề rộng một cột. Dùng chung cho cả CSS lẫn phép tính pan, nên chỉ khai một chỗ. */
export const SIM_COL_W_REM = 8.75;
/** Chiều cao một thẻ; phép xếp chồng theo hàng dựa vào số này. */
export const SIM_CARD_H_REM = 5;
export const SIM_ROW_GAP_REM = 0.6;
/** Nhịp đẩy thẻ sang giai đoạn kế (ms). */
export const SIM_TICK_MS = 2400;

export type SimDeal = {
  id: string;
  project: string;
  client: string;
  value: number;
  score: LeadScore;
  /** Lệch pha so với nhịp chung, để các thẻ không đi thành một hàng thẳng. */
  offset: number;
};

/**
 * Bảy deal giả lập. Tiền để dạng số và hiển thị qua `formatVND` để bảng mô phỏng và
 * bảng Kanban thật định dạng tiền giống hệt nhau.
 */
export const SIM_DEALS: SimDeal[] = [
  {
    id: "s1",
    project: "Nhận diện quán cà phê",
    client: "Chị Lan · An Coffee",
    value: 18_000_000,
    score: "hot",
    offset: 0,
  },
  {
    id: "s2",
    project: "Landing page sản phẩm",
    client: "Anh Dũng · Nutrimax",
    value: 12_500_000,
    score: "warm",
    offset: 1,
  },
  {
    id: "s3",
    project: "Chụp ảnh menu 30 món",
    client: "Bếp Nhà Mộc",
    value: 6_000_000,
    score: "warm",
    offset: 2,
  },
  {
    id: "s4",
    project: "Nội dung fanpage 3 tháng",
    client: "Chị Hà · Spa Sen",
    value: 9_000_000,
    score: "cold",
    offset: 3,
  },
  {
    id: "s5",
    project: "Website bán hàng 5 trang",
    client: "Anh Kiên · Đại Phát",
    value: 25_000_000,
    score: "hot",
    offset: 4,
  },
  {
    id: "s6",
    project: "Video giới thiệu 2 phút",
    client: "Anh ngữ Sao Mai",
    value: 15_000_000,
    score: "warm",
    offset: 0,
  },
  {
    id: "s7",
    project: "Bộ ảnh sản phẩm Tết",
    client: "Chị Mai · Bánh Nhà Mai",
    value: 8_500_000,
    score: "cold",
    offset: 3,
  },
];

export type SimPlacement = { deal: SimDeal; col: number; row: number };

/**
 * Vị trí mọi thẻ tại một nhịp.
 *
 * Hàm thuần theo tham số — không giữ state ngoài, không đọc giờ hệ thống — nên React
 * Compiler memo hoá thoải mái và test dựng lại được kết quả y hệt.
 *
 * Các `offset` 0,1,2,3,4,0,3 khiến cả sáu cột lúc nào cũng có thẻ, trong đó hai cột có
 * hai thẻ chồng nhau — bảng trông như đang được dùng thật chứ không đều tăm tắp.
 */
export function layoutSim(tick: number, cols: number): SimPlacement[] {
  const stack = new Map<number, number>();
  return SIM_DEALS.map((deal) => {
    const col = (tick + deal.offset) % cols;
    const row = stack.get(col) ?? 0;
    stack.set(col, row + 1);
    return { deal, col, row };
  });
}

/**
 * Ngân sách dạng ngắn: "18 triệu".
 *
 * Bảng Kanban thật hiển thị `deal.budgetLabel || formatVND(deal.value)` — tức khi deal
 * có nhãn ngân sách do người dùng nhập thì nó hiện nhãn ngắn đó chứ không phải số đầy
 * đủ. Cột trong bảng mô phỏng chỉ rộng 8.75rem nên số đầy đủ "18.000.000 ₫" bị cắt cụt
 * thành "18.000.0…"; dùng dạng ngắn vừa gọn vừa đúng thứ bảng thật hay hiện.  #Huynh
 */
export const simBudget = (value: number): string => {
  const trieu = value / 1_000_000;
  const so = Number.isInteger(trieu) ? String(trieu) : trieu.toFixed(1).replace(".", ",");
  return `${so} triệu`;
};
