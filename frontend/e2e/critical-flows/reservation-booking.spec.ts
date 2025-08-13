import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';

/**
 * E2E Tests: Reservation Booking Critical Flow
 * Tests the complete reservation booking workflow from availability check to confirmation
 * Day 5-6 of Testing Suite - Critical User Flow #2
 */

test.describe('Reservation Booking Flow', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to reservations page
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    await page.click('[data-testid="nav-reservations"]');
    await helpers.waitForPageLoad();
  });

  test('should complete full booking workflow under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    // Step 1: Check availability
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    const availabilityStart = Date.now();
    
    // Select date
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    // Verify availability grid is loaded
    await expect(page.locator('[data-testid="availability-grid"]')).toBeVisible();
    
    // Find first available slot
    const availableSlot = page.locator('[data-testid="available-slot"]').first();
    await expect(availableSlot).toBeVisible();
    
    const availabilityDuration = Date.now() - availabilityStart;
    
    // Step 2: Select slot and open booking modal
    const bookingStart = Date.now();
    
    await availableSlot.click();
    
    // Booking modal should open
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
    
    // Verify modal has all required fields
    await expect(page.locator('[data-testid="booking-court"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-duration"]')).toBeVisible();
    
    // Step 3: Fill booking details
    await page.selectOption('[data-testid="booking-duration"]', '60'); // 1 hour
    
    // Add player information if required
    const playerFields = page.locator('[data-testid="player-input"]');
    const playerCount = await playerFields.count();
    
    for (let i = 0; i < Math.min(playerCount, 2); i++) {
      await playerFields.nth(i).fill(`Player ${i + 1}`);
    }
    
    // Step 4: Submit booking
    await page.click('[data-testid="booking-submit"]');
    
    // Step 5: Handle payment (mock or skip if test mode)
    const paymentModal = page.locator('[data-testid="payment-modal"]');
    if (await paymentModal.isVisible({ timeout: 2000 })) {
      // Mock payment success
      await page.click('[data-testid="mock-payment-success"]');
    }
    
    // Step 6: Wait for confirmation
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    
    const bookingDuration = Date.now() - bookingStart;
    const totalDuration = Date.now() - startTime;
    
    // Performance assertions
    expect(availabilityDuration, `Availability check should complete within 1s but took ${availabilityDuration}ms`)
      .toBeLessThan(1000);
    
    expect(bookingDuration, `Booking should complete within 3s but took ${bookingDuration}ms`)
      .toBeLessThan(3000);
    
    expect(totalDuration, `Total booking flow should complete within 5s but took ${totalDuration}ms`)
      .toBeLessThan(5000);
    
    // Verify booking appears in reservation list
    await page.click('[data-testid="close-success-modal"]');
    await helpers.waitForPageLoad();
    
    // Should see the new reservation
    await expect(page.locator('[data-testid="reservation-item"]').first()).toBeVisible();
    
    console.log(`✅ Booking Flow Performance:
      - Availability: ${availabilityDuration}ms
      - Booking: ${bookingDuration}ms
      - Total: ${totalDuration}ms`);
  });

  test('should handle concurrent booking conflicts', async ({ page, context }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Open availability
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    const availableSlot = page.locator('[data-testid="available-slot"]').first();
    await availableSlot.click();
    
    // Get slot details
    const ______courtName = await page.textContent('[data-testid="booking-court"] option:checked');
    const ______timeSlot = await page.textContent('[data-testid="booking-time"]');
    
    // Create second browser context (simulate another user)
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    const helpers2 = new TestHelpers(page2);
    await helpers2.waitForPageLoad();
    
    // Navigate to reservations in second tab
    await page2.click('[data-testid="nav-reservations"]');
    await helpers2.waitForPageLoad();
    
    // Select same date and slot
    await page2.fill('[data-testid="date-picker"]', dateString);
    await helpers2.waitForPageLoad();
    
    // Try to book same slot
    const sameslot = page2.locator('[data-testid="available-slot"]').first();
    await sameslot.click();
    
    // Both users try to submit at the same time
    const submitPromises = [
      page.click('[data-testid="booking-submit"]'),
      page2.click('[data-testid="booking-submit"]')
    ];
    
    await Promise.allSettled(submitPromises);
    
    // One should succeed, one should get conflict error
    const successModal1 = page.locator('[data-testid="booking-success"]');
    const successModal2 = page2.locator('[data-testid="booking-success"]');
    const conflictError1 = page.locator('[data-testid="booking-conflict"]');
    const conflictError2 = page2.locator('[data-testid="booking-conflict"]');
    
    const success1 = await successModal1.isVisible({ timeout: 2000 });
    const success2 = await successModal2.isVisible({ timeout: 2000 });
    const conflict1 = await conflictError1.isVisible({ timeout: 2000 });
    const conflict2 = await conflictError2.isVisible({ timeout: 2000 });
    
    // Exactly one should succeed
    expect(success1 || success2, 'One booking should succeed').toBeTruthy();
    expect(success1 && success2, 'Both bookings should not succeed').toBeFalsy();
    
    // One should get conflict error
    expect(conflict1 || conflict2, 'One booking should get conflict error').toBeTruthy();
    
    await page2.close();
  });

  test('should use BFF bulk availability endpoint', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', (request: any) => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });
    
    // Check availability
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    // Verify BFF bulk availability endpoint was called
    const bffAvailabilityCalls = apiCalls.filter(url => 
      url.includes('/api/reservations/availability/bulk')
    );
    
    expect(bffAvailabilityCalls.length, 'BFF bulk availability endpoint should be called')
      .toBeGreaterThan(0);
    
    // Should not make multiple individual court calls
    const individualCourtCalls = apiCalls.filter(url => 
      url.includes('/api/courts/') && url.includes('/availability')
    );
    
    expect(individualCourtCalls.length, 'Should not make individual court availability calls')
      .toBeLessThan(3); // Allow some, but not many
  });

  test('should show real-time availability updates', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Load availability
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    // Count initial available slots
    const initialSlots = await page.locator('[data-testid="available-slot"]').count();
    
    // Simulate another user booking a slot (mock WebSocket update)
    await page.evaluate(() => {
      // Simulate WebSocket message
      const mockUpdate = {
        type: 'availability_update',
        data: {
          date: new Date().toISOString().split('T')[0],
          court_id: 'court-1',
          slot_time: '14:00',
          is_available: false
        }
      };
      
      // Trigger custom event that the app listens to
      window.dispatchEvent(new CustomEvent('ws-availability-update', { 
        detail: mockUpdate 
      }));
    });
    
    // Wait for update to be reflected
    await page.waitForTimeout(1000);
    
    // Should have one less available slot
    const updatedSlots = await page.locator('[data-testid="available-slot"]').count();
    expect(updatedSlots, 'Available slots should decrease after booking').toBeLessThan(initialSlots);
  });

  test('should handle different court types and pricing', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Load availability
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    // Should show courts with different types
    const courtFilters = page.locator('[data-testid="court-type-filter"]');
    await expect(courtFilters).toBeVisible();
    
    // Filter by indoor courts
    await page.click('[data-testid="filter-indoor"]');
    await helpers.waitForPageLoad();
    
    // All visible courts should be indoor
    const courtLabels = page.locator('[data-testid="court-label"]');
    const courtCount = await courtLabels.count();
    
    for (let i = 0; i < courtCount; i++) {
      const courtText = await courtLabels.nth(i).textContent();
      expect(courtText?.toLowerCase()).toContain('indoor');
    }
    
    // Check pricing display
    const priceLabels = page.locator('[data-testid="slot-price"]');
    const firstPrice = await priceLabels.first().textContent();
    
    expect(firstPrice).toMatch(/\$\d+(\.\d{2})?/); // Should show price in format $XX.XX
    
    // Filter by outdoor courts
    await page.click('[data-testid="filter-outdoor"]');
    await helpers.waitForPageLoad();
    
    // Prices might be different for outdoor courts
    const outdoorPrice = await page.locator('[data-testid="slot-price"]').first().textContent();
    expect(outdoorPrice).toMatch(/\$\d+(\.\d{2})?/);
  });

  test('should validate booking form correctly', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Load availability and select slot
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    await page.locator('[data-testid="available-slot"]').first().click();
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
    
    // Try to submit without required fields
    await page.click('[data-testid="booking-submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Fill minimum required fields
    await page.selectOption('[data-testid="booking-duration"]', '60');
    
    // Player names might be required
    const playerInputs = page.locator('[data-testid="player-input"]');
    const playerCount = await playerInputs.count();
    
    if (playerCount > 0) {
      await playerInputs.first().fill('Test Player');
    }
    
    // Now submission should work
    await page.click('[data-testid="booking-submit"]');
    
    // Should not show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    await helpers.simulateMobile();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Mobile date picker
    await page.tap('[data-testid="date-picker"]');
    await page.fill('[data-testid="date-picker"]', dateString);
    await helpers.waitForPageLoad();
    
    // Availability grid should be touch-friendly
    const availableSlot = page.locator('[data-testid="available-slot"]').first();
    await expect(availableSlot).toBeVisible();
    
    // Tap to select
    await availableSlot.tap();
    
    // Mobile booking modal
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
    
    // Modal should be responsive
    const modal = page.locator('[data-testid="booking-modal"]');
    const modalBox = await modal.boundingBox();
    
    expect(modalBox?.width, 'Modal should fit mobile screen').toBeLessThan(400);
    
    // Touch-friendly form elements
    await page.selectOption('[data-testid="booking-duration"]', '60');
    await page.tap('[data-testid="booking-submit"]');
    
    // Success should be visible on mobile
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
  });

  test('should handle booking cancellation', async ({ page }) => {
    // First, create a booking to cancel
    const reservationId = await helpers.bookReservation({
      date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
      court: 'Court 1',
      startTime: '14:00',
      endTime: '15:00'
    });
    
    // Navigate to reservations list
    await page.click('[data-testid="my-reservations-tab"]');
    await helpers.waitForPageLoad();
    
    // Find the reservation and cancel it
    const reservationItem = page.locator(`[data-testid="reservation-${reservationId}"]`);
    await expect(reservationItem).toBeVisible();
    
    // Click cancel button
    await reservationItem.locator('[data-testid="cancel-reservation"]').click();
    
    // Confirm cancellation
    await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible();
    await page.click('[data-testid="confirm-cancel"]');
    
    // Should show cancellation success
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
    
    // Reservation should be marked as cancelled
    await expect(reservationItem.locator('[data-testid="status-cancelled"]')).toBeVisible();
    
    // Slot should become available again
    const originalDate = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
    await page.fill('[data-testid="date-picker"]', originalDate);
    await helpers.waitForPageLoad();
    
    // The cancelled slot should now appear as available
    const availableSlots = page.locator('[data-testid="available-slot"]');
    const slotCount = await availableSlots.count();
    expect(slotCount, 'Cancelled slot should be available again').toBeGreaterThan(0);
  });

  test('should enforce booking time restrictions', async ({ page }) => {
    // Try to book a slot in the past (should not be available)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split('T')[0];
    
    await page.fill('[data-testid="date-picker"]', pastDate);
    await helpers.waitForPageLoad();
    
    // Should show no available slots or past date message
    const availableSlots = page.locator('[data-testid="available-slot"]');
    const pastDateMessage = page.locator('[data-testid="past-date-message"]');
    
    const slotsVisible = await availableSlots.isVisible({ timeout: 2000 });
    const messageVisible = await pastDateMessage.isVisible({ timeout: 2000 });
    
    expect(slotsVisible || messageVisible, 'Should handle past dates appropriately').toBeTruthy();
    
    if (slotsVisible) {
      const slotCount = await availableSlots.count();
      expect(slotCount, 'Past dates should have no available slots').toBe(0);
    }
    
    // Try to book too far in advance
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 365); // 1 year ahead
    const futureDate = farFuture.toISOString().split('T')[0];
    
    await page.fill('[data-testid="date-picker"]', futureDate);
    
    // Should show restriction message or limit selection
    const restrictionMessage = page.locator('[data-testid="booking-restriction"]');
    if (await restrictionMessage.isVisible({ timeout: 2000 })) {
      expect(await restrictionMessage.textContent()).toContain('advance');
    }
  });
});