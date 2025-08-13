// e2e/utils/test-framework.ts
// 🧪 FRAMEWORK COMPREHENSIVO DE TESTS FUNCIONALES - PLAYWRIGHT

import { Page, Locator, expect } from '@playwright/test';

// ============================================================================
// BASE CLASSES
// ============================================================================

export abstract class BasePage {
  protected page: Page;
  protected url: string;

  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  async goto() {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async checkA11y() {
    // Basic accessibility checks
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    const images = await this.page.locator('img').count();
    const imagesWithAlt = await this.page.locator('img[alt]').count();
    
    expect(headings).toBeGreaterThan(0);
    if (images > 0) {
      expect(imagesWithAlt).toBe(images);
    }
  }
}

export class ModuleTestRunner {
  private page: Page;
  private moduleName: string;
  private results: TestResult[] = [];

  constructor(page: Page, moduleName: string) {
    this.page = page;
    this.moduleName = moduleName;
  }

  async runFunctionTest(
    functionName: string, 
    testFn: () => Promise<void>,
    description?: string
  ) {
    const startTime = Date.now();
    let success = false;
    let error = '';

    try {
      await testFn();
      success = true;
    } catch (e: any) {
      error = e.message;
    }

    const duration = Date.now() - startTime;
    
    this.results.push({
      module: this.moduleName,
      function: functionName,
      description: description || functionName,
      success,
      error,
      duration
    });

    return success;
  }

  getResults(): TestResult[] {
    return this.results;
  }

  generateReport(): string {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    let report = `\n📊 REPORTE DE TESTS - ${this.moduleName.toUpperCase()}\n`;
    report += `======================================\n`;
    report += `✅ Pasados: ${passed}/${total}\n`;
    report += `❌ Fallidos: ${failed}/${total}\n`;
    report += `📈 Porcentaje éxito: ${((passed/total) * 100).toFixed(1)}%\n\n`;

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      report += `${status} ${result.function}: ${result.description} (${result.duration}ms)\n`;
      if (!result.success) {
        report += `   Error: ${result.error}\n`;
      }
    });

    return report;
  }
}

// ============================================================================
// DATA TYPES
// ============================================================================

export interface TestResult {
  module: string;
  function: string;
  description: string;
  success: boolean;
  error: string;
  duration: number;
}

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'club_admin' | 'club_manager' | 'user';
  name: string;
}

export interface TestData {
  users: TestUser[];
  clubs: any[];
  clients: any[];
  reservations: any[];
}

// ============================================================================
// TEST HELPERS
// ============================================================================

