import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileSeoHead } from "./ProfileSeoHead";
import type { PublicProfileResponse } from "@/services/intakeService";

const PROFILE: PublicProfileResponse = {
  full_name: "Trần Thị Thiết Kế",
  professional_title: "Thiết kế thương hiệu",
  bio: "5 năm làm nhận diện thương hiệu cho doanh nghiệp nhỏ.",
  avatar_url: null,
  cover_url: null,
  brand_color: null,
  skills: ["Figma", "Thiết kế logo"],
  portfolio_url: null,
};

/** React 19 tự nhấc `<title>`/`<meta>` lên `<head>`, nên đọc thẳng từ document. */
function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute("content") ?? null;
}

describe("ProfileSeoHead", () => {
  it("dựng tiêu đề và mô tả từ hồ sơ", async () => {
    render(<ProfileSeoHead profile={PROFILE} slug="thuthuy" />);

    await waitFor(() => {
      expect(document.title).toBe("Trần Thị Thiết Kế — Thiết kế thương hiệu | SoloDesk");
    });
    expect(metaContent('meta[name="description"]')).toBe(PROFILE.bio);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://solodesk.space/thuthuy",
    );
    expect(metaContent('meta[property="og:url"]')).toBe("https://solodesk.space/thuthuy");
  });

  it("cắt mô tả quá dài để Google không cắt giữa câu", async () => {
    render(<ProfileSeoHead profile={{ ...PROFILE, bio: "a".repeat(400) }} slug="a" />);

    await waitFor(() => {
      expect(metaContent('meta[name="description"]')?.length).toBe(160);
    });
    expect(metaContent('meta[name="description"]')?.endsWith("…")).toBe(true);
  });

  it("bỏ qua avatar data URL và rơi về ảnh mặc định", async () => {
    render(
      <ProfileSeoHead
        profile={{ ...PROFILE, avatar_url: "data:image/png;base64,AAAA" }}
        slug="a"
      />,
    );

    await waitFor(() => {
      expect(metaContent('meta[property="og:image"]')).toBe(
        "https://solodesk.space/og-default.png",
      );
    });
  });

  it("dùng avatar https làm ảnh xem trước khi có", async () => {
    render(
      <ProfileSeoHead
        profile={{ ...PROFILE, avatar_url: "https://cdn.example.com/a.png" }}
        slug="a"
      />,
    );

    await waitFor(() => {
      expect(metaContent('meta[property="og:image"]')).toBe("https://cdn.example.com/a.png");
    });
  });

  it("không có bio thì mô tả ghép từ nghề và kỹ năng", async () => {
    render(<ProfileSeoHead profile={{ ...PROFILE, bio: null }} slug="a" />);

    await waitFor(() => {
      expect(metaContent('meta[name="description"]')).toBe(
        "Thiết kế thương hiệu · Figma · Thiết kế logo",
      );
    });
  });
});
