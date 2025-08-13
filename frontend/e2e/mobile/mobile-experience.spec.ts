import { test, expect, devices } from '@playwright/test'
import { TestHelpers, testUsers } from '../utils/helpers'

test.use({ ...devices['iPhone 12'] })

test.describe('Mobile Experience', () => {
  test('mobile navigation works correctly', async ({ page }) => {
    const helpers = new TestHelpers(page)

    await helpers.login(testUsers.admin.email, testUsers.admin.password)

    // Test mobile menu
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

    // Navigate to clients on mobile
    await page.click('[data-testid="mobile-nav-clients"]')
    await expect(page).toHaveURL(/.*clients.*/)
  })

  test('mobile reservation booking', async ({ page }) => {
    const helpers = new TestHelpers(page)

    await helpers.login(testUsers.admin.email, testUsers.admin.password)
    await helpers.navigateToReservations()

    // Test mobile-friendly reservation creation
    await page.click('[data-testid="mobile-new-reservation"]')
    
    // Verify mobile modal opens correctly
    await expect(page.locator('[data-testid="mobile-reservation-modal"]')).toBeVisible()
  })

  test('mobile responsive layout', async ({ page }) => {
    const helpers = new TestHelpers(page)

    await helpers.login(testUsers.admin.email, testUsers.admin.password)

    // Verify mobile layout elements
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
  })
})
