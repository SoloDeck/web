// Domain types for the Deal pipeline (Kanban). Shared across the deals,
// clients, revenue and reminders features.

export type Stage =
  | "new_lead"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "active"
  | "completed";

export type LeadScore = "hot" | "warm" | "cold";

export type PaymentStatus = "Chưa thanh toán" | "Đã đặt cọc" | "Đã thanh toán";
export type PaymentMethod = "MoMo" | "Vietcombank" | "Techcombank" | "—";
export type Channel = "Zalo" | "Email" | "Facebook";

export type Deal = {
  id: string;
  client: string;
  projectType: string;
  value: number; // VND
  score: LeadScore;
  stage: Stage;
  contact: string;
  channel: Channel;
  createdAt: string;
  notes: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  history: { date: string; text: string }[];
};

export const STAGES: { id: Stage; title: string; hint: string }[] = [
  { id: "new_lead", title: "Yêu Cầu Mới", hint: "Khách hàng vừa liên hệ" },
  { id: "qualified", title: "Đã Sàng Lọc", hint: "Phù hợp dịch vụ" },
  { id: "proposal_sent", title: "Đã Gửi Báo Giá", hint: "Chờ phản hồi" },
  { id: "negotiation", title: "Đang Đàm Phán", hint: "Trao đổi điều khoản" },
  { id: "active", title: "Đang Triển Khai", hint: "Dự án đang chạy" },
  { id: "completed", title: "Hoàn Thành & Đã Thu", hint: "Đã thanh toán" },
];
