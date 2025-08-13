import { test, expect } from '@playwright/test'
import { TestHelpers, testUsers } from './utils/helpers'

test.describe('Performance Tests', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const startTime = Date.now()
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
    const endTime = Date.now()
    
    const loadTime = endTime - startTime
    expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
  })

  test('analytics page performance', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
    
    const startTime = Date.now()
    await helpers.navigateToAnalytics()
    await helpers.waitForLoading()
    const endTime = Date.now()
    
    const loadTime = endTime - startTime
    expect(loadTime).toBeLessThan(8000) // Analytics can take a bit longer
  })

  test('no JavaScript errors in console', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    const helpers = new TestHelpers(page)
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
    await helpers.navigateToClients()
    
    // Filter out known/acceptable errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('extension') &&
      !error.toLowerCase().includes('warning')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })

  test('basic accessibility checks', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
    
    // Check for basic accessibility attributes
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
    
    // Check for navigation landmarks
    const navigation = page.locator('nav')
    await expect(navigation).toBeVisible()
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount({ min: 1 })
  })
})
