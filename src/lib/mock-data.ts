export type Stage =
  | "new_lead"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "active"
  | "completed";

export type LeadScore = "hot" | "warm" | "cold";

export type Deal = {
  id: string;
  client: string;
  projectType: string;
  value: number; // VND
  score: LeadScore;
  stage: Stage;
  contact: string;
  channel: "Zalo" | "Email" | "Facebook";
  createdAt: string;
  notes: string;
  paymentStatus: "Chưa thanh toán" | "Đã đặt cọc" | "Đã thanh toán";
  paymentMethod: "MoMo" | "Vietcombank" | "Techcombank" | "—";
  history: { date: string; text: string }[];
};

export const STAGES: { id: Stage; title: string; hint: string }[] = [
  { id: "new_lead", title: "Lead Mới", hint: "Khách hàng vừa liên hệ" },
  { id: "qualified", title: "Đã Sàng Lọc", hint: "Phù hợp dịch vụ" },
  { id: "proposal_sent", title: "Đã Gửi Báo Giá", hint: "Chờ phản hồi" },
  { id: "negotiation", title: "Đang Đàm Phán", hint: "Trao đổi điều khoản" },
  { id: "active", title: "Đang Triển Khai", hint: "Dự án đang chạy" },
  { id: "completed", title: "Hoàn Thành & Đã Thu", hint: "Đã thanh toán" },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: "d1",
    client: "Công ty Cổ phần An Nhiên",
    projectType: "Thiết kế Bộ Nhận Diện Thương Hiệu",
    value: 25000000,
    score: "hot",
    stage: "new_lead",
    contact: "Chị Mai - 0901xxx234",
    channel: "Zalo",
    createdAt: "2026-05-08",
    notes: "Cần logo + tài liệu hướng dẫn thương hiệu trong 3 tuần.",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [
      { date: "2026-05-08", text: "Khách nhắn tin qua Zalo OA, hỏi báo giá nhận diện thương hiệu." },
    ],
  },
  {
    id: "d2",
    client: "Quán Cà Phê Hạt Nhỏ",
    projectType: "Tư vấn Đánh Giá Tối Ưu SEO Website",
    value: 8000000,
    score: "warm",
    stage: "new_lead",
    contact: "Anh Khoa - 0938xxx112",
    channel: "Facebook",
    createdAt: "2026-05-09",
    notes: "Website mới mở, cần đánh giá từ khoá địa phương.",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [{ date: "2026-05-09", text: "Liên hệ qua trang Fanpage." }],
  },
  {
    id: "d3",
    client: "Startup EduKid Vietnam",
    projectType: "Viết Nội Dung Khoá Học",
    value: 15000000,
    score: "warm",
    stage: "qualified",
    contact: "Chị Linh - 0912xxx889",
    channel: "Email",
    createdAt: "2026-05-04",
    notes: "20 bài viết blog + 5 trang đích (landing page), xuất bản trong tháng.",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [
      { date: "2026-05-04", text: "Cuộc họp giới thiệu qua Google Meet." },
      { date: "2026-05-06", text: "Xác nhận phạm vi công việc, chờ báo giá chính thức." },
    ],
  },
  {
    id: "d4",
    client: "Shop Thời Trang LaLuna",
    projectType: "Chụp Ảnh Sản Phẩm Bộ Sưu Tập Thời Trang (Lookbook)",
    value: 12000000,
    score: "hot",
    stage: "proposal_sent",
    contact: "Chị Hà - 0967xxx556",
    channel: "Zalo",
    createdAt: "2026-05-02",
    notes: "Đã gửi báo giá phiên bản 2.",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [
      { date: "2026-05-02", text: "Gửi báo giá lần 1." },
      { date: "2026-05-07", text: "Chỉnh sửa báo giá theo ý kiến phản hồi." },
    ],
  },
  {
    id: "d5",
    client: "Phòng Khám Nha Khoa Việt Đức",
    projectType: "Quản Trị Fanpage 3 Tháng",
    value: 18000000,
    score: "warm",
    stage: "negotiation",
    contact: "Anh Tuấn - 0903xxx411",
    channel: "Zalo",
    createdAt: "2026-04-28",
    notes: "Đang đàm phán điều khoản chỉ số hiệu quả (KPI) và hình ảnh.",
    paymentStatus: "Chưa thanh toán",
    paymentMethod: "—",
    history: [{ date: "2026-04-28", text: "Họp trực tuyến thống nhất phạm vi công việc." }],
  },
  {
    id: "d6",
    client: "Nhà Hàng Bếp Nhà",
    projectType: "Truyền Thông Tổng Thể - Khai Trương",
    value: 35000000,
    score: "hot",
    stage: "active",
    contact: "Chị Trang - 0918xxx700",
    channel: "Email",
    createdAt: "2026-04-15",
    notes: "Đang chạy chiến dịch khai trương cơ sở 2.",
    paymentStatus: "Đã đặt cọc",
    paymentMethod: "MoMo",
    history: [
      { date: "2026-04-15", text: "Ký hợp đồng, nhận cọc 50%." },
      { date: "2026-04-30", text: "Triển khai bài đăng giai đoạn 1." },
    ],
  },
  {
    id: "d7",
    client: "Anh Long - Cá Nhân",
    projectType: "Thiết Kế Slide Thuyết Trình Gọi Vốn",
    value: 6000000,
    score: "cold",
    stage: "active",
    contact: "Anh Long - 0977xxx320",
    channel: "Zalo",
    createdAt: "2026-04-20",
    notes: "Slide gọi vốn vòng hạt giống (seed).",
    paymentStatus: "Đã đặt cọc",
    paymentMethod: "Vietcombank",
    history: [{ date: "2026-04-20", text: "Nhận yêu cầu dự án & ảnh tư liệu." }],
  },
  {
    id: "d8",
    client: "Spa Thanh Tâm",
    projectType: "Quay Dựng Phim Quảng Cáo (TVC) 30s",
    value: 22000000,
    score: "warm",
    stage: "completed",
    contact: "Chị Thảo - 0939xxx108",
    channel: "Zalo",
    createdAt: "2026-03-10",
    notes: "Đã bàn giao tài liệu hoàn thiện, xuất hoá đơn.",
    paymentStatus: "Đã thanh toán",
    paymentMethod: "Techcombank",
    history: [
      { date: "2026-03-10", text: "Ký hợp đồng." },
      { date: "2026-04-02", text: "Bàn giao phim quảng cáo hoàn thiện." },
      { date: "2026-04-05", text: "Nhận thanh toán đủ qua Techcombank." },
    ],
  },
  {
    id: "d9",
    client: "Trung Tâm Tiếng Anh BrightPath",
    projectType: "Thiết kế Trang Đích Website (Landing Page)",
    value: 14000000,
    score: "hot",
    stage: "completed",
    contact: "Cô Yến - 0908xxx221",
    channel: "Email",
    createdAt: "2026-02-22",
    notes: "Hoàn thành đúng thời hạn.",
    paymentStatus: "Đã thanh toán",
    paymentMethod: "MoMo",
    history: [{ date: "2026-03-15", text: "Bàn giao website." }],
  },
];

export const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
