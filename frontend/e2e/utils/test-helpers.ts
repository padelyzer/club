import { Page, Locator } from '@playwright/test';

/**
 * Wait for an element to be stable (not animating)
 */
export async function waitForElementStable(locator: Locator, timeout = 5000) {
  await locator.waitFor({ state: 'visible', timeout });
  
  // Wait for animations to complete
  await locator.evaluate((el) => {
    return new Promise<void>((resolve) => {
      const checkStable = () => {
        const rect = el.getBoundingClientRect();
        setTimeout(() => {
          const newRect = el.getBoundingClientRect();
          if (
            rect.top === newRect.top &&
            rect.left === newRect.left &&
            rect.width === newRect.width &&
            rect.height === newRect.height
          ) {
            resolve();
          } else {
            checkStable();
          }
        }, 100);
      };
      checkStable();
    });
  });
}

/**
 * Wait for all network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: any,
  status = 200
) {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Upload file helper
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
) {
  const fileInput = await page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Generate random test data
 */
export const testData = {
  randomEmail: () => `test-${Date.now()}@example.com`,
  randomPhone: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  randomName: () => `Test User ${Date.now()}`,
  randomClubName: () => `Test Club ${Date.now()}`,
  randomCourtName: () => `Court ${Math.floor(Math.random() * 100)}`,
};

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, text: string, timeout = 5000) {
  const toast = page.locator(`[role="alert"]:has-text("${text}")`);
  await toast.waitFor({ state: 'visible', timeout });
  return toast;
}

/**
 * Dismiss all toasts
 */
export async function dismissAllToasts(page: Page) {
  const toasts = page.locator('[role="alert"]');
  const count = await toasts.count();
  
  for (let i = 0; i < count; i++) {
    const closeButton = toasts.nth(i).locator('button[aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(locator: Locator): Promise<boolean> {
  return await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((el) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/**
 * Wait for skeleton loaders to disappear
 */
export async function waitForSkeletonsToDisappear(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      return skeletons.length === 0;
    },
    { timeout }
  );
}

/**
 * Fill form with test data
 */
export async function fillForm(page: Page, formData: Record<string, any>) {
  for (const [field, value] of Object.entries(formData)) {
    const input = page.locator(`input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`);
    
    if (await input.isVisible()) {
      const tagName = await input.evaluate((el) => el.tagName);
      
      if (tagName === 'SELECT') {
        await input.selectOption(value);
      } else {
        await input.fill(value);
      }
    }
  }
}

/**
 * Retry action with backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}