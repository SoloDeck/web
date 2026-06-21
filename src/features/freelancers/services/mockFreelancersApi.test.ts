import { describe, expect, it } from "vitest";
import { getFreelancers } from "./mockFreelancersApi";

describe("getFreelancers", () => {
  it("returns the complete mock directory without filters", async () => {
    const result = await getFreelancers();

    expect(result.total).toBe(8);
    expect(result.items).toHaveLength(8);
  });

  it("filters by any selected category", async () => {
    const result = await getFreelancers({ categoryIds: ["design", "marketing"] });

    expect(result.items.map((freelancer) => freelancer.name)).toEqual([
      "Nguyễn Minh Tuấn",
      "Lê Đức Anh",
      "Ngô Hải Yến",
    ]);
  });

  it("searches the freelancer name, title and bio", async () => {
    const byName = await getFreelancers({ search: "Ngô Hải Yến" });
    const byTitle = await getFreelancers({ search: "data analyst" });
    const byBio = await getFreelancers({ search: "Google Play" });

    expect(byName.items[0]?.id).toBe("6");
    expect(byTitle.items[0]?.id).toBe("7");
    expect(byBio.items[0]?.id).toBe("5");
  });

  it("combines category and search filters", async () => {
    const result = await getFreelancers({
      categoryIds: ["dev"],
      search: "Flutter",
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe("Võ Thanh Bình");
  });
});
