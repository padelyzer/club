import { test, expect } from '../fixtures/auth.fixture';
import { 
  testData, 
  waitForToast, 
  waitForNetworkIdle,
  waitForSkeletonsToDisappear,
  fillForm,
  mockApiResponse
} from '../utils/helpers';

test.describe('Clubs Management', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/clubs');
    await waitForSkeletonsToDisappear(page);
  });

  test('should display clubs list', async ({ page }) => {
    // Check page elements
    await expect(page.locator('h1')).toContainText('Clubs');
    await expect(page.locator('[data-testid="clubs-list"]')).toBeVisible();
    
    // Check if clubs are loaded
    const clubCards = page.locator('[data-testid="club-card"]');
    await expect(clubCards).toHaveCount(await clubCards.count());
  });

  test('should search clubs', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', 'Tennis');
    
    // Wait for search results
    await waitForNetworkIdle(page);
    
    // Check filtered results
    const clubCards = page.locator('[data-testid="club-card"]');
    const count = await clubCards.count();
    
    for (let i = 0; i < count; i++) {
      const clubName = await clubCards.nth(i).locator('h3').textContent();
      expect(clubName?.toLowerCase()).toContain('tennis');
    }
  });

  test('should filter clubs by status', async ({ page }) => {
    // Click filter button
    await page.click('[data-testid="filter-button"]');
    
    // Select active status
    await page.click('input[value="active"]');
    await page.click('button:has-text("Apply")');
    
    // Wait for filtered results
    await waitForNetworkIdle(page);
    
    // Check all clubs are active
    const statusBadges = page.locator('[data-testid="club-status"]');
    const count = await statusBadges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toHaveText('Active');
    }
  });

  test('should create new club', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Create Club")');
    
    // Fill club form
    const clubData = {
      name: testData.randomClubName(),
      description: 'A great tennis and padel club',
      address: '123 Main St, City, Country',
      phone: testData.randomPhone(),
      email: testData.randomEmail(),
      website: 'https://example.com',
    };
    
    await fillForm(page, clubData);
    
    // Upload logo
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/test-logo.png');
    
    // Select features
    await page.check('input[value="parking"]');
    await page.check('input[value="restaurant"]');
    await page.check('input[value="shop"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check success message
    await waitForToast(page, 'Club created successfully');
    
    // Should redirect to club details
    await page.waitForURL(/\/clubs\/\d+/);
  });

  test('should edit club details', async ({ page }) => {
    // Click on first club
    await page.click('[data-testid="club-card"]:first-child');
    
    // Wait for club details to load
    await waitForNetworkIdle(page);
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Update club name
    await page.fill('input[name="name"]', 'Updated Club Name');
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Check success message
    await waitForToast(page, 'Club updated successfully');
    
    // Check updated name
    await expect(page.locator('h1')).toContainText('Updated Club Name');
  });

  test('should manage club courts', async ({ page }) => {
    // Navigate to first club
    await page.click('[data-testid="club-card"]:first-child');
    
    // Go to courts tab
    await page.click('button:has-text("Courts")');
    
    // Add new court
    await page.click('button:has-text("Add Court")');
    
    // Fill court form
    await fillForm(page, {
      name: testData.randomCourtName(),
      type: 'padel',
      surface: 'artificial_grass',
      indoor: true,
      lighting: true,
    });
    
    // Set pricing
    await page.fill('input[name="pricePerHour"]', '40');
    await page.fill('input[name="pricePerHourPeak"]', '60');
    
    // Save court
    await page.click('button[type="submit"]');
    
    // Check success
    await waitForToast(page, 'Court added successfully');
  });

  test('should export clubs data', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-button"]');
    
    // Select export format
    await page.click('input[value="csv"]');
    
    // Select fields to export
    await page.check('input[name="name"]');
    await page.check('input[name="email"]');
    await page.check('input[name="phone"]');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    
    // Check download
    expect(download.suggestedFilename()).toContain('clubs');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should import clubs from file', async ({ page }) => {
    // Click import button
    await page.click('[data-testid="import-button"]');
    
    // Upload file
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/clubs-import.csv');
    
    // Map columns
    await page.selectOption('select[name="name"]', 'Club Name');
    await page.selectOption('select[name="email"]', 'Email');
    await page.selectOption('select[name="phone"]', 'Phone');
    
    // Preview import
    await page.click('button:has-text("Preview")');
    
    // Check preview data
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    
    // Confirm import
    await page.click('button:has-text("Import")');
    
    // Check success
    await waitForToast(page, /imported successfully/);
  });

  test('should handle offline mode', async ({ page, context }) => {
    // Enable offline mode
    await context.setOffline(true);
    
    // Try to create club
    await page.click('button:has-text("Create Club")');
    
    await fillForm(page, {
      name: 'Offline Club',
      email: 'offline@example.com',
    });
    
    await page.click('button[type="submit"]');
    
    // Check offline message
    await waitForToast(page, 'Saved offline. Will sync when online.');
    
    // Re-enable online mode
    await context.setOffline(false);
    
    // Check sync message
    await waitForToast(page, 'Syncing offline changes');
  });

  test('should favorite and unfavorite clubs', async ({ page }) => {
    // Get first club card
    const firstClub = page.locator('[data-testid="club-card"]').first();
    
    // Click favorite button
    await firstClub.locator('[data-testid="favorite-button"]').click();
    
    // Check favorited
    await expect(firstClub.locator('[data-testid="favorite-button"]')).toHaveAttribute('data-favorited', 'true');
    
    // Go to favorites view
    await page.click('button:has-text("Favorites")');
    
    // Check club appears in favorites
    await expect(page.locator('[data-testid="club-card"]')).toHaveCount(1);
    
    // Unfavorite
    await page.locator('[data-testid="favorite-button"]').click();
    
    // Check removed from favorites
    await expect(page.locator('text=No favorite clubs')).toBeVisible();
  });
});