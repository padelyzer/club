import { test, expect } from '@playwright/test';
import { loginAsUser, waitForAPI } from '../helpers/auth';
import { mockStripeElements } from '../helpers/stripe-mocks';

test.describe('Tournament Registration Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockStripeElements(page);
  });

  test('Register and pay for tournament', async ({ page }) => {
    // Navigate to tournaments
    await page.goto('/es/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Find open tournament
    await page.click('[data-testid="tournament-open"]').first();
    
    // View tournament details
    await expect(page.locator('[data-testid="tournament-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="registration-fee"]')).toContainText('$100.00');
    await expect(page.locator('[data-testid="tournament-dates"]')).toBeVisible();
    
    // Click register
    await page.click('[data-testid="register-button"]');
    
    // Fill team information
    await page.fill('[data-testid="team-name"]', 'Los Campeones');
    await page.fill('[data-testid="player2-email"]', 'partner@example.com');
    
    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Fill payment details
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    // Submit payment
    await page.click('[data-testid="submit-payment"]');
    
    // Wait for registration confirmation
    await waitForAPI(page, '/api/tournaments/*/registrations/');
    
    // Verify success
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-registered"]')).toContainText('Los Campeones');
    await expect(page.locator('[data-testid="tournament-bracket"]')).toBeVisible();
  });

  test('Split payment between team members', async ({ page }) => {
    // Navigate to tournament
    await page.goto('/es/tournaments');
    await page.click('[data-testid="tournament-open"]').first();
    await page.click('[data-testid="register-button"]');
    
    // Fill team information
    await page.fill('[data-testid="team-name"]', 'Dynamic Duo');
    await page.fill('[data-testid="player2-email"]', 'teammate@example.com');
    
    // Enable split payment
    await page.check('[data-testid="split-payment"]');
    
    // Set split amounts
    await expect(page.locator('[data-testid="total-fee"]')).toContainText('$100.00');
    await page.fill('[data-testid="my-amount"]', '50');
    await page.fill('[data-testid="partner-amount"]', '50');
    
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Pay my portion
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="pay-my-portion"]');
    
    // Verify partial payment recorded
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('50% pagado');
    await expect(page.locator('[data-testid="waiting-partner"]')).toBeVisible();
    
    // Verify email sent to partner
    await expect(page.locator('[data-testid="partner-notified"]')).toContainText('Email enviado a teammate@example.com');
  });

  test('Early bird discount for tournament', async ({ page }) => {
    // Navigate to tournament with early bird pricing
    await page.goto('/es/tournaments');
    await page.click('[data-testid="tournament-early-bird"]');
    
    // Verify discount displayed
    await expect(page.locator('[data-testid="regular-price"]')).toContainText('$150.00');
    await expect(page.locator('[data-testid="early-bird-price"]')).toContainText('$100.00');
    await expect(page.locator('[data-testid="discount-deadline"]')).toBeVisible();
    
    // Register with discount
    await page.click('[data-testid="register-button"]');
    await page.fill('[data-testid="team-name"]', 'Early Birds');
    await page.fill('[data-testid="player2-email"]', 'partner@example.com');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Verify discounted price in payment
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('$100.00');
    
    // Complete payment
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Verify discount applied
    await expect(page.locator('[data-testid="discount-applied"]')).toContainText('Descuento early bird aplicado: -$50.00');
  });

  test('Join waitlist when tournament is full', async ({ page }) => {
    // Navigate to full tournament
    await page.goto('/es/tournaments');
    await page.click('[data-testid="tournament-full"]');
    
    // Verify tournament is full
    await expect(page.locator('[data-testid="tournament-status"]')).toContainText('Torneo lleno');
    await expect(page.locator('[data-testid="waitlist-available"]')).toBeVisible();
    
    // Join waitlist
    await page.click('[data-testid="join-waitlist"]');
    
    // Fill team information
    await page.fill('[data-testid="team-name"]', 'Hopeful Team');
    await page.fill('[data-testid="player2-email"]', 'partner@example.com');
    
    // Waitlist may require partial payment
    await page.click('[data-testid="proceed-to-waitlist"]');
    
    // Pay waitlist fee (if applicable)
    await expect(page.locator('[data-testid="waitlist-fee"]')).toContainText('$25.00');
    
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Verify waitlist position
    await expect(page.locator('[data-testid="waitlist-confirmed"]')).toBeVisible();
    await expect(page.locator('[data-testid="waitlist-position"]')).toMatch(/Posición #\d+ en lista de espera/);
  });

  test('Cancel tournament registration and get refund', async ({ page }) => {
    // Navigate to my tournaments
    await page.goto('/es/tournaments/my-tournaments');
    
    // Find registered tournament
    await page.click('[data-testid="registered-tournament"]');
    
    // Click cancel registration
    await page.click('[data-testid="cancel-registration"]');
    
    // View cancellation policy
    await expect(page.locator('[data-testid="cancellation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-policy"]')).toContainText('80% reembolso');
    await expect(page.locator('[data-testid="refund-amount"]')).toContainText('$80.00');
    
    // Confirm cancellation
    await page.fill('[data-testid="cancellation-reason"]', 'Conflicto de horario');
    await page.click('[data-testid="confirm-cancellation"]');
    
    // Wait for refund processing
    await waitForAPI(page, '/api/finance/payments/*/refund/');
    
    // Verify cancellation and partial refund
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-processed"]')).toContainText('$80.00 reembolsado');
    await expect(page.locator('[data-testid="cancellation-fee"]')).toContainText('$20.00 cargo por cancelación');
  });
});

