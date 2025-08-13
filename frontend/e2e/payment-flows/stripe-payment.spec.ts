import { test, expect } from '@playwright/test';
import { loginAsUser, waitForAPI } from '../helpers/auth';
import { mockStripeElements } from '../helpers/stripe-mocks';

test.describe('Stripe Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockStripeElements(page);
  });

  test('Complete reservation payment with credit card', async ({ page }) => {
    // Navigate to reservations
    await page.goto('/es/reservations');
    await page.waitForLoadState('networkidle');

    // Select date and time
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    
    // Select court
    await page.click('[data-testid="court-1"]');
    
    // Select time slot
    await page.click('[data-testid="time-10:00"]');
    
    // Click reserve button
    await page.click('[data-testid="reserve-button"]');
    
    // Wait for payment modal
    await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
    
    // Verify reservation details
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('$50.00');
    await expect(page.locator('[data-testid="payment-description"]')).toContainText('Cancha 1');
    
    // Fill credit card details
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="ZIP"]').fill('12345');
    
    // Submit payment
    await page.click('[data-testid="submit-payment"]');
    
    // Wait for payment processing
    await waitForAPI(page, '/api/finance/payments/');
    
    // Verify success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="reservation-confirmed"]')).toContainText('Reserva confirmada');
    
    // Verify redirect to reservations list
    await page.waitForURL('**/reservations');
    await expect(page.locator('[data-testid="reservation-status"]').first()).toContainText('Confirmada');
  });

  test('Handle payment failure gracefully', async ({ page }) => {
    await page.goto('/es/reservations');
    
    // Select reservation details
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-14:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Use card that triggers failure
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4000000000000002');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Tu tarjeta fue rechazada');
    
    // Verify user can retry
    await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
  });

  test('Process refund for paid reservation', async ({ page }) => {
    // Navigate to my reservations
    await page.goto('/es/reservations/my-reservations');
    
    // Find paid reservation
    await page.click('[data-testid="reservation-paid"]');
    
    // Click cancel reservation
    await page.click('[data-testid="cancel-reservation"]');
    
    // Confirm cancellation
    await expect(page.locator('[data-testid="cancel-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-cancel"]');
    
    // Wait for refund processing
    await waitForAPI(page, '/api/finance/payments/*/refund/');
    
    // Verify refund success
    await expect(page.locator('[data-testid="refund-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-amount"]')).toContainText('$50.00');
    await expect(page.locator('[data-testid="reservation-status"]')).toContainText('Cancelada');
  });

  test('Apply member discount during payment', async ({ page }) => {
    // Set user as member
    await page.evaluate(() => {
      localStorage.setItem('user_is_member', 'true');
    });
    
    await page.goto('/es/reservations');
    
    // Make reservation
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-16:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Verify member discount applied
    await expect(page.locator('[data-testid="original-price"]')).toContainText('$50.00');
    await expect(page.locator('[data-testid="member-discount"]')).toContainText('-$10.00');
    await expect(page.locator('[data-testid="final-price"]')).toContainText('$40.00');
    
    // Complete payment
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    await waitForAPI(page, '/api/finance/payments/');
    
    // Verify discounted amount was charged
    await expect(page.locator('[data-testid="charged-amount"]')).toContainText('$40.00');
  });

  test('Handle 3D Secure authentication', async ({ page }) => {
    await page.goto('/es/reservations');
    
    // Make reservation
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-18:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Use card that requires 3D Secure
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4000002500003155');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Handle 3D Secure modal
    const stripe3DFrame = page.frameLocator('iframe[name="stripe-3ds"]');
    await stripe3DFrame.locator('[data-testid="3ds-authenticate"]').click();
    
    // Wait for authentication
    await waitForAPI(page, '/api/finance/payments/');
    
    // Verify success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });

  test('Save payment method for future use', async ({ page }) => {
    await page.goto('/es/reservations');
    
    // Make reservation
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-09:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Fill payment details
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    // Check save payment method
    await page.check('[data-testid="save-payment-method"]');
    
    await page.click('[data-testid="submit-payment"]');
    await waitForAPI(page, '/api/finance/payment-methods/');
    
    // Make another reservation
    await page.goto('/es/reservations');
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-2"]');
    await page.click('[data-testid="time-11:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Verify saved card is available
    await expect(page.locator('[data-testid="saved-card-4242"]')).toBeVisible();
    await page.click('[data-testid="saved-card-4242"]');
    
    // Only need to enter CVC
    await page.fill('[data-testid="cvc-input"]', '123');
    await page.click('[data-testid="submit-payment"]');
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });
});

test.describe('Alternative Payment Methods', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('Pay with OXXO', async ({ page }) => {
    await page.goto('/es/reservations');
    
    // Make reservation
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-15:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Select OXXO payment
    await page.click('[data-testid="payment-method-oxxo"]');
    
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', 'Juan Pérez');
    await page.fill('[data-testid="customer-email"]', 'juan@example.com');
    
    await page.click('[data-testid="generate-oxxo-reference"]');
    
    // Verify OXXO reference generated
    await expect(page.locator('[data-testid="oxxo-reference"]')).toBeVisible();
    await expect(page.locator('[data-testid="oxxo-reference"]')).toMatch(/\d{14}/);
    await expect(page.locator('[data-testid="payment-deadline"]')).toBeVisible();
    
    // Verify reservation is pending
    await page.goto('/es/reservations/my-reservations');
    await expect(page.locator('[data-testid="reservation-pending"]').first()).toBeVisible();
  });

  test('Pay with bank transfer (SPEI)', async ({ page }) => {
    await page.goto('/es/reservations');
    
    // Make reservation
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-17:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Select SPEI payment
    await page.click('[data-testid="payment-method-spei"]');
    
    await page.click('[data-testid="generate-spei-reference"]');
    
    // Verify SPEI details
    await expect(page.locator('[data-testid="spei-clabe"]')).toBeVisible();
    await expect(page.locator('[data-testid="spei-reference"]')).toBeVisible();
    await expect(page.locator('[data-testid="spei-amount"]')).toContainText('$50.00');
    
    // Verify instructions
    await expect(page.locator('[data-testid="spei-instructions"]')).toContainText('Banco: BBVA');
  });
});

test.describe('Payment Webhooks', () => {
  test('Handle successful payment webhook', async ({ page, request }) => {
    // Make a reservation
    await loginAsUser(page);
    await page.goto('/es/reservations');
    
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="tomorrow-date"]');
    await page.click('[data-testid="court-1"]');
    await page.click('[data-testid="time-19:00"]');
    await page.click('[data-testid="reserve-button"]');
    
    // Get payment intent ID
    const paymentIntentId = await page.getAttribute('[data-testid="payment-intent"]', 'data-intent-id');
    
    // Simulate Stripe webhook
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 5000,
          currency: 'mxn',
          status: 'succeeded'
        }
      }
    };
    
    const response = await request.post('/api/finance/webhooks/stripe/', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test_signature'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Verify reservation is confirmed
    await page.reload();
    await expect(page.locator('[data-testid="reservation-status"]')).toContainText('Confirmada');
  });

  test('Handle failed payment webhook', async ({ page, request }) => {
    // Create pending payment
    const paymentIntentId = 'pi_test_failed_123';
    
    // Simulate failed payment webhook
    const webhookPayload = {
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId,
          amount: 5000,
          currency: 'mxn',
          status: 'failed',
          last_payment_error: {
            message: 'Your card was declined.'
          }
        }
      }
    };
    
    const response = await request.post('/api/finance/webhooks/stripe/', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test_signature'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Verify user receives notification
    await loginAsUser(page);
    await page.goto('/es/notifications');
    await expect(page.locator('[data-testid="payment-failed-notification"]')).toBeVisible();
  });
});