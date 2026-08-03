export type FreelancerBadge = "Top Rated" | "Nổi bật" | "Mới";

export type Freelancer = {
  id: string;
  name: string;
  title: string;
  initials: string;
  avatarBg: string;
  categoryIds: string[];
  rating: number;
  reviews: number;
  projects: number;
  bio: string;
  verified: boolean;
  badge: FreelancerBadge | null;
  portfolioUrl?: string;
  /** Kỹ năng freelancer tự khai. Chỉ trang hồ sơ dùng, thẻ trong danh sách thì không. */
  skills?: string[];
  /**
   * Token biểu mẫu tiếp nhận — dựng nút "Gửi yêu cầu" trỏ tới `/bieu-mau/{token}`.
   *
   * CHỈ có ở trang hồ sơ (`getFreelancer`); danh sách tìm kiếm không trả về. `undefined`
   * cũng là trường hợp freelancer chưa có biểu mẫu — lúc đó ẩn nút, đừng dẫn tới 404.
   */
  intakeShareToken?: string;
};

export type GetFreelancersParams = {
  categoryIds?: string[];
  search?: string;
};

export type FreelancerListResponse = {
  items: Freelancer[];
  total: number;
};
