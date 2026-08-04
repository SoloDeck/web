import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { FreelancerProfilePage } from "./FreelancerProfilePage";
import type { Freelancer } from "@/features/freelancers/types";

// Link được dựng thành thẻ <a> thật, có thay `$param` trong `to` bằng giá trị trong
// `params`. Phải thay thật thì phép kiểm href mới chứng minh được nút trỏ đúng token —
// nếu mock bỏ qua `params` thì test sẽ đậu kể cả khi trang dựng sai đường dẫn.  #Huynh
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const mockUseFreelancer = vi.fn();
vi.mock("@/features/freelancers/hooks/useFreelancers", () => ({
  useFreelancer: (id: string) => mockUseFreelancer(id),
}));

const FREELANCER: Freelancer = {
  id: "fl-1",
  name: "Trần Thị Thiết Kế",
  title: "UI/UX Designer",
  initials: "TK",
  avatarBg: "bg-violet-500",
  categoryIds: ["design"],
  rating: 4.8,
  reviews: 12,
  projects: 9,
  bio: "Chuyên thiết kế giao diện cho startup.",
  verified: false,
  badge: null,
  skills: ["Figma", "Design System"],
  intakeShareToken: "tok-abc123",
};

function renderWith(data: Partial<Freelancer> | null, state = {}) {
  mockUseFreelancer.mockReturnValue({
    data: data === null ? undefined : { ...FREELANCER, ...data },
    isPending: false,
    isError: false,
    ...state,
  });
  return render(<FreelancerProfilePage id="fl-1" />);
}

describe("FreelancerProfilePage", () => {
  it("nút gửi yêu cầu trỏ đúng biểu mẫu của freelancer đó", () => {
    renderWith({});

    const cta = screen.getByRole("link", { name: /Gửi yêu cầu cho Kế/i });
    expect(cta).toHaveAttribute("href", "/bieu-mau/tok-abc123");
  });

  it("không có token thì ẩn nút thay vì dẫn tới trang lỗi", () => {
    renderWith({ intakeShareToken: undefined });

    expect(screen.queryByRole("link", { name: /Gửi yêu cầu/i })).not.toBeInTheDocument();
    expect(screen.getByText(/chưa mở nhận yêu cầu/i)).toBeInTheDocument();
  });

  it("hồ sơ không tồn tại hoặc đã tắt công khai thì mời tìm người khác", () => {
    renderWith(null, { isError: true });

    expect(screen.getByText(/Không tìm thấy hồ sơ này/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tìm freelancer khác/i })).toHaveAttribute(
      "href",
      "/find-freelancer",
    );
  });
});
