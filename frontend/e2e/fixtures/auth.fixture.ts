import { test as base, Page, BrowserContext } from '@playwright/test';

export interface AuthFixtures {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
  adminPage: Page;
  adminContext: BrowserContext;
}

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    // Create a new context with saved auth state
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    });
    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },

  adminContext: async ({ browser }, use) => {
    // Create a new context with admin auth state
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';

// Helper to authenticate a user
export async function authenticateUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for authentication to complete
  await page.waitForURL('/dashboard');
  
  // Save storage state
  return page.context().storageState({ path: 'e2e/.auth/user.json' });
}

// Helper to authenticate an admin
export async function authenticateAdmin(page: Page) {
  return authenticateUser(page, 'admin@example.com', 'admin123');
}