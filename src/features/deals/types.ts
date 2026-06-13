export type Stage =
  | "new_lead"
  | "qualified"
  | "proposal_sent"
  | "in_negotiation"
  | "active"
  | "completed_and_billed"
  | "lost";

export type LeadScore = "hot" | "warm" | "cold";

export type PaymentStatus = "Chưa thanh toán" | "Đã đặt cọc" | "Đã thanh toán";
export type PaymentMethod = "MoMo" | "Vietcombank" | "Techcombank" | "—";
export type Channel = "Zalo" | "Email" | "Facebook";

export type Deal = {
  id: string;
  clientId: string;
  client: string;
  projectType: string;
  value: number; // VND
  score: LeadScore;
  stage: Stage;
  contact: string;
  channel: Channel;
  createdAt: string;
  updatedAt: string;
  notes: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  history: { date: string; text: string }[];
};

export const STAGES: { id: Stage; title: string; hint: string }[] = [
  { id: "new_lead",           title: "Yêu Cầu Mới",         hint: "Khách hàng vừa liên hệ" },
  { id: "qualified",          title: "Đã Sàng Lọc",          hint: "Phù hợp dịch vụ" },
  { id: "proposal_sent",      title: "Đã Gửi Báo Giá",       hint: "Chờ phản hồi" },
  { id: "in_negotiation",     title: "Đang Đàm Phán",         hint: "Trao đổi điều khoản" },
  { id: "active",             title: "Đang Triển Khai",       hint: "Dự án đang chạy" },
  { id: "completed_and_billed", title: "Hoàn Thành & Đã Thu", hint: "Đã thanh toán" },
  { id: "lost",               title: "Không Chốt Được",       hint: "Deal đã mất" },
];

// Mirror of backend VALID_TRANSITIONS — used for client-side validation before
// calling POST /deals/{id}/stage so invalid drags are rejected immediately.
export const VALID_TRANSITIONS: Record<Stage, Stage[]> = {
  new_lead:             ["qualified", "lost"],
  qualified:            ["proposal_sent", "lost"],
  proposal_sent:        ["in_negotiation", "lost"],
  in_negotiation:       ["active", "lost"],
  active:               ["completed_and_billed", "lost"],
  completed_and_billed: [],
  lost:                 [],
};
