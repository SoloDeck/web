import axiosClient from "@/configs/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { Freelancer, FreelancerListResponse } from "@/features/freelancers/types";

// ---------------------------------------------------------------------------
// Backend response types
// ---------------------------------------------------------------------------

type FreelancerApiResponse = {
  id: string;
  full_name: string;
  professional_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  skills: string[];
  service_categories: string[];
  rating_average: number | null;
  rating_count: number;
  completed_project_count: number;
  is_new: boolean;
  created_at: string;
  /** Chỉ có ở `GET /public/freelancers/{id}`; danh sách tìm kiếm trả `null`. */
  intake_share_token?: string | null;
};

// PaginatedResponse shape (different from ApiResponse<T>)
type PaginatedApiResponse = {
  success: boolean;
  code: number;
  timestamp: string;
  data: FreelancerApiResponse[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

// ---------------------------------------------------------------------------
// Category slug mapping (frontend "dev" ↔ backend "programming")
// ---------------------------------------------------------------------------

const TO_BACKEND: Record<string, string> = { dev: "programming" };
const FROM_BACKEND: Record<string, string> = { programming: "dev" };

function toBackendSlug(slug: string): string {
  return TO_BACKEND[slug] ?? slug;
}
function fromBackendSlug(slug: string): string {
  return FROM_BACKEND[slug] ?? slug;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function mapFreelancer(r: FreelancerApiResponse): Freelancer {
  return {
    id: r.id,
    name: r.full_name,
    title: r.professional_title ?? "",
    initials: getInitials(r.full_name),
    avatarBg: getAvatarBg(r.full_name),
    categoryIds: r.service_categories.map(fromBackendSlug),
    rating: r.rating_average ?? 0,
    reviews: r.rating_count,
    projects: r.completed_project_count,
    bio: r.bio ?? "",
    verified: false,
    badge: r.is_new ? "Mới" : null,
    portfolioUrl: r.portfolio_url ?? undefined,
    skills: r.skills ?? [],
    intakeShareToken: r.intake_share_token ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listFreelancers(params: {
  categoryIds?: string[];
  search?: string;
  page?: number;
}): Promise<FreelancerListResponse> {
  const { data } = await axiosClient.get<PaginatedApiResponse>("/public/freelancers", {
    params: {
      q: params.search || undefined,
      categories: params.categoryIds?.map(toBackendSlug),
      page: params.page ?? 1,
      page_size: 20,
    },
    paramsSerializer: { indexes: null },
  });
  return {
    items: data.data.map(mapFreelancer),
    total: data.pagination.total,
  };
}

export async function getFreelancer(id: string): Promise<Freelancer> {
  const { data } = await axiosClient.get<ApiResponse<FreelancerApiResponse>>(
    `/public/freelancers/${id}`,
  );
  return mapFreelancer(data.data);
}
