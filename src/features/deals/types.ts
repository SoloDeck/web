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

/**
 * Hóa đơn đã xuất cho một mốc "Thu tiền:". CHỈ có ở loại task đó.
 *
 * Hàng task hiện nhãn suy từ `status` của hóa đơn, KHÔNG thêm trạng thái mới cho task:
 * `task_status` bên backend là enum 4 giá trị (todo/in_progress/review/done), mà "đã gửi
 * hóa đơn" vốn là chuyện của hóa đơn chứ không phải của việc phải làm.  #Huynh
 */
export type TaskInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
};

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
  /**
   * Số tiền phải thu. KHÔNG `null` = đây là task THU TIỀN (sinh từ một hạng mục chi phí của
   * báo giá đã chốt), và là dấu nhận biết CHÍNH THỨC — xem `paymentTasks.isPaymentTask`.
   */
  billingAmount?: number | null;
  /**
   * `"on_signing"` = đòi được NGAY (khoản đặt cọc); `"on_completion"` = đòi khi công việc
   * xong. `null` với task cũ và task freelancer tự thêm — giao diện im lặng chứ không đoán.
   */
  billingDueType?: "on_signing" | "on_completion" | null;
  /**
   * Thứ tự hiển thị trong dự án. Với task thu tiền, đây chính là thứ tự hạng mục chi phí trên
   * tờ báo giá — freelancer kéo sắp lại ở mục 7 thì bảng việc phải theo.
   *
   * Không suy ra được từ `createdAt`: cả lô task thu tiền sinh trong một transaction nên
   * `createdAt` bằng nhau tuyệt đối, sắp theo nó là thứ tự tuỳ lần truy vấn. Tuỳ chọn để các
   * bản ghi cũ và fixture trong test không phải khai.  #Huynh
   */
  position?: number;
  /** `null`/vắng mặt = chưa xuất hóa đơn cho khoản này. */
  invoice?: TaskInvoice | null;
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
  /**
   * Ngày deal vào giai đoạn cuối (hoàn thành / không chốt được).
   *
   * Cũng chính là mốc quyết định dự án đã vào KHO LƯU TRỮ hay chưa — kho là thứ suy ra từ
   * ngày này, không phải một cột trạng thái riêng.  #Huynh
   */
  closedAt?: string | null;
  notes: string;
  /** Mốc thời gian KHÁCH nêu. Vào khối chấm điểm — tiêu chí "Thời gian". */
  desiredTimeline?: string;
  /**
   * Ngân sách KHÁCH nêu, ghi lại sau khi hỏi được.
   *
   * KHÁC `value` (`estimated_value` ở BE) là con số freelancer tự ước để tính doanh thu và
   * bị CẤM dùng để chấm điểm. Ô này là lời khách nên ĐƯỢC chấm.
   */
  clientBudget?: string;
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
