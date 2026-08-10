import { test, expect } from '@playwright/test'

// Smoke test: the app shell boots and renders without a crash.
// Replace/extend with critical user flows (auth, CRUD) as features land.
test('app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('#root')).toBeAttached()
})

// Loại test DUY NHẤT bắt được lỗi chunk lazy không nạp nổi. Từ khi route dùng
// `lazyRouteComponent`, mã của mỗi trang nằm ở file riêng và chỉ tải khi điều hướng —
// Vitest chạy trên nguồn đã gộp nên về mặt cấu trúc không thể thấy lỗi đó.
//
// Đi qua CTA trong thân hero (nút mới thêm) chứ không phải nút ở navbar: cùng đích nhưng
// đây là nút nằm trong luồng đọc, và cũng là nút dễ bị bỏ quên ở lần sửa chữ tiếp theo.
test('trang giới thiệu dẫn được vào màn đăng nhập', async ({ page }) => {
  await page.goto('/home')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.locator('#trang-chu').getByRole('link', { name: /Bắt đầu miễn phí/ }).click()

  await expect(page).toHaveURL(/\/login$/)
})
