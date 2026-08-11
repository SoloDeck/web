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
// Trang giới thiệu KHÔNG được phụ thuộc vào backend.
//
// Đây chính là con bug làm CI đỏ suốt hai lần merge liên tiếp mà không ai lần ra: job e2e
// chạy không có backend, `/auth/config` hỏng, và `App.tsx` khi đó dựng màn "Lỗi tải cấu
// hình" che TOÀN BỘ ứng dụng — nên `/home` không bao giờ có nổi cái `<h1>`.
//
// Tại máy lập trình viên thì backend đang chạy nên test cũ luôn xanh; chỉ CI mới thấy.
// Test này chặn thẳng request đó để chỗ nào cũng bắt được, không phải chờ merge xong mới lộ.
test('trang giới thiệu dựng được khi không có backend', async ({ page }) => {
  await page.route('**/auth/config', (route) => route.abort())

  await page.goto('/home')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/Lỗi tải cấu hình/)).toHaveCount(0)
})

test('trang giới thiệu dẫn được vào màn đăng nhập', async ({ page }) => {
  await page.goto('/home')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.locator('#trang-chu').getByRole('link', { name: /Bắt đầu miễn phí/ }).click()

  await expect(page).toHaveURL(/\/login$/)
})