test.describe('Tournament Payment Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockStripeElements(page);
  });

  test('Handle team member payment failure in split payment', async ({ page, request }) => {
    // Set up partial payment scenario
    await page.goto('/es/tournaments/my-tournaments');
    await page.click('[data-testid="pending-team-payment"]');
    
    // Simulate partner payment failure webhook
    const webhookPayload = {
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          metadata: {
            tournament_registration_id: 'reg_123',
            player_type: 'partner'
          }
        }
      }
    };
    
    await request.post('/api/finance/webhooks/stripe/', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test_signature'
      }
    });
    
    // Verify notification
    await page.reload();
    await expect(page.locator('[data-testid="partner-payment-failed"]')).toBeVisible();
    await expect(page.locator('[data-testid="registration-deadline-warning"]')).toBeVisible();
  });

  test('Automatic promotion from waitlist', async ({ page, request }) => {
    // Navigate to waitlisted tournament
    await page.goto('/es/tournaments/my-tournaments');
    await page.click('[data-testid="waitlisted-tournament"]');
    
    // Verify waitlist status
    await expect(page.locator('[data-testid="status-waitlist"]')).toBeVisible();
    
    // Simulate spot opening webhook
    const webhookPayload = {
      event: 'tournament.spot_available',
      tournament_id: 'tourn_123',
      registration_id: 'reg_456'
    };
    
    await request.post('/api/webhooks/internal/', {
      data: webhookPayload
    });
    
    // Verify promotion notification
    await page.reload();
    await expect(page.locator('[data-testid="promoted-from-waitlist"]')).toBeVisible();
    
    // Complete remaining payment
    await page.click('[data-testid="complete-registration"]');
    
    const remainingFee = await page.textContent('[data-testid="remaining-fee"]');
    await expect(page.locator('[data-testid="remaining-fee"]')).toContainText('$75.00');
    
    // Pay remaining amount
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="Card number"]').fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="MM / YY"]').fill('12/25');
    await page.frameLocator('iframe[name="stripe-card-element"]').locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="submit-payment"]');
    
    // Verify full registration
    await expect(page.locator('[data-testid="registration-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-confirmed"]')).toBeVisible();
  });

  test('Tournament cancellation and mass refund', async ({ page, request }) => {
    // Simulate tournament cancellation
    const webhookPayload = {
      event: 'tournament.cancelled',
      tournament_id: 'tourn_789',
      reason: 'Insufficient registrations'
    };
    
    await request.post('/api/webhooks/internal/', {
      data: webhookPayload
    });
    
    // Check notifications
    await page.goto('/es/notifications');
    await expect(page.locator('[data-testid="tournament-cancelled-notification"]')).toBeVisible();
    
    // Verify automatic refund
    await page.goto('/es/finance/payments');
    await expect(page.locator('[data-testid="refund-entry"]').first()).toContainText('Reembolso completo - Torneo cancelado');
    await expect(page.locator('[data-testid="refund-amount"]').first()).toContainText('$100.00');
  });
});