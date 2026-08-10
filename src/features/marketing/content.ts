import {
  BadgeCheck,
  Banknote,
  Bell,
  BellRing,
  Brain,
  FileSignature,
  FileText,
  KanbanSquare,
  MessageSquare,
  Receipt,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { STAGES } from "@/features/deals/types";

/**
 * Toàn bộ chữ của trang giới thiệu, gom về một file.
 *
 * Lý do gom: chính phần chữ mới là thứ hội đồng đối chiếu với Phiếu đăng ký đề tài.
 * Mở một file đọc song song với phiếu dễ hơn nhiều so với lần mò trong mười file
 * component. Đổi lại, các file component chỉ export component nên không cần
 * `eslint-disable react-refresh/only-export-components`.
 *
 * NGUYÊN TẮC VIẾT: nhãn ngắn, không đoạn văn. Bản đầu nhồi 5.270 ký tự lên trang để
 * "phòng thủ" trước hội đồng — sai chỗ, vì giải thích là việc nói miệng lúc bảo vệ.
 * Chữ dài không làm trang trông xịn, chỉ làm nó dài dòng.  #Huynh
 */

// ---------------------------------------------------------------------------
// Tên đề tài — nguyên văn Phiếu SU26SE083
// ---------------------------------------------------------------------------

/**
 * Chép nguyên văn từ `Phieu_SU26SE083_VI.md` mục 3.1.
 *
 * Dấu nối là EN DASH (U+2013), không phải gạch nối (U+002D). Để trong hằng thay vì
 * gõ thẳng vào JSX để test khẳng định được và để không ai sửa nhầm thành gạch ngắn.
 *
 * Chỉ giữ bản tiếng Việt: phiếu đăng ký sản phẩm dành cho chuyên gia dịch vụ độc lập
 * VIỆT NAM, nên trang tiếng Việt không có lý do gì phải kèm cả tên tiếng Anh.
 */
export const OFFICIAL_TITLE_VI =
  "SoloDesk – Hệ Thống Quản Lý Khách Hàng và Hợp Đồng Thông Minh Dành Cho Chuyên Gia Dịch Vụ Độc Lập Việt Nam";

/** Mã đề tài, hiện ở footer để hội đồng đối chiếu nhanh. */
export const PROJECT_CODE = "SU26SE083";

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/**
 * Hero không còn khoá chữ cho nút nào: nút "Bắt đầu miễn phí" duy nhất nằm ở navbar
 * (`LandingChrome.tsx`), và lối vào thứ hai "Tôi cần thuê — Tìm freelancer" đã bỏ cùng
 * danh bạ. Freelancer là người dùng duy nhất của hệ thống.  #Huynh
 */
export const HERO = {
  titleLead: "Quản lý khách hàng và hợp đồng",
  titleAccent: "cho chuyên gia dịch vụ độc lập",
  subtitle: "Từ yêu cầu đầu tiên tới lúc thu tiền, trên một bảng Kanban sáu giai đoạn.",
} as const;

// ---------------------------------------------------------------------------
// Dải số liệu
// ---------------------------------------------------------------------------

/**
 * Bốn con số, không con nào cần chú thích.
 *
 * Bản trước có "20 giây" và "3 giây" lấy từ yêu cầu phi chức năng của phiếu, nhưng đó
 * là MỤC TIÊU chứ không phải số đo, nên phải kèm một đoạn đính chính dài. Bỏ luôn hai
 * số đó thì vừa gọn vừa hết rủi ro. Số 10 đếm đúng lưới phân hệ bên dưới.
 */
export const FACTS = [
  { value: "6", label: "Giai đoạn Kanban" },
  { value: "3", label: "Giai đoạn AI" },
  { value: "10", label: "Phân hệ nghiệp vụ" },
  { value: "0 đ", label: "Bắt đầu miễn phí" },
] as const;

// ---------------------------------------------------------------------------
// Ba điểm đau — Phiếu mục a "Bối cảnh"
// ---------------------------------------------------------------------------

export const PAIN_HEADER = {
  eyebrow: "Vấn đề",
  title: "Ba việc khiến chuyên gia dịch vụ độc lập mất tiền",
} as const;

export const PAIN_POINTS = [
  {
    Icon: Search,
    title: "Không biết yêu cầu nào đáng theo",
    desc: "Khách nhắn từ Zalo, Facebook, email — không có cách nào chấm.",
  },
  {
    Icon: FileSignature,
    title: "Soạn lại báo giá, hợp đồng mỗi lần",
    desc: "Mỗi khách một file Word mới, tốn cả buổi tối.",
  },
  {
    Icon: Wallet,
    title: "Quên đòi tiền, quên khách cũ",
    desc: "Hóa đơn tới hạn không ai nhắc, doanh thu rơi ở chỗ không ai nhìn.",
  },
] as const;

// ---------------------------------------------------------------------------
// Sáu giai đoạn pipeline
// ---------------------------------------------------------------------------

export const PIPELINE_HEADER = {
  eyebrow: "Pipeline",
  title: "Một bảng Kanban, sáu giai đoạn",
  body: "Đúng sáu giai đoạn đăng ký trong phiếu đề tài, kéo–thả thật.",
} as const;

/** Tên tiếng Anh của từng giai đoạn, đúng như phiếu liệt kê. */
const PIPELINE_EN: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  in_negotiation: "In Negotiation",
  active: "Active",
  completed_and_billed: "Completed & Billed",
};

