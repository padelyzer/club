import { test, expect } from '@playwright/test'
import { TestHelpers, testUsers } from './utils/helpers'
import { LoginPage, DashboardPage } from './utils/page-objects'

test.describe('Authentication Flow', () => {
  test('successful login and logout', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)
    const helpers = new TestHelpers(page)

    // Navigate to login page
    await loginPage.goto()
    await expect(page).toHaveTitle(/login/i)

    // Perform login
    await loginPage.login(testUsers.admin.email, testUsers.admin.password)

    // Verify successful login
    await expect(page).toHaveURL(/.*dashboard.*/)
    await expect(dashboardPage.welcomeMessage).toBeVisible()

    // Perform logout
    await helpers.logout()

    // Verify successful logout
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('failed login with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.login('invalid@email.com', 'wrongpassword')

    // Should show error message and stay on login page
    await expect(loginPage.errorMessage).toBeVisible()
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/)
  })
})
