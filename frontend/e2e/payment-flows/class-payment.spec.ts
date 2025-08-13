import { test, expect } from '@playwright/test';
import { loginAsUser, waitForAPI } from '../helpers/auth';
import { mockStripeElements } from '../helpers/stripe-mocks';

test.describe('Class Enrollment Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockStripeElements(page);
  });

  test('Pay for individual class enrollment', async ({ page }) => {
    // Navigate to classes
    await page.goto('/es/classes');
    await page.waitForLoadState('networkidle');
    
    // Find available class
    await page.click('[data-testid="class-filter-beginner"]');
    await page.click('[data-testid="class-card"]').first();
    
    // View class details
    await expect(page.locator('[data-testid="class-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="class-price"]')).toContainText('$50.00');
    
    // Click enroll
    await page.click('[data-testid="enroll-button"]');
    
    // Fill payment details
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    // Submit payment
    await page.click('[data-testid="submit-payment"]');
    
    // Wait for enrollment confirmation
    await waitForAPI(page, '/api/classes/enrollments/');
    
    // Verify success
    await expect(page.locator('[data-testid="enrollment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="class-confirmed"]')).toBeVisible();
    
    // Check enrollment in my classes
    await page.goto('/es/classes/my-classes');
    await expect(page.locator('[data-testid="enrolled-class"]').first()).toContainText('Inscrito');
  });

  test('Purchase class package', async ({ page }) => {
    // Navigate to class packages
    await page.goto('/es/classes/packages');
    
    // Select package
    await page.click('[data-testid="package-10-classes"]');
    
    // View package details
    await expect(page.locator('[data-testid="package-name"]')).toContainText('10 Clases');
    await expect(page.locator('[data-testid="package-price"]')).toContainText('$400.00');
    await expect(page.locator('[data-testid="package-savings"]')).toContainText('Ahorra $100');
    
    // Purchase package
    await page.click('[data-testid="purchase-package"]');
    
    // Fill payment details
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Wait for package creation
    await waitForAPI(page, '/api/classes/student-packages/');
    
    // Verify package purchased
    await expect(page.locator('[data-testid="package-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="classes-remaining"]')).toContainText('10 clases disponibles');
  });

  test('Use package credits for class enrollment', async ({ page }) => {
    // Ensure user has package
    await page.goto('/es/classes/my-packages');
    await expect(page.locator('[data-testid="active-package"]')).toBeVisible();
    
    // Navigate to classes
    await page.goto('/es/classes');
    
    // Select class
    await page.click('[data-testid="class-card"]').first();
    await page.click('[data-testid="enroll-button"]');
    
    // Verify package option is available
    await expect(page.locator('[data-testid="payment-method-package"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-credits"]')).toContainText('9 clases restantes');
    
    // Select package payment
    await page.click('[data-testid="payment-method-package"]');
    
    // Confirm enrollment
    await page.click('[data-testid="confirm-enrollment"]');
    
    // Wait for enrollment
    await waitForAPI(page, '/api/classes/enrollments/');
    
    // Verify success without payment
    await expect(page.locator('[data-testid="enrollment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-used"]')).toContainText('1 clase utilizada');
    
    // Verify credits updated
    await page.goto('/es/classes/my-packages');
    await expect(page.locator('[data-testid="package-credits"]')).toContainText('8 clases restantes');
  });

  test('Handle waitlist enrollment', async ({ page }) => {
    // Navigate to popular class (full)
    await page.goto('/es/classes');
    await page.click('[data-testid="class-full"]');
    
    // Verify class is full
    await expect(page.locator('[data-testid="class-status"]')).toContainText('Clase llena');
    await expect(page.locator('[data-testid="waitlist-available"]')).toBeVisible();
    
    // Join waitlist
    await page.click('[data-testid="join-waitlist"]');
    
    // Confirm waitlist enrollment (may require payment)
    await page.click('[data-testid="confirm-waitlist"]');
    
    // Verify waitlist position
    await expect(page.locator('[data-testid="waitlist-position"]')).toBeVisible();
    await expect(page.locator('[data-testid="waitlist-position"]')).toMatch(/Posición #\d+ en lista de espera/);
  });

  test('Cancel class and process refund', async ({ page }) => {
    // Navigate to my classes
    await page.goto('/es/classes/my-classes');
    
    // Find enrolled class
    await page.click('[data-testid="enrolled-class-paid"]');
    
    // Click cancel enrollment
    await page.click('[data-testid="cancel-enrollment"]');
    
    // Confirm cancellation
    await expect(page.locator('[data-testid="cancel-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-policy"]')).toContainText('100% reembolso');
    
    await page.click('[data-testid="confirm-cancel"]');
    
    // Wait for refund processing
    await waitForAPI(page, '/api/finance/payments/*/refund/');
    
    // Verify cancellation and refund
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-processed"]')).toContainText('$50.00 reembolsado');
  });
});

test.describe('Class Payment Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockStripeElements(page);
  });

  test('Handle expired package', async ({ page }) => {
    // Set expired package in session
    await page.evaluate(() => {
      localStorage.setItem('user_package_expired', 'true');
    });
    
    await page.goto('/es/classes');
    await page.click('[data-testid="class-card"]').first();
    await page.click('[data-testid="enroll-button"]');
    
    // Verify package not available
    await expect(page.locator('[data-testid="payment-method-package"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="package-expired-notice"]')).toBeVisible();
    
    // Must pay with card
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    await expect(page.locator('[data-testid="enrollment-success"]')).toBeVisible();
  });

  test('Apply member discount to class enrollment', async ({ page }) => {
    // Set user as member
    await page.evaluate(() => {
      localStorage.setItem('user_is_member', 'true');
    });
    
    await page.goto('/es/classes');
    await page.click('[data-testid="class-card"]').first();
    
    // Verify member price displayed
    await expect(page.locator('[data-testid="regular-price"]')).toContainText('$50.00');
    await expect(page.locator('[data-testid="member-price"]')).toContainText('$40.00');
    
    await page.click('[data-testid="enroll-button"]');
    
    // Verify member price in payment
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('$40.00');
    
    // Complete payment
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Verify member price was charged
    await expect(page.locator('[data-testid="charged-amount"]')).toContainText('$40.00');
  });

  test('Handle class cancellation by instructor', async ({ page, request }) => {
    // Get enrolled class ID
    await page.goto('/es/classes/my-classes');
    const classId = await page.getAttribute('[data-testid="enrolled-class"]', 'data-class-id');
    
    // Simulate instructor cancellation via webhook
    const webhookPayload = {
      event: 'class.cancelled',
      class_id: classId,
      reason: 'Instructor unavailable'
    };
    
    await request.post('/api/webhooks/internal/', {
      data: webhookPayload
    });
    
    // Refresh page
    await page.reload();
    
    // Verify class cancelled and refund processed
    await expect(page.locator('[data-testid="class-cancelled-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="automatic-refund"]')).toContainText('Reembolso automático procesado');
  });
});