/**
 * Sáu giai đoạn, đọc thẳng từ cấu hình cột của bảng Kanban thật.
 *
 * Cố ý KHÔNG gõ lại tên cột: trang giới thiệu không được phép gọi tên một giai đoạn
 * mà sản phẩm không có. Ai đổi tên cột trong `features/deals/types` thì trang này đổi
 * theo, không có đường lệch.
 *
 * Lọc bỏ `lost` vì bảng Kanban cũng không render cột đó (`KanbanBoard` lọc y hệt), và
 * phiếu chỉ đăng ký SÁU giai đoạn.  #Huynh
 */
export const PIPELINE_STAGES = STAGES.filter((stage) => stage.id !== "lost").map((stage) => ({
  id: stage.id,
  title: stage.title,
  shortTitle: stage.shortTitle,
  dotClass: stage.dotClass,
  en: PIPELINE_EN[stage.id] ?? stage.title,
}));

// ---------------------------------------------------------------------------
// Ba giai đoạn AI — Phiếu "Engine Tự động hóa AI"
// ---------------------------------------------------------------------------

export const AI_HEADER = {
  eyebrow: "Engine AI",
  title: "Ba giai đoạn AI gánh việc hành chính",
  body: "Pipeline LangChain ba giai đoạn, đúng như đăng ký trong phiếu.",
} as const;

/**
 * Câu giới hạn trách nhiệm về hợp đồng — giữ lại dù đang cắt chữ.
 *
 * Phiếu gốc IN ĐẬM cụm "not formal legal document"; một bản dịch trước đây từng bỏ mất
 * và bị ghi nhận là lỗi. Trang này vẫn quảng cáo "AI soạn hợp đồng", nên đây là câu
 * giới hạn phạm vi trách nhiệm chứ không phải chữ marketing — rút ngắn được, bỏ thì
 * không. Để trong MỘT element để test bắt được nguyên câu.  #Huynh
 */
export const CONTRACT_DISCLAIMER =
  "Hợp đồng dịch vụ đơn giản, không phải văn bản pháp lý chính thức.";

export const AI_STAGES = [
  {
    step: "Giai đoạn 1",
    name: "Lead Qualifier",
    nameVi: "Chấm điểm lead",
    Icon: Brain,
    body: "Đọc yêu cầu của khách, trả về điểm 0–100 kèm lý giải và khoảng giá gợi ý.",
  },
  {
    step: "Giai đoạn 2",
    name: "Document Drafter",
    nameVi: "Soạn thảo tài liệu",
    Icon: FileSignature,
    body: "Viết báo giá và hợp đồng tiếng Việt từ dữ liệu lead, xuất PDF tải về.",
  },
  {
    step: "Giai đoạn 3",
    name: "Follow-up Scheduler",
    nameVi: "Lên lịch nhắc nhở",
    Icon: Bell,
    body: "Nhắc đến hạn, nhắc quá hạn, tái kết nối khách cũ — qua email hoặc Zalo OA.",
  },
] as const;

/** Ngưỡng lấy từ `backend/src/ai/lead_qualifier/scoring.py` — chứng minh được bằng code. */
export const SCORE_THRESHOLDS = "HOT ≥ 75 · WARM 45–74 · COLD < 45";

// ---------------------------------------------------------------------------
// Lưới phân hệ
// ---------------------------------------------------------------------------

export const FEATURE_HEADER = {
  eyebrow: "Phân hệ",
  title: "Mười phân hệ, một chỗ làm việc",
} as const;

/**
 * Mười phân hệ, mỗi ô CHỈ một nhãn — không mô tả.
 *
 * Đây là chỗ gánh phần "trông nhiều tính năng" thay cho các đoạn văn đã cắt: dày về
 * hình mà tổng chỉ khoảng 200 ký tự. Cả mười đều đã kiểm chứng là có thật trong mã
 * nguồn, và con số 10 ở dải số liệu chính là đếm lưới này — lệch một ô là lệch cả hai
 * chỗ, nên có test đếm.  #Huynh
 */
export const FEATURE_TILES = [
  { Icon: KanbanSquare, label: "Kanban 6 giai đoạn" },
  { Icon: Brain, label: "Chấm điểm lead AI" },
  { Icon: FileText, label: "Báo giá tiếng Việt" },
  { Icon: FileSignature, label: "Hợp đồng tiếng Việt" },
  { Icon: Receipt, label: "Xuất PDF" },
  { Icon: BellRing, label: "Nhắc nhở tự động" },
  { Icon: MessageSquare, label: "Zalo OA" },
  { Icon: Users, label: "Hồ sơ khách hàng" },
  { Icon: Banknote, label: "Hoá đơn & thanh toán" },
  { Icon: TrendingUp, label: "Bảng doanh thu" },
] as const;

