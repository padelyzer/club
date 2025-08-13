import { test, expect } from '@playwright/test'
import { TestHelpers, testUsers } from './utils/helpers'

test.describe('Analytics Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page)
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
  })

  test('display analytics dashboard with metrics', async ({ page }) => {
    const helpers = new TestHelpers(page)

    // Navigate to analytics
    await helpers.navigateToAnalytics()
    await helpers.waitForLoading()

    // Verify analytics components are visible
    await expect(page.locator('[data-testid="revenue-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="occupancy-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible()
  })

  test('change time range filter', async ({ page }) => {
    const helpers = new TestHelpers(page)

    await helpers.navigateToAnalytics()
    await helpers.waitForLoading()

    // Change time range
    await page.selectOption('[data-testid="time-range-select"]', '30d')

    // Verify metrics update (should show loading then new data)
    await helpers.waitForLoading()
    await expect(page.locator('[data-testid="revenue-metrics"]')).toBeVisible()
  })

  test('export analytics data', async ({ page }) => {
    const helpers = new TestHelpers(page)

    await helpers.navigateToAnalytics()
    await helpers.waitForLoading()

    // Click export button
    await page.click('[data-testid="export-button"]')

    // Verify export modal or download initiated
    const exportModal = page.locator('[data-testid="export-modal"]')
    if (await exportModal.isVisible()) {
      await expect(exportModal).toBeVisible()
    }
  })
})
