import { test, expect } from '../fixtures/auth.fixture';
import { 
  waitForToast, 
  waitForNetworkIdle,
  scrollIntoView,
  isInViewport,
  testData
} from '../utils/helpers';

test.describe('Court Reservations', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/reservations');
  });

  test('should display calendar view', async ({ page }) => {
    // Check calendar is visible
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Check current date is highlighted
    const today = new Date().getDate().toString();
    await expect(page.locator(`[data-testid="calendar-day-${today}"]`)).toHaveClass(/highlighted/);
    
    // Check time slots are visible
    await expect(page.locator('[data-testid="time-slot"]').first()).toBeVisible();
  });

  test('should switch between calendar views', async ({ page }) => {
    // Switch to week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
    
    // Switch to day view  
    await page.click('button:has-text("Day")');
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();
    
    // Switch back to month view
    await page.click('button:has-text("Month")');
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
  });

  test('should create a new reservation', async ({ page }) => {
    // Click on available time slot
    await page.click('[data-testid="time-slot-available"]:first-child');
    
    // Fill reservation form
    await page.selectOption('select[name="court"]', { label: 'Court 1' });
    await page.selectOption('select[name="duration"]', '90');
    
    // Add participants
    await page.fill('input[name="participants"]', 'player2@example.com');
    await page.keyboard.press('Enter');
    
    // Confirm reservation
    await page.click('button:has-text("Confirm Reservation")');
    
    // Check success message
    await waitForToast(page, 'Reservation confirmed');
    
    // Check reservation appears in calendar
    await expect(page.locator('[data-testid="reservation-block"]')).toBeVisible();
  });

  test('should edit existing reservation', async ({ page }) => {
    // Click on existing reservation
    await page.click('[data-testid="reservation-block"]:first-child');
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Change duration
    await page.selectOption('select[name="duration"]', '120');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Check success message
    await waitForToast(page, 'Reservation updated');
  });

  test('should cancel reservation', async ({ page }) => {
    // Click on existing reservation
    await page.click('[data-testid="reservation-block"]:first-child');
    
    // Click cancel button
    await page.click('button:has-text("Cancel Reservation")');
    
    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel")');
    
    // Check success message
    await waitForToast(page, 'Reservation cancelled');
    
    // Check reservation is removed
    await expect(page.locator('[data-testid="reservation-block"]')).not.toBeVisible();
  });

  test('should create recurring reservation', async ({ page }) => {
    // Click on available time slot
    await page.click('[data-testid="time-slot-available"]:first-child');
    
    // Enable recurring
    await page.check('input[name="recurring"]');
    
    // Set recurrence pattern
    await page.selectOption('select[name="frequency"]', 'weekly');
    await page.check('input[value="monday"]');
    await page.check('input[value="wednesday"]');
    await page.check('input[value="friday"]');
    
    // Set end date
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    await page.fill('input[name="endDate"]', endDate.toISOString().split('T')[0]);
    
    // Confirm reservation
    await page.click('button:has-text("Create Recurring Reservation")');
    
    // Check confirmation dialog
    await expect(page.locator('text=This will create 36 reservations')).toBeVisible();
    await page.click('button:has-text("Confirm")');
    
    // Check success message
    await waitForToast(page, 'Recurring reservations created');
  });

  test('should handle conflicting reservations', async ({ page }) => {
    // Try to book an already reserved slot
    await page.click('[data-testid="time-slot-reserved"]:first-child');
    
    // Check conflict message
    await expect(page.locator('text=This time slot is already reserved')).toBeVisible();
    
    // Suggest alternative times
    await expect(page.locator('text=Available alternatives')).toBeVisible();
    
    // Click on alternative
    await page.click('[data-testid="alternative-slot"]:first-child');
    
    // Confirm alternative reservation
    await page.click('button:has-text("Book Alternative")');
    
    // Check success
    await waitForToast(page, 'Reservation confirmed');
  });

  test('should filter courts by availability', async ({ page }) => {
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Select court type
    await page.check('input[value="padel"]');
    
    // Select features
    await page.check('input[value="indoor"]');
    await page.check('input[value="lighting"]');
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Check filtered results
    const courts = page.locator('[data-testid="court-option"]');
    const count = await courts.count();
    
    for (let i = 0; i < count; i++) {
      const courtInfo = await courts.nth(i).textContent();
      expect(courtInfo).toContain('Padel');
      expect(courtInfo).toContain('Indoor');
    }
  });

  test('should show partner requests', async ({ page }) => {
    // Go to partner requests
    await page.click('button:has-text("Find Partners")');
    
    // Check requests list
    await expect(page.locator('[data-testid="partner-request"]')).toBeVisible();
    
    // Create new partner request
    await page.click('button:has-text("Create Request")');
    
    // Fill request form
    await page.selectOption('select[name="skillLevel"]', 'intermediate');
    await page.fill('input[name="date"]', new Date().toISOString().split('T')[0]);
    await page.selectOption('select[name="timePreference"]', 'morning');
    await page.fill('textarea[name="message"]', 'Looking for a doubles partner');
    
    // Submit request
    await page.click('button:has-text("Post Request")');
    
    // Check success
    await waitForToast(page, 'Partner request posted');
  });

  test('should handle payment for reservation', async ({ page }) => {
    // Create a reservation
    await page.click('[data-testid="time-slot-available"]:first-child');
    await page.click('button:has-text("Confirm Reservation")');
    
    // Check payment modal
    await expect(page.locator('h2:has-text("Payment")')).toBeVisible();
    
    // Select payment method
    await page.click('input[value="credit_card"]');
    
    // Fill payment details (using Stripe test card)
    await page.frameLocator('iframe[title="Secure card payment input frame"]').locator('input[name="cardnumber"]').fill('4242424242424242');
    await page.frameLocator('iframe[title="Secure card payment input frame"]').locator('input[name="exp-date"]').fill('12/25');
    await page.frameLocator('iframe[title="Secure card payment input frame"]').locator('input[name="cvc"]').fill('123');
    await page.frameLocator('iframe[title="Secure card payment input frame"]').locator('input[name="postal"]').fill('12345');
    
    // Complete payment
    await page.click('button:has-text("Pay Now")');
    
    // Check success
    await waitForToast(page, 'Payment successful');
    await waitForToast(page, 'Reservation confirmed');
  });

  test('should export reservations', async ({ page }) => {
    // Go to my reservations
    await page.click('button:has-text("My Reservations")');
    
    // Click export
    await page.click('[data-testid="export-reservations"]');
    
    // Select date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    await page.fill('input[name="startDate"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', new Date().toISOString().split('T')[0]);
    
    // Select format
    await page.click('input[value="pdf"]');
    
    // Download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('reservations');
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});