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
};

export type GetFreelancersParams = {
  categoryIds?: string[];
  search?: string;
};

export type FreelancerListResponse = {
  items: Freelancer[];
  total: number;
};