// ---------------------------------------------------------------------------
// Cách vận hành — freelancer là người dùng duy nhất, khách vào qua link riêng
// ---------------------------------------------------------------------------

export const AUDIENCE_HEADER = {
  eyebrow: "Cách vận hành",
  title: "Khách của bạn không cần tài khoản",
} as const;

/**
 * Cố ý BỎ "giá trị deal trung bình" dù phiếu có liệt kê: `modules/analytics` không có
 * trường nào tính chỉ số đó và dashboard cũng không render ô nào như vậy. Phiếu hứa
 * thì phiếu chịu; trang này chỉ nói thứ bấm vào là thấy.  #Huynh
 */
export const FREELANCER_FEATURES = [
  "Bảng Kanban sáu giai đoạn, kéo–thả",
  "AI chấm điểm lead HOT / WARM / COLD",
  "Báo giá và hợp đồng tiếng Việt, xuất PDF",
  "Nhắc thanh toán và tái kết nối tự động",
  "Bảng doanh thu và tỷ lệ chốt deal",
] as const;

/**
 * Ba bước của luồng tiếp nhận — thay khối "khách duyệt danh bạ freelancer" đã bỏ.
 *
 * SoloDesk là CRM riêng của TỪNG freelancer, không phải sàn để khách vào chọn thợ: khách
 * chỉ tới được khi chính freelancer gửi link của mình. Trang giới thiệu trước đây mở hẳn
 * một cửa "Tôi cần thuê" dẫn vào danh bạ, khiến sản phẩm đọc như một cái chợ — sai với
 * phiếu đề tài, vốn chỉ có đúng một dòng về khách hàng: "biểu mẫu tiếp nhận nhúng được
 * (link chia sẻ để khách hàng tự điền)".  #Huynh
 */
export const INTAKE_FLOW = [
  "Bạn gửi link biểu mẫu riêng cho khách — Zalo, Facebook, email, chữ ký thư",
  "Khách điền yêu cầu ngay trên link đó, không cần đăng ký tài khoản",
  "Yêu cầu rơi thẳng vào Kanban của bạn và được AI chấm điểm HOT / WARM / COLD",
] as const;

// ---------------------------------------------------------------------------
// Bảng giá — số lấy từ seeder gói đăng ký
// ---------------------------------------------------------------------------

export const PRICING_HEADER = {
  eyebrow: "Gói dịch vụ",
  title: "Ba gói, bắt đầu từ 0 đồng",
} as const;

/** Giá và hạn mức khớp `backend/src/infrastructure/database/seeders/plans.py`. */
export const PLANS = [
  {
    name: "Free",
    price: "0 đ",
    period: null,
    highlight: false,
    badge: null,
    Icon: BadgeCheck,
    features: ["10 khách hàng", "10 deal", "Chưa mở tính năng AI", "Chưa xuất PDF"],
  },
  {
    name: "Pro",
    price: "199.000 đ",
    period: "/tháng",
    highlight: true,
    badge: "Phổ biến",
    Icon: BadgeCheck,
    features: [
      "Không giới hạn khách hàng",
      "Không giới hạn deal",
      "50 lượt AI mỗi tháng",
      "Xuất PDF báo giá & hợp đồng",
    ],
  },
  {
    name: "Agency",
    price: "599.000 đ",
    period: "/tháng",
    highlight: false,
    badge: null,
    Icon: BadgeCheck,
    features: [
      "Không giới hạn khách hàng",
      "Không giới hạn deal",
      "500 lượt AI mỗi tháng",
      "Xuất PDF báo giá & hợp đồng",
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Kêu gọi cuối trang + chân trang
// ---------------------------------------------------------------------------

/**
 * Khoanh phạm vi trang này về "ứng dụng web".
 *
 * Phiếu có đăng ký thêm một ứng dụng đồng hành Flutter, nhưng repo không có file .dart
 * nào. Câu này không nói gì sai và cũng không tự khai.  #Huynh
 */
export const FOOTER_SCOPE_NOTE = `Đồ án tốt nghiệp SEP490 · Mã đề tài ${PROJECT_CODE} · Ứng dụng web.`;

/**
 * Neo tới đủ SÁU dải nội dung của trang.
 *
 * Bản trước chỉ có ba neo trong khi trang có sáu dải — thanh menu trông như liệt kê
 * thiếu. Mỗi `href` phải khớp một `id` có thật; dải nào được neo tới cũng cần
 * `scroll-mt-20` để tiêu đề không bị navbar cao 64px che.  #Huynh
 */
export const NAV_ANCHORS = [
  { href: "#trang-chu", label: "Trang chủ" },
  { href: "#van-de", label: "Vấn đề" },
  { href: "#quy-trinh", label: "Quy trình" },
  { href: "#ai", label: "Engine AI" },
  { href: "#phan-he", label: "Phân hệ" },
  // Nhãn phải khớp tiêu đề khối (`AUDIENCE_HEADER`); `id` giữ nguyên "danh-cho-ai" để
  // link đã chia sẻ ra ngoài không chết.
  { href: "#danh-cho-ai", label: "Cách vận hành" },
  { href: "#bang-gia", label: "Bảng giá" },
] as const;
