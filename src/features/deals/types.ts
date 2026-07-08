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

export type TaskStatus = "todo" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type ProjectTask = {
  id: string;
  title: string;
  note: string;
  status: TaskStatus;
  dueDate: string | null;
  priority?: TaskPriority;
  phaseId?: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type DealHistoryItem = {
  id?: string;
  date: string;
  text: string;
  channel?: string;
};

export type Deal = {
  id: string;
  clientId: string;
  client: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  projectType: string;
  value: number; // VND
  budgetLabel?: string | null;
  score: LeadScore;
  stage: Stage;
  contact: string;
  channel: Channel;
  source?: string | null;
  serviceCategory?: string | null;
  pricingTier?: string | null;
  aiQualificationScore?: number | null;
  aiQualificationRecommendation?: string | null;
  createdAt: string;
  updatedAt?: string;
  notes: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  history: DealHistoryItem[];
  tasks: ProjectTask[];
};

export type StageConfig = {
  id: Stage;
  title: string;
  shortTitle: string;
  hint: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
};

// BE lưu source bằng mã ngắn; UI người Việt luôn hiển thị nhãn tiếng Việt.
export const DEAL_SOURCE_LABELS: Record<string, string> = {
  inbound: "Khách tự liên hệ",
  referral: "Giới thiệu",
  outreach: "Tôi chủ động tìm",
  platform: "Sàn / Nền tảng",
  other: "Khác",
};

export function formatDealSource(source?: string | null): string {
  if (!source) return "Chưa rõ";
  return DEAL_SOURCE_LABELS[source] ?? source;
}

export const STAGES: StageConfig[] = [
  {
    id: "new_lead",
    title: "Deal Mới",
    shortTitle: "Deal mới",
    hint: "Khách hàng vừa liên hệ",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  {
    id: "qualified",
    title: "Đã Đánh Giá",
    shortTitle: "Đã đánh giá",
    hint: "Phù hợp dịch vụ",
    dotClass: "bg-blue-500",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
  },
  {
    id: "proposal_sent",
    title: "Đã Gửi Báo Giá",
    shortTitle: "Đã gửi báo giá",
    hint: "Chờ phản hồi",
    dotClass: "bg-violet-500",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
  },
  {
    id: "in_negotiation",
    title: "Đang Đàm Phán",
    shortTitle: "Đang đàm phán",
    hint: "Trao đổi điều khoản",
    dotClass: "bg-orange-500",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
  },
  {
    id: "active",
    title: "Đang Triển Khai",
    shortTitle: "Đang triển khai",
    hint: "Dự án đang chạy",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
  },
  {
    id: "completed_and_billed",
    title: "Hoàn Thành",
    shortTitle: "Hoàn thành",
    hint: "Đã thanh toán",
    dotClass: "bg-slate-500",
    bgClass: "bg-slate-50",
    textClass: "text-slate-700",
  },
  {
    id: "lost",
    title: "Không Chốt Được",
    shortTitle: "Không chốt",
    hint: "Deal đã mất",
    dotClass: "bg-rose-500",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((stage) => [stage.id, stage])) as Record<
  Stage,
  StageConfig
>;

// Mirror rule chuyển stage trong backend để UI chặn sớm các thao tác chắc chắn fail.
export const VALID_TRANSITIONS: Record<Stage, Stage[]> = {
  new_lead: ["qualified", "lost"],
  qualified: ["proposal_sent", "lost"],
  proposal_sent: ["in_negotiation", "lost"],
  in_negotiation: ["active", "lost"],
  active: ["completed_and_billed", "lost"],
  completed_and_billed: [],
  lost: [],
};
