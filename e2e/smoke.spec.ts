import { test, expect } from '@playwright/test'

// Smoke test: the app shell boots and renders without a crash.
// Replace/extend with critical user flows (auth, CRUD) as features land.
test('app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('#root')).toBeAttached()
})
