import { test, expect } from '@playwright/test';
import { TestHelpers, assertPagePerformance } from '../utils/helpers';

/**
 * E2E Tests: Login to Dashboard Critical Flow
 * Tests the complete user authentication and dashboard loading workflow
 * Day 5-6 of Testing Suite - Critical User Flow #1
 */

test.describe('Login to Dashboard Flow', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should complete login to dashboard flow under 3 seconds', async ({ page }) => {
    // Clear any existing auth state for clean test
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    const startTime = Date.now();
    
    // Step 1: Navigate to login page
    await page.goto('/login');
    await helpers.waitForPageLoad();
    
    // Verify login page elements
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
    
    // Step 2: Perform login
    const loginStart = Date.now();
    
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'testpass123');
    
    // Submit login and wait for navigation
    await Promise.all([
      page.waitForURL('**/dashboard'),
      page.click('[data-testid="login-submit"]')
    ]);
    
    const loginDuration = Date.now() - loginStart;
    
    // Step 3: Wait for dashboard to load
    const dashboardStart = Date.now();
    
    await helpers.waitForPageLoad();
    
    // Verify dashboard elements are visible
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="club-selector"]')).toBeVisible();
    
    // Wait for dashboard metrics to load
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    
    const dashboardDuration = Date.now() - dashboardStart;
    const totalDuration = Date.now() - startTime;
    
    // Performance assertions
    expect(loginDuration, `Login should complete within 1.5s but took ${loginDuration}ms`)
      .toBeLessThan(1500);
    
    expect(dashboardDuration, `Dashboard should load within 2s but took ${dashboardDuration}ms`)
      .toBeLessThan(2000);
    
    expect(totalDuration, `Total flow should complete within 3s but took ${totalDuration}ms`)
      .toBeLessThan(3000);
    
    console.log(`✅ Login Flow Performance:
      - Login: ${loginDuration}ms
      - Dashboard: ${dashboardDuration}ms  
      - Total: ${totalDuration}ms`);
  });

  test('should load dashboard with BFF optimization', async ({ page }) => {
    // Navigate to dashboard (using stored auth)
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Track BFF API calls
    const apiCalls: string[] = [];
    page.on('request', (request: any) => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });
    
    // Wait for dashboard data to load
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    
    // Verify BFF endpoints are being used
    const bffCalls = apiCalls.filter(url => 
      url.includes('/api/dashboard/overview') || 
      url.includes('/api/auth/context')
    );
    
    expect(bffCalls.length, 'BFF endpoints should be called for optimized loading')
      .toBeGreaterThan(0);
    
    // Verify dashboard metrics are displayed
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="today-reservations"]')).toBeVisible();
    await expect(page.locator('[data-testid="occupancy-rate"]')).toBeVisible();
    
    // Check performance
    await assertPagePerformance(page, 2000); // 2 second threshold
  });

  test('should handle multi-organization user dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Check if organization selector is present
    const orgSelector = page.locator('[data-testid="organization-selector"]');
    
    if (await orgSelector.isVisible()) {
      // Multi-org user workflow
      await orgSelector.click();
      
      // Wait for dropdown
      await expect(page.locator('[data-testid="organization-dropdown"]')).toBeVisible();
      
      // Should show multiple organizations
      const orgOptions = page.locator('[data-testid="org-option"]');
      const orgCount = await orgOptions.count();
      
      expect(orgCount, 'Multi-org user should have multiple organizations')
        .toBeGreaterThan(1);
      
      // Switch to different organization
      await orgOptions.first().click();
      
      // Dashboard should reload with new org data
      await helpers.waitForPageLoad();
      await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    }
    
    // Single-org users should not see org selector
    if (!(await orgSelector.isVisible())) {
      console.log('✅ Single-organization user - org selector correctly hidden');
    }
  });

  test('should display real-time dashboard updates', async ({ page }) => {
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Get initial metrics
    const initialReservations = await page.textContent('[data-testid="today-reservations-count"]');
    const initialRevenue = await page.textContent('[data-testid="monthly-revenue-amount"]');
    
    // Mock a WebSocket update or API polling update
    await helpers.mockAPIResponse('**/api/dashboard/overview**', {
      todayReservations: parseInt(initialReservations || '0') + 1,
      monthlyRevenue: parseFloat(initialRevenue?.replace(/[^0-9.]/g, '') || '0') + 100,
      occupancyRate: 85,
      weeklyGrowth: 5.2
    });
    
    // Trigger refresh (simulate real-time update)
    await page.click('[data-testid="refresh-dashboard"]');
    
    // Wait for update
    await helpers.waitForPageLoad();
    
    // Verify metrics updated
    const updatedReservations = await page.textContent('[data-testid="today-reservations-count"]');
    expect(parseInt(updatedReservations || '0'))
      .toBeGreaterThan(parseInt(initialReservations || '0'));
  });

  test('should handle dashboard errors gracefully', async ({ page }) => {
    // Mock API error
    await helpers.mockAPIResponse('**/api/dashboard/overview**', 
      { error: 'Service temporarily unavailable' }, 500);
    
    await page.goto('/dashboard');
    
    // Should show error state
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    
    // Should have retry button
    await expect(page.locator('[data-testid="retry-dashboard"]')).toBeVisible();
    
    // Mock successful retry
    await helpers.mockAPIResponse('**/api/dashboard/overview**', {
      todayReservations: 23,
      monthlyRevenue: 15420,
      occupancyRate: 78,
      weeklyGrowth: 12.5
    });
    
    // Click retry
    await page.click('[data-testid="retry-dashboard"]');
    
    // Should load successfully
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-error"]')).not.toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login and go to dashboard
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Refresh page
    await page.reload();
    await helpers.waitForPageLoad();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    
    // Should not redirect to login
    expect(page.url()).toContain('/dashboard');
  });

  test('should work correctly on mobile devices', async ({ page }) => {
    // Simulate mobile device
    await helpers.simulateMobile();
    
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Mobile navigation should be visible
    await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
    
    // Desktop sidebar should be hidden
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
    
    // Tap mobile menu
    await page.tap('[data-testid="mobile-nav-toggle"]');
    
    // Mobile menu should open
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Dashboard metrics should be responsive
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    
    // Check performance on mobile
    const performance = await helpers.measurePerformance(async () => {
      await page.reload();
      await helpers.waitForPageLoad();
    });
    
    expect(performance.duration, 'Mobile dashboard should load within 4s')
      .toBeLessThan(4000);
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G network
    await helpers.simulateSlowNetwork();
    
    await page.goto('/dashboard');
    
    // Should show loading state
    await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
    
    // Wait for content to eventually load
    await helpers.waitForPageLoad(15000); // Extended timeout for slow network
    
    // Content should load successfully
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-loading"]')).not.toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Check for accessibility violations
    const violations = await helpers.checkAccessibility();
    
    expect(violations, 'Dashboard should have no accessibility violations')
      .toHaveLength(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // First focusable element should be focused
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Test skip links if present
    const skipLink = page.locator('[data-testid="skip-link"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      // Should jump to main content
      await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    }
  });
});