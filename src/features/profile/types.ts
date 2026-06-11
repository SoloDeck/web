export type ServiceCategory =
  | "Brand & Content Designer"
  | "Web Developer"
  | "Marketing Consultant"
  | "Photographer / Videographer"
  | "Copywriter / SEO"
  | "Business Coach";

export type PricingTier = "Starter" | "Professional" | "Premium";

export type ContractClause = {
  id: string;
  title: string;
  body_vi: string;
  body_en: string;
  enabled: boolean;
};

export type Profile = {
  fullName: string;
  displayTitle: string;
  email: string;
  phone: string;
  taxCode: string;
  serviceCategory: ServiceCategory;
  pricingTier: PricingTier;
  hourlyRate: number;
  zaloOA: {
    appId: string;
    secret: string;
    accessToken: string;
    connected: boolean;
  };
  bank: {
    name: string;
    accountNumber: string;
    accountHolder: string;
  };
  momo: {
    phone: string;
    holder: string;
  };
  bilingualContracts: boolean;
};

export const DEFAULT_PROFILE: Profile = {
  fullName: "Minh Nguyễn",
  displayTitle: "Brand & Content Designer",
  email: "minh.nguyen@solodesk.space",
  phone: "0909123456",
  taxCode: "8123456789",
  serviceCategory: "Brand & Content Designer",
  pricingTier: "Professional",
  hourlyRate: 350000,
  zaloOA: {
    appId: "ZOA-1029384756",
    secret: "••••••••••••",
    accessToken: "••••••••",
    connected: true,
  },
  bank: {
    name: "Vietcombank",
    accountNumber: "0123456789",
    accountHolder: "NGUYEN VAN MINH",
  },
  momo: {
    phone: "0909123456",
    holder: "MINH NGUYEN",
  },
  bilingualContracts: true,
};

export const DEFAULT_CLAUSES: ContractClause[] = [
  {
    id: "c1",
    title: "Phạm vi công việc",
    body_vi:
      "Bên B cam kết thực hiện công việc theo đúng mô tả, hạng mục và số lượng đã thống nhất trong phụ lục đính kèm.",
    body_en:
      "Party B commits to delivering the work as described, in the scope and quantity agreed in the appendix.",
    enabled: true,
  },
  {
    id: "c2",
    title: "Tiến độ & Bàn giao",
    body_vi:
      "Tiến độ thực hiện được chia thành các giai đoạn rõ ràng. Mỗi giai đoạn bàn giao đi kèm biên bản nghiệm thu.",
    body_en:
      "The schedule is divided into clear phases. Each phase delivery is accompanied by an acceptance record.",
    enabled: true,
  },
  {
    id: "c3",
    title: "Thanh toán",
    body_vi:
      "Khách hàng thanh toán 50% giá trị hợp đồng khi ký kết, 50% còn lại trước khi nhận file gốc/bàn giao chính thức.",
    body_en:
      "Client pays 50% of the contract value upon signing, and the remaining 50% before receiving the source files / final handover.",
    enabled: true,
  },
  {
    id: "c4",
    title: "Sửa đổi & Số vòng chỉnh sửa",
    body_vi:
      "Mỗi giai đoạn được hỗ trợ tối đa 2 vòng chỉnh sửa. Yêu cầu phát sinh sẽ được tính phí theo giờ.",
    body_en:
      "Each phase includes up to 2 rounds of revisions. Additional changes will be billed hourly.",
    enabled: true,
  },
  {
    id: "c5",
    title: "Bảo mật thông tin",
    body_vi:
      "Hai bên cam kết bảo mật toàn bộ thông tin, tài liệu trao đổi trong và sau khi kết thúc hợp đồng.",
    body_en:
      "Both parties commit to keeping all exchanged information and documents confidential during and after the contract.",
    enabled: true,
  },
  {
    id: "c6",
    title: "Quyền sở hữu trí tuệ",
    body_vi:
      "Quyền sở hữu sản phẩm cuối cùng được chuyển giao cho Khách hàng sau khi hoàn tất 100% nghĩa vụ thanh toán.",
    body_en:
      "Ownership of the final deliverable transfers to the Client upon full payment.",
    enabled: false,
  },
];
