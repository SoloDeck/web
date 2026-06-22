import { MOCK_FREELANCERS } from "@/features/freelancers/data/mockFreelancers";
import type {
  Freelancer,
  FreelancerListResponse,
  GetFreelancersParams,
} from "@/features/freelancers/types";

const MOCK_LATENCY_MS = 350;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("vi");
}

function matchesSearch(freelancer: Freelancer, search: string): boolean {
  const normalizedSearch = normalize(search);
  if (!normalizedSearch) return true;

  return [freelancer.name, freelancer.title, freelancer.bio].some((value) =>
    normalize(value).includes(normalizedSearch),
  );
}

function waitForMockLatency(): Promise<void> {
  if (import.meta.env.MODE === "test") return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, MOCK_LATENCY_MS));
}

/**
 * Simulates GET /public/freelancers until the backend exposes a public directory.
 * Filtering stays here so replacing this mock with axios later does not change the UI.
 */
export async function getFreelancers(
  params: GetFreelancersParams = {},
): Promise<FreelancerListResponse> {
  await waitForMockLatency();

  const categoryIds = params.categoryIds ?? [];
  const items = MOCK_FREELANCERS.filter((freelancer) => {
    const matchesCategory =
      categoryIds.length === 0 ||
      freelancer.categoryIds.some((categoryId) => categoryIds.includes(categoryId));
    return matchesCategory && matchesSearch(freelancer, params.search ?? "");
  }).map((freelancer) => ({
    ...freelancer,
    categoryIds: [...freelancer.categoryIds],
  }));

  return { items, total: items.length };
}
