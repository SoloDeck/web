import { beforeEach, describe, expect, it } from "vitest";
import { donDuLieuPhienNguoiDung } from "./donDuLieuPhien";

/**
 * Khoá lỗi: máy dùng chung thì tài khoản sau thấy — và lưu đè — dữ liệu tài khoản trước.
 *
 * Đăng xuất trước đây chỉ xoá hai khoá token, còn bản nháp hồ sơ (`solodesk.profile.v1`),
 * việc AI đã ẩn kèm tên khách, lịch sử deal... nằm nguyên trong localStorage.  #Huynh
 */
describe("donDuLieuPhienNguoiDung", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("xoá mọi khoá mang tiền tố solodesk. trong localStorage", () => {
    localStorage.setItem("solodesk.profile.v1", JSON.stringify({ fullName: "Người trước" }));
    localStorage.setItem("solodesk.ai.dismissedJobs.v1", JSON.stringify(["job-1"]));
    localStorage.setItem("solodesk.deal-history.deal-abc", JSON.stringify([{ id: 1 }]));
    localStorage.setItem("solodesk.invoice-reminder-dismissed", JSON.stringify(["inv-1"]));
    localStorage.setItem("solodesk.auth.session.v1", "token");

    donDuLieuPhienNguoiDung();

    expect(localStorage.length).toBe(0);
  });

  it("xoá cả sessionStorage", () => {
    sessionStorage.setItem("solodesk.onboarding.skipped", "1");
    donDuLieuPhienNguoiDung();
    expect(sessionStorage.getItem("solodesk.onboarding.skipped")).toBeNull();
  });

  it("không đụng tới khoá của ứng dụng khác trên cùng tên miền", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("solodesk.profile.v1", "{}");

    donDuLieuPhienNguoiDung();

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("solodesk.profile.v1")).toBeNull();
  });

  it("xoá hết kể cả khi có nhiều khoá liên tiếp cùng tiền tố", () => {
    // Xoá ngay trong lúc duyệt làm chỉ số dịch đi và bỏ sót khoá kế tiếp — bài này khoá
    // lại cách gom tên trước rồi mới xoá.
    for (let i = 0; i < 20; i += 1) localStorage.setItem(`solodesk.deal-history.d${i}`, "[]");

    donDuLieuPhienNguoiDung();

    expect(localStorage.length).toBe(0);
  });

  it("không ném lỗi khi trình duyệt chặn kho lưu trữ", () => {
    const goc = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: storage bị chặn");
      },
    });

    // Dọn không được cũng không được chặn đường đăng xuất của người dùng.
    expect(() => donDuLieuPhienNguoiDung()).not.toThrow();

    if (goc) Object.defineProperty(window, "localStorage", goc);
  });
});