export class TestHelpers {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Authentication helpers
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('**/dashboard**');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('**/login**');
  }

  // Navigation helpers
  async navigateToModule(moduleName: string) {
    const moduleMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'analytics': '/analytics',
      'clients': '/clients',
      'reservations': '/reservations',
      'clubs': '/clubs',
      'courts': '/courts',
      'tournaments': '/tournaments',
      'leagues': '/leagues',
      'finance': '/finance',
      'profile': '/profile',
      'classes': '/classes'
    };

    const url = moduleMap[moduleName];
    if (!url) throw new Error(`Module ${moduleName} not found`);

    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  // UI interaction helpers
  async waitForElement(selector: string, timeout = 10000) {
    return await this.page.waitForSelector(selector, { timeout });
  }

  async clickAndWait(selector: string, waitForSelector?: string) {
    await this.page.click(selector);
    if (waitForSelector) {
      await this.waitForElement(waitForSelector);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[name="${field}"]`, value);
    }
  }

  async submitForm(formSelector = 'form') {
    await this.page.click(`${formSelector} button[type="submit"]`);
    await this.page.waitForLoadState('networkidle');
  }

  // Verification helpers
  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementNotVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async expectTextContent(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern);
  }

  // Data helpers
  async createTestClient() {
    return {
      name: `Test Client ${Date.now()}`,
      email: `client${Date.now()}@test.com`,
      phone: '+1234567890',
      level: 'intermediate'
    };
  }

  async createTestReservation() {
    return {
      court: 'Court 1',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '18:00',
      duration: '90'
    };
  }

  // Performance helpers
  async measurePageLoad() {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async checkPerformance() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Assert performance thresholds
    expect(metrics.loadTime).toBeLessThan(3000); // 3 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds

    return metrics;
  }

  // Mobile helpers
  async testMobileResponsiveness() {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(1000); // Allow layout to settle
      
      // Check that content is accessible
      await this.expectElementVisible('main');
      
      // Check mobile menu if on small screen
      if (viewport.width < 768) {
        await this.expectElementVisible('[data-testid="mobile-menu-trigger"]');
      }
    }

    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}

// ============================================================================
// PAGE OBJECTS
// ============================================================================

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page, '/login');
  }

  get emailInput() { return this.page.locator('input[name="email"]'); }
  get passwordInput() { return this.page.locator('input[name="password"]'); }
  get submitButton() { return this.page.locator('button[type="submit"]'); }
  get errorMessage() { return this.page.locator('[data-testid="error-message"]'); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page, '/dashboard');
  }

  get welcomeMessage() { return this.page.locator('[data-testid="welcome-message"]'); }
  get statsCards() { return this.page.locator('[data-testid="stats-card"]'); }
  get navigationMenu() { return this.page.locator('[data-testid="nav-menu"]'); }
}

export class ClientsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/clients');
  }

  get addClientButton() { return this.page.locator('[data-testid="add-client-button"]'); }
  get clientsTable() { return this.page.locator('[data-testid="clients-table"]'); }
  get searchInput() { return this.page.locator('[data-testid="search-input"]'); }
  get filterButton() { return this.page.locator('[data-testid="filter-button"]'); }

  async searchClient(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async addClient(clientData: any) {
    await this.addClientButton.click();
    await this.page.fill('[name="name"]', clientData.name);
    await this.page.fill('[name="email"]', clientData.email);
    await this.page.fill('[name="phone"]', clientData.phone);
    await this.page.click('button[type="submit"]');
  }
}

export class ReservationsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/reservations');
  }

  get createReservationButton() { return this.page.locator('[data-testid="create-reservation-button"]'); }
  get reservationsCalendar() { return this.page.locator('[data-testid="reservations-calendar"]'); }
  get timeSlots() { return this.page.locator('[data-testid="time-slot"]'); }

  async createReservation(reservationData: any) {
    await this.createReservationButton.click();
    // Fill reservation form
    await this.page.selectOption('[name="court"]', reservationData.court);
    await this.page.fill('[name="date"]', reservationData.date);
    await this.page.selectOption('[name="time"]', reservationData.time);
    await this.page.click('button[type="submit"]');
  }
}

// ============================================================================
// TEST DATA
// ============================================================================

export const testData: TestData = {
  users: [
    {
      email: 'admin@test.com',
      password: 'Admin123!',
      role: 'admin',
      name: 'Test Admin'
    },
    {
      email: 'clubadmin@test.com',
      password: 'ClubAdmin123!',
      role: 'club_admin',
      name: 'Club Admin'
    },
    {
      email: 'user@test.com',
      password: 'User123!',
      role: 'user',
      name: 'Test User'
    }
  ],
  clubs: [
    {
      name: 'Test Paddle Club',
      address: '123 Test Street',
      phone: '+1234567890'
    }
  ],
  clients: [
    {
      name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      level: 'intermediate'
    }
  ],
  reservations: [
    {
      court: 'Court 1',
      date: '2025-08-10',
      time: '18:00',
      duration: 90
    }
  ]
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export {
  BasePage,
  TestHelpers,
  LoginPage,
  DashboardPage,
  ClientsPage,
  ReservationsPage,
  ModuleTestRunner
};
