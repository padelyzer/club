import { test, expect } from '@playwright/test';
import { testData, waitForToast, waitForNetworkIdle } from '../utils/helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('/dashboard');
    
    // Check user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check error message
    await waitForToast(page, 'Invalid credentials');
    
    // Should still be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/register');
    
    const email = testData.randomEmail();
    
    // Fill registration form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    // Accept terms
    await page.check('input[name="acceptTerms"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for registration to complete
    await waitForNetworkIdle(page);
    
    // Check success message
    await waitForToast(page, 'Registration successful');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Open user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to home
    await page.waitForURL('/');
    
    // User menu should not be visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Enter email
    await page.fill('input[name="email"]', 'user@example.com');
    await page.click('button[type="submit"]');
    
    // Check success message
    await waitForToast(page, 'Password reset link sent');
    
    // Mock the reset token URL
    await page.goto('/reset-password?token=mock-reset-token');
    
    // Enter new password
    await page.fill('input[name="password"]', 'NewSecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!');
    await page.click('button[type="submit"]');
    
    // Check success message
    await waitForToast(page, 'Password reset successful');
    
    // Should redirect to login
    await page.waitForURL('/login');
  });

  test('should enforce authentication on protected routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('/login');
    
    // Check for redirect message
    await expect(page.locator('text=Please login to continue')).toBeVisible();
  });

  test('should persist authentication on page reload', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Save storage state
    await context.storageState({ path: 'e2e/.auth/test-user.json' });
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle session expiry', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Mock expired session
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
    });
    
    // Try to perform authenticated action
    await page.goto('/dashboard/profile');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await waitForToast(page, 'Session expired');
  });
});