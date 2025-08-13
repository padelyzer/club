import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';

/**
 * E2E Tests: Club Management Critical Flow
 * Tests club creation, configuration, and multi-club switching workflows
 * Day 5-6 of Testing Suite - Critical User Flow #3
 */

test.describe('Club Management Flow', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to dashboard first
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
  });

  test('should handle multi-club switching workflow', async ({ page }) => {
    // Check if user has multiple clubs
    await page.click('[data-testid="club-selector"]');
    await expect(page.locator('[data-testid="club-dropdown"]')).toBeVisible();
    
    const clubOptions = page.locator('[data-testid="club-option"]');
    const clubCount = await clubOptions.count();
    
    if (clubCount > 1) {
      // Test club switching
      const firstClubName = await clubOptions.first().textContent();
      const secondClubName = await clubOptions.nth(1).textContent();
      
      // Switch to second club
      const switchStart = Date.now();
      await clubOptions.nth(1).click();
      
      // Wait for club data to reload
      await helpers.waitForPageLoad();
      
      const switchDuration = Date.now() - switchStart;
      
      // Verify club switch
      await expect(page.locator('[data-testid="current-club-name"]'))
        .toContainText(secondClubName || '');
      
      // Dashboard should show new club's data
      await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
      
      // Performance check
      expect(switchDuration, `Club switch should complete within 2s but took ${switchDuration}ms`)
        .toBeLessThan(2000);
      
      // Switch back to first club
      await page.click('[data-testid="club-selector"]');
      await clubOptions.first().click();
      await helpers.waitForPageLoad();
      
      // Verify switch back
      await expect(page.locator('[data-testid="current-club-name"]'))
        .toContainText(firstClubName || '');
      
      console.log(`✅ Club switching completed in ${switchDuration}ms`);
    } else {
      console.log('✅ Single club user - switching not applicable');
    }
  });

  test('should navigate to club settings and configuration', async ({ page }) => {
    // Navigate to club settings
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    // Club settings page should load
    await expect(page.locator('[data-testid="club-settings"]')).toBeVisible();
    
    // Should show club information form
    await expect(page.locator('[data-testid="club-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="club-address-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="club-phone-input"]')).toBeVisible();
    
    // Test form validation
    const originalName = await page.inputValue('[data-testid="club-name-input"]');
    
    // Clear required field
    await page.fill('[data-testid="club-name-input"]', '');
    await page.click('[data-testid="save-club-settings"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Restore original name
    await page.fill('[data-testid="club-name-input"]', originalName);
    
    // Should be able to save
    await page.click('[data-testid="save-club-settings"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should manage club courts configuration', async ({ page }) => {
    // Navigate to courts management
    await page.click('[data-testid="nav-courts"]');
    await helpers.waitForPageLoad();
    
    // Courts list should be visible
    await expect(page.locator('[data-testid="courts-list"]')).toBeVisible();
    
    // Should show existing courts
    const courtItems = page.locator('[data-testid="court-item"]');
    const initialCourtCount = await courtItems.count();
    
    expect(initialCourtCount, 'Club should have at least one court').toBeGreaterThan(0);
    
    // Test adding new court
    await page.click('[data-testid="add-court-button"]');
    await expect(page.locator('[data-testid="court-form-modal"]')).toBeVisible();
    
    // Fill court details
    await page.fill('[data-testid="court-name-input"]', 'Test Court E2E');
    await page.selectOption('[data-testid="court-type-select"]', 'indoor');
    await page.fill('[data-testid="court-price-input"]', '65.00');
    
    // Submit new court
    await page.click('[data-testid="submit-court"]');
    
    // Should show success and update list
    await expect(page.locator('[data-testid="court-success"]')).toBeVisible();
    await helpers.waitForPageLoad();
    
    // Court count should increase
    const newCourtCount = await page.locator('[data-testid="court-item"]').count();
    expect(newCourtCount, 'Court count should increase after adding').toBe(initialCourtCount + 1);
    
    // New court should appear in list
    await expect(page.locator('[data-testid="court-item"]').last())
      .toContainText('Test Court E2E');
    
    // Test editing court
    await page.locator('[data-testid="court-item"]').last()
      .locator('[data-testid="edit-court"]').click();
    
    await expect(page.locator('[data-testid="court-form-modal"]')).toBeVisible();
    
    // Update price
    await page.fill('[data-testid="court-price-input"]', '70.00');
    await page.click('[data-testid="submit-court"]');
    
    // Should update successfully
    await expect(page.locator('[data-testid="court-success"]')).toBeVisible();
    
    // Cleanup - delete test court
    await helpers.waitForPageLoad();
    await page.locator('[data-testid="court-item"]').last()
      .locator('[data-testid="delete-court"]').click();
    
    // Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await page.click('[data-testid="confirm-delete"]');
    
    // Court should be removed
    await helpers.waitForPageLoad();
    const finalCourtCount = await page.locator('[data-testid="court-item"]').count();
    expect(finalCourtCount, 'Court count should return to original').toBe(initialCourtCount);
  });

  test('should configure club schedule and operating hours', async ({ page }) => {
    // Navigate to club settings
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    // Go to schedule tab
    await page.click('[data-testid="schedule-tab"]');
    await expect(page.locator('[data-testid="schedule-configuration"]')).toBeVisible();
    
    // Should show all 7 days of the week
    const dayRows = page.locator('[data-testid="schedule-day-row"]');
    const dayCount = await dayRows.count();
    expect(dayCount, 'Should show all 7 days').toBe(7);
    
    // Test updating schedule for Monday
    const mondayRow = dayRows.first();
    
    // Enable Monday if not already enabled
    const mondayToggle = mondayRow.locator('[data-testid="day-enabled-toggle"]');
    if (!(await mondayToggle.isChecked())) {
      await mondayToggle.click();
    }
    
    // Set opening time
    await mondayRow.locator('[data-testid="opening-time"]').fill('08:00');
    
    // Set closing time
    await mondayRow.locator('[data-testid="closing-time"]').fill('22:00');
    
    // Save schedule
    await page.click('[data-testid="save-schedule"]');
    await expect(page.locator('[data-testid="schedule-success"]')).toBeVisible();
    
    // Verify schedule persists after reload
    await page.reload();
    await helpers.waitForPageLoad();
    await page.click('[data-testid="schedule-tab"]');
    
    const savedOpeningTime = await mondayRow.locator('[data-testid="opening-time"]').inputValue();
    const savedClosingTime = await mondayRow.locator('[data-testid="closing-time"]').inputValue();
    
    expect(savedOpeningTime).toBe('08:00');
    expect(savedClosingTime).toBe('22:00');
  });

  test('should manage club staff and permissions', async ({ page }) => {
    // Navigate to staff management (admin only feature)
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    // Check if staff tab is available (depends on user permissions)
    const staffTab = page.locator('[data-testid="staff-tab"]');
    
    if (await staffTab.isVisible()) {
      await staffTab.click();
      await expect(page.locator('[data-testid="staff-management"]')).toBeVisible();
      
      // Should show current staff list
      const staffList = page.locator('[data-testid="staff-list"]');
      await expect(staffList).toBeVisible();
      
      // Test inviting new staff member
      await page.click('[data-testid="invite-staff-button"]');
      await expect(page.locator('[data-testid="staff-invite-modal"]')).toBeVisible();
      
      // Fill invitation form
      await page.fill('[data-testid="staff-email-input"]', 'newstaff@test.com');
      await page.selectOption('[data-testid="staff-role-select"]', 'manager');
      
      // Send invitation
      await page.click('[data-testid="send-invitation"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="invitation-success"]')).toBeVisible();
      
      // Staff member should appear in pending invitations
      await expect(page.locator('[data-testid="pending-invitations"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-invitations"]'))
        .toContainText('newstaff@test.com');
      
    } else {
      console.log('✅ Staff management not available for current user role');
    }
  });

  test('should handle club analytics and reporting', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="nav-analytics"]');
    await helpers.waitForPageLoad();
    
    // Analytics dashboard should load
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Should show key metrics
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="occupancy-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-metrics"]')).toBeVisible();
    
    // Test date range selector
    await page.click('[data-testid="date-range-selector"]');
    await page.click('[data-testid="range-last-month"]');
    
    // Charts should update
    await helpers.waitForPageLoad();
    
    // Verify charts updated with new data
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    
    // Test export functionality
    const exportButton = page.locator('[data-testid="export-report"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should trigger download (in real test, would verify file download)
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    }
  });

  test('should work correctly on mobile devices', async ({ page }) => {
    await helpers.simulateMobile();
    
    // Mobile club selector
    await page.tap('[data-testid="club-selector"]');
    await expect(page.locator('[data-testid="club-dropdown"]')).toBeVisible();
    
    // Dropdown should be mobile-friendly
    const dropdown = page.locator('[data-testid="club-dropdown"]');
    const dropdownBox = await dropdown.boundingBox();
    
    expect(dropdownBox?.width, 'Dropdown should fit mobile screen').toBeLessThan(400);
    
    // Close dropdown
    await page.tap('[data-testid="club-selector"]');
    
    // Navigate to club settings on mobile
    await page.tap('[data-testid="mobile-nav-toggle"]');
    await page.tap('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    // Settings should be responsive
    await expect(page.locator('[data-testid="club-settings"]')).toBeVisible();
    
    // Form fields should be touch-friendly
    const nameInput = page.locator('[data-testid="club-name-input"]');
    const inputBox = await nameInput.boundingBox();
    
    expect(inputBox?.height, 'Input should be touch-friendly').toBeGreaterThan(40);
  });

  test('should validate club configuration changes', async ({ page }) => {
    // Navigate to club settings
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    // Test invalid phone number
    await page.fill('[data-testid="club-phone-input"]', 'invalid-phone');
    await page.click('[data-testid="save-club-settings"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="phone-validation-error"]')).toBeVisible();
    
    // Test invalid email
    await page.fill('[data-testid="club-email-input"]', 'invalid-email');
    await page.click('[data-testid="save-club-settings"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible();
    
    // Test valid data
    await page.fill('[data-testid="club-phone-input"]', '+1-555-123-4567');
    await page.fill('[data-testid="club-email-input"]', 'club@test.com');
    await page.click('[data-testid="save-club-settings"]');
    
    // Should save successfully
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should handle club subscription and billing', async ({ page }) => {
    // Navigate to billing section
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    const billingTab = page.locator('[data-testid="billing-tab"]');
    
    if (await billingTab.isVisible()) {
      await billingTab.click();
      await expect(page.locator('[data-testid="billing-section"]')).toBeVisible();
      
      // Should show current subscription
      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
      
      // Should show billing history
      await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
      
      // Test plan upgrade
      const upgradeButton = page.locator('[data-testid="upgrade-plan"]');
      if (await upgradeButton.isVisible()) {
        await upgradeButton.click();
        
        // Should show plan options
        await expect(page.locator('[data-testid="plan-options"]')).toBeVisible();
        
        // Cancel upgrade for test
        await page.click('[data-testid="cancel-upgrade"]');
      }
      
    } else {
      console.log('✅ Billing section not available for current subscription');
    }
  });

  test('should sync club data across browser tabs', async ({ page, context }) => {
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    const helpers2 = new TestHelpers(page2);
    await helpers2.waitForPageLoad();
    
    // Make a change in first tab
    await page.click('[data-testid="nav-my-club"]');
    await helpers.waitForPageLoad();
    
    const originalName = await page.inputValue('[data-testid="club-name-input"]');
    const newName = `Updated ${originalName}`;
    
    await page.fill('[data-testid="club-name-input"]', newName);
    await page.click('[data-testid="save-club-settings"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Switch to second tab and check if change is reflected
    await page2.bringToFront();
    
    // Trigger a refresh or navigation to pick up changes
    await page2.reload();
    await helpers2.waitForPageLoad();
    
    // Club name should be updated
    const currentClubName = await page2.textContent('[data-testid="current-club-name"]');
    expect(currentClubName).toContain(newName);
    
    // Restore original name
    await page.fill('[data-testid="club-name-input"]', originalName);
    await page.click('[data-testid="save-club-settings"]');
    
    await page2.close();
  });
});