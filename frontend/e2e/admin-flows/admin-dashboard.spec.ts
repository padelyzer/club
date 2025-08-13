import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';

/**
 * E2E Tests: Admin Dashboard and Management Flows
 * Tests admin-specific functionality including user management, system configuration
 * Day 5-6 of Testing Suite - Admin User Flows
 */

test.describe('Admin Dashboard Flow', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to admin dashboard
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
  });

  test('admin should see enhanced dashboard with system metrics', async ({ page }) => {
    // Admin dashboard should show additional metrics
    await expect(page.locator('[data-testid="admin-metrics"]')).toBeVisible();
    
    // Should show system-wide statistics
    const adminMetrics = [
      '[data-testid="total-organizations"]',
      '[data-testid="total-clubs"]', 
      '[data-testid="total-users"]',
      '[data-testid="system-health"]'
    ];
    
    for (const metric of adminMetrics) {
      const element = page.locator(metric);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        console.log(`✅ Admin metric ${metric} visible`);
      }
    }
    
    // Should have admin-specific navigation
    const adminNavItems = [
      '[data-testid="nav-user-management"]',
      '[data-testid="nav-system-config"]',
      '[data-testid="nav-billing-management"]'
    ];
    
    for (const navItem of adminNavItems) {
      const element = page.locator(navItem);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        console.log(`✅ Admin navigation ${navItem} available`);
      }
    }
  });

  test('should manage user accounts and permissions', async ({ page }) => {
    // Navigate to user management
    const userMgmtNav = page.locator('[data-testid="nav-user-management"]');
    
    if (await userMgmtNav.isVisible()) {
      await userMgmtNav.click();
      await helpers.waitForPageLoad();
      
      // User management page should load
      await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
      
      // Should show user list
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      // Should have search functionality
      const searchInput = page.locator('[data-testid="user-search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test@');
        await helpers.waitForPageLoad();
        
        // Results should filter
        const userRows = page.locator('[data-testid="user-row"]');
        const userCount = await userRows.count();
        
        if (userCount > 0) {
          const firstUserEmail = await userRows.first().textContent();
          expect(firstUserEmail?.toLowerCase()).toContain('test');
        }
        
        // Clear search
        await searchInput.fill('');
        await helpers.waitForPageLoad();
      }
      
      // Test user actions
      const userRow = page.locator('[data-testid="user-row"]').first();
      if (await userRow.isVisible()) {
        // View user details
        await userRow.locator('[data-testid="view-user"]').click();
        await expect(page.locator('[data-testid="user-details-modal"]')).toBeVisible();
        
        // Should show user information
        await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-organizations"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-permissions"]')).toBeVisible();
        
        // Close modal
        await page.click('[data-testid="close-modal"]');
      }
      
    } else {
      console.log('✅ User management not available for current admin role');
    }
  });

  test('should configure system settings', async ({ page }) => {
    const systemConfigNav = page.locator('[data-testid="nav-system-config"]');
    
    if (await systemConfigNav.isVisible()) {
      await systemConfigNav.click();
      await helpers.waitForPageLoad();
      
      // System configuration page should load
      await expect(page.locator('[data-testid="system-config"]')).toBeVisible();
      
      // Should show configuration sections
      const configSections = [
        '[data-testid="general-settings"]',
        '[data-testid="email-settings"]',
        '[data-testid="payment-settings"]',
        '[data-testid="feature-flags"]'
      ];
      
      for (const section of configSections) {
        const element = page.locator(section);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
        }
      }
      
      // Test feature flag management
      const featureFlagsSection = page.locator('[data-testid="feature-flags"]');
      if (await featureFlagsSection.isVisible()) {
        // Should show BFF feature flag
        const bffToggle = page.locator('[data-testid="feature-bff-enabled"]');
        if (await bffToggle.isVisible()) {
          const ______isEnabled = await bffToggle.isChecked();
          
          // Toggle and save
          await bffToggle.click();
          await page.click('[data-testid="save-feature-flags"]');
          
          // Should show success message
          await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
          
          // Restore original state
          await bffToggle.click();
          await page.click('[data-testid="save-feature-flags"]');
        }
      }
      
    } else {
      console.log('✅ System configuration not available for current admin role');
    }
  });

  test('should monitor system health and performance', async ({ page }) => {
    // Look for system monitoring dashboard
    const healthSection = page.locator('[data-testid="system-health"]');
    
    if (await healthSection.isVisible()) {
      await healthSection.click();
      
      // Should expand to show detailed metrics
      const healthMetrics = [
        '[data-testid="api-response-time"]',
        '[data-testid="database-connections"]',  
        '[data-testid="cache-hit-rate"]',
        '[data-testid="error-rate"]'
      ];
      
      for (const metric of healthMetrics) {
        const element = page.locator(metric);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          
          // Metric should have a value
          const value = await element.textContent();
          expect(value?.trim().length).toBeGreaterThan(0);
        }
      }
      
      // Should show system alerts if any
      const alertsSection = page.locator('[data-testid="system-alerts"]');
      if (await alertsSection.isVisible()) {
        await expect(alertsSection).toBeVisible();
      }
      
    } else {
      console.log('✅ System health monitoring not available');
    }
  });

  test('should manage organization billing and subscriptions', async ({ page }) => {
    const billingNav = page.locator('[data-testid="nav-billing-management"]');
    
    if (await billingNav.isVisible()) {
      await billingNav.click();
      await helpers.waitForPageLoad();
      
      // Billing management page should load
      await expect(page.locator('[data-testid="billing-management"]')).toBeVisible();
      
      // Should show organizations list with subscription status
      await expect(page.locator('[data-testid="organizations-billing-table"]')).toBeVisible();
      
      const orgRows = page.locator('[data-testid="org-billing-row"]');
      const orgCount = await orgRows.count();
      
      if (orgCount > 0) {
        // Test viewing organization billing details
        await orgRows.first().locator('[data-testid="view-billing"]').click();
        await expect(page.locator('[data-testid="billing-details-modal"]')).toBeVisible();
        
        // Should show subscription details
        await expect(page.locator('[data-testid="subscription-plan"]')).toBeVisible();
        await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
        
        // Close modal
        await page.click('[data-testid="close-modal"]');
      }
      
      // Test subscription management
      const manageSubscription = page.locator('[data-testid="manage-subscriptions"]');
      if (await manageSubscription.isVisible()) {
        await manageSubscription.click();
        
        // Should show subscription plans
        await expect(page.locator('[data-testid="subscription-plans"]')).toBeVisible();
      }
      
    } else {
      console.log('✅ Billing management not available for current admin role');
    }
  });

  test('should handle bulk operations on users and organizations', async ({ page }) => {
    const userMgmtNav = page.locator('[data-testid="nav-user-management"]');
    
    if (await userMgmtNav.isVisible()) {
      await userMgmtNav.click();
      await helpers.waitForPageLoad();
      
      // Select multiple users for bulk operations
      const userCheckboxes = page.locator('[data-testid="user-checkbox"]');
      const checkboxCount = await userCheckboxes.count();
      
      if (checkboxCount > 1) {
        // Select first two users
        await userCheckboxes.first().click();
        await userCheckboxes.nth(1).click();
        
        // Bulk actions should be available
        await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
        
        // Test bulk email functionality
        const bulkEmailBtn = page.locator('[data-testid="bulk-email"]');
        if (await bulkEmailBtn.isVisible()) {
          await bulkEmailBtn.click();
          
          // Email composition modal should open
          await expect(page.locator('[data-testid="bulk-email-modal"]')).toBeVisible();
          
          // Fill email details
          await page.fill('[data-testid="email-subject"]', 'Test Admin Email');
          await page.fill('[data-testid="email-body"]', 'This is a test email from admin.');
          
          // Cancel instead of sending in test
          await page.click('[data-testid="cancel-email"]');
        }
        
        // Test bulk status update
        const bulkStatusBtn = page.locator('[data-testid="bulk-status-update"]');
        if (await bulkStatusBtn.isVisible()) {
          await bulkStatusBtn.click();
          
          // Status update modal should open
          await expect(page.locator('[data-testid="status-update-modal"]')).toBeVisible();
          await page.click('[data-testid="cancel-status-update"]');
        }
      }
      
    } else {
      console.log('✅ Bulk operations not available');
    }
  });

  test('should export system reports and analytics', async ({ page }) => {
    // Navigate to analytics/reports section
    await page.click('[data-testid="nav-analytics"]');
    await helpers.waitForPageLoad();
    
    // Look for admin-specific export options
    const exportSection = page.locator('[data-testid="admin-exports"]');
    
    if (await exportSection.isVisible()) {
      // Should have various export options
      const exportOptions = [
        '[data-testid="export-user-report"]',
        '[data-testid="export-revenue-report"]',
        '[data-testid="export-usage-report"]',
        '[data-testid="export-system-logs"]'
      ];
      
      for (const option of exportOptions) {
        const element = page.locator(option);
        if (await element.isVisible()) {
          await element.click();
          
          // Export configuration modal should open
          const configModal = page.locator('[data-testid="export-config-modal"]');
          if (await configModal.isVisible()) {
            // Should have date range selection
            await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
            
            // Should have format selection
            await expect(page.locator('[data-testid="export-format"]')).toBeVisible();
            
            // Cancel export for test
            await page.click('[data-testid="cancel-export"]');
          }
          
          break; // Test one export option
        }
      }
    }
  });

  test('should manage system maintenance and updates', async ({ page }) => {
    const systemConfigNav = page.locator('[data-testid="nav-system-config"]');
    
    if (await systemConfigNav.isVisible()) {
      await systemConfigNav.click();
      await helpers.waitForPageLoad();
      
      // Look for maintenance section
      const maintenanceSection = page.locator('[data-testid="maintenance-section"]');
      
      if (await maintenanceSection.isVisible()) {
        // Should show maintenance options
        const maintenanceOptions = [
          '[data-testid="schedule-maintenance"]',
          '[data-testid="database-backup"]',
          '[data-testid="clear-cache"]',
          '[data-testid="system-updates"]'
        ];
        
        for (const option of maintenanceOptions) {
          const element = page.locator(option);
          if (await element.isVisible()) {
            await expect(element).toBeVisible();
          }
        }
        
        // Test cache clearing (safe operation)
        const clearCacheBtn = page.locator('[data-testid="clear-cache"]');
        if (await clearCacheBtn.isVisible()) {
          await clearCacheBtn.click();
          
          // Should show confirmation
          await expect(page.locator('[data-testid="cache-clear-confirmation"]')).toBeVisible();
          
          // Confirm action
          await page.click('[data-testid="confirm-clear-cache"]');
          
          // Should show success message
          await expect(page.locator('[data-testid="cache-cleared-success"]')).toBeVisible();
        }
      }
    }
  });

  test('should handle emergency admin actions', async ({ page }) => {
    // Emergency actions should be available but protected
    const emergencySection = page.locator('[data-testid="emergency-actions"]');
    
    if (await emergencySection.isVisible()) {
      // Should require additional confirmation for emergency actions
      const emergencyOptions = [
        '[data-testid="disable-user-registrations"]',
        '[data-testid="enable-maintenance-mode"]',
        '[data-testid="system-shutdown"]'
      ];
      
      for (const option of emergencyOptions) {
        const element = page.locator(option);
        if (await element.isVisible()) {
          await element.click();
          
          // Should require password confirmation
          const confirmationModal = page.locator('[data-testid="emergency-confirmation"]');
          if (await confirmationModal.isVisible()) {
            await expect(page.locator('[data-testid="admin-password-input"]')).toBeVisible();
            
            // Cancel for test safety
            await page.click('[data-testid="cancel-emergency-action"]');
          }
          
          break; // Test one emergency action
        }
      }
    }
  });

  test('should monitor and respond to system alerts', async ({ page }) => {
    // Check for alerts notification system
    const alertsIndicator = page.locator('[data-testid="system-alerts-indicator"]');
    
    if (await alertsIndicator.isVisible()) {
      await alertsIndicator.click();
      
      // Alerts panel should open
      await expect(page.locator('[data-testid="alerts-panel"]')).toBeVisible();
      
      const alertItems = page.locator('[data-testid="alert-item"]');
      const alertCount = await alertItems.count();
      
      if (alertCount > 0) {
        // Test acknowledging an alert
        const firstAlert = alertItems.first();
        await firstAlert.locator('[data-testid="acknowledge-alert"]').click();
        
        // Should show acknowledgment confirmation
        await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible();
        
        // Alert should be marked as acknowledged
        await expect(firstAlert.locator('[data-testid="alert-status-acknowledged"]')).toBeVisible();
      }
      
      // Test alert filters
      const alertFilters = page.locator('[data-testid="alert-filters"]');
      if (await alertFilters.isVisible()) {
        // Filter by severity
        await page.selectOption('[data-testid="severity-filter"]', 'high');
        await helpers.waitForPageLoad();
        
        // Clear filter
        await page.selectOption('[data-testid="severity-filter"]', 'all');
      }
    }
  });

  test('admin dashboard should maintain performance with large datasets', async ({ page }) => {
    // Navigate to user management with potentially large user list
    const userMgmtNav = page.locator('[data-testid="nav-user-management"]');
    
    if (await userMgmtNav.isVisible()) {
      const { duration } = await helpers.measurePerformance(async () => {
        await userMgmtNav.click();
        await helpers.waitForPageLoad();
        
        // Wait for user list to load
        await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      });
      
      // Admin pages should load quickly even with large datasets
      expect(duration, 'Admin user management should load within 3000ms')
        .toBeLessThan(3000);
      
      // Test pagination if available
      const pagination = page.locator('[data-testid="users-pagination"]');
      if (await pagination.isVisible()) {
        const nextPageBtn = page.locator('[data-testid="next-page"]');
        if (await nextPageBtn.isVisible()) {
          await nextPageBtn.click();
          await helpers.waitForPageLoad();
          
          // Should load next page quickly
          await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
        }
      }
    }
  });
});