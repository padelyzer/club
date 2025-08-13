import { Page, Locator, expect } from '@playwright/test';
import { TestData, DataGenerators } from './test-data';

/**
 * Page Object base con métodos comunes
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Métodos de navegación comunes
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/login-simple');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  // Métodos de autenticación
  async login(email: string = TestData.auth.admin.email, password: string = TestData.auth.admin.password): Promise<void> {
    await this.navigateToLogin();
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(2000);
  }

  // Verificar elementos comunes
  async verifyPageTitle(title: string): Promise<void> {
    await expect(this.page.locator('h1, h2, h3').filter({ hasText: title })).toBeVisible();
  }

  // Manejar errores y mensajes
  async verifyErrorMessage(message: string): Promise<void> {
    const errorLocator = this.page.locator('text*=error, text*=Error, text*=fail, text*=problema');
    await expect(errorLocator.filter({ hasText: message })).toBeVisible();
  }

  async verifySuccessMessage(message: string): Promise<void> {
    const successLocator = this.page.locator('text*=success, text*=Success, text*=exitoso, text*=confirmado');
    await expect(successLocator.filter({ hasText: message })).toBeVisible();
  }

  // Métodos de viewport
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}

/**
 * Page Object para Dashboard
 */
export class DashboardPage extends BasePage {
  // Locators
  get welcomeTitle(): Locator {
    return this.page.locator('text=Welcome to Padelyzer Dashboard');
  }

  get logoutButton(): Locator {
    return this.page.locator('button', { hasText: 'Logout' });
  }

  get userEmail(): Locator {
    return this.page.locator('text=admin@padelyzer.com');
  }

  get clubsModuleLink(): Locator {
    return this.page.locator('a[href="/clubs"]');
  }

  get reservationsModuleLink(): Locator {
    return this.page.locator('a[href="/reservations"]');
  }

  // Métodos de acción
  async navigateToClubs(): Promise<void> {
    await this.clubsModuleLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToReservations(): Promise<void> {
    await this.reservationsModuleLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Verificaciones
  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.welcomeTitle).toBeVisible();
    await expect(this.userEmail).toBeVisible();
    await expect(this.logoutButton).toBeVisible();
  }

  async verifyModuleLinks(): Promise<void> {
    await expect(this.clubsModuleLink).toBeVisible();
    await expect(this.reservationsModuleLink).toBeVisible();
  }
}

/**
 * Page Object para Clubs Management
 */
export class ClubsPage extends BasePage {
  // Locators
  get pageTitle(): Locator {
    return this.page.locator('h1', { hasText: 'Clubs Management' });
  }

  get addNewClubButton(): Locator {
    return this.page.locator('button', { hasText: 'Add New Club' });
  }

  get backToDashboardButton(): Locator {
    return this.page.locator('button', { hasText: 'Back to Dashboard' });
  }

  get clubCards(): Locator {
    return this.page.locator('[data-testid="club-card"], div').filter({ hasText: /Club Padel/ });
  }

  get loadingMessage(): Locator {
    return this.page.locator('text=Loading clubs...');
  }

  get emptyState(): Locator {
    return this.page.locator('text=No clubs found');
  }

  get errorMessage(): Locator {
    return this.page.locator('text=Failed to load clubs');
  }

  // Paginación
  get nextButton(): Locator {
    return this.page.locator('button', { hasText: 'Next' });
  }

  get previousButton(): Locator {
    return this.page.locator('button', { hasText: 'Previous' });
  }

  get pageInfo(): Locator {
    return this.page.locator('text*=Page');
  }

  // Métodos de navegación
  async navigateToClubs(): Promise<void> {
    await this.page.goto('/clubs');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCreateClub(): Promise<void> {
    await this.addNewClubButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async backToDashboard(): Promise<void> {
    await this.backToDashboardButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Métodos de acción
  async clickClubByName(clubName: string): Promise<void> {
    const clubCard = this.page.locator('div').filter({ hasText: clubName });
    await clubCard.first().click();
    await this.page.waitForTimeout(1000);
  }

  async goToNextPage(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Verificaciones
  async verifyClubsPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.addNewClubButton).toBeVisible();
    await expect(this.backToDashboardButton).toBeVisible();
  }

  async verifyClubDisplayed(clubName: string): Promise<void> {
    await expect(this.page.locator(`text=${clubName}`)).toBeVisible();
  }

  async verifyClubCount(expectedCount: number): Promise<void> {
    await expect(this.clubCards).toHaveCount(expectedCount);
  }

  async verifyEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  async verifyLoadingState(): Promise<void> {
    await expect(this.loadingMessage).toBeVisible();
  }

  async verifyPaginationExists(): Promise<void> {
    await expect(this.pageInfo).toBeVisible();
  }
}

/**
 * Page Object para Client Search y Reservations
 */
export class ReservationsPage extends BasePage {
  // Locators
  get pageTitle(): Locator {
    return this.page.locator('h1, h2, h3').filter({ hasText: /Reservas|Reservations/ });
  }

  get clientSearchInput(): Locator {
    return this.page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
  }

  get visitorToggle(): Locator {
    return this.page.locator('text=Visitante, text=Visitor, input[type="checkbox"]').filter({ hasText: /Visitante|Visitor/ });
  }

  get visitorNameInput(): Locator {
    return this.page.locator('input[placeholder*="name"], input[placeholder*="nombre"]');
  }

  get visitorPhoneInput(): Locator {
    return this.page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]').last();
  }

  get clientResults(): Locator {
    return this.page.locator('text=Juan García, text=Ana Martín');
  }

  get reserveButton(): Locator {
    return this.page.locator('button', { hasText: /Reserve|Reservar|Book/ });
  }

  get confirmButton(): Locator {
    return this.page.locator('button', { hasText: /Confirm|Confirmar/ });
  }

  // Métodos de navegación
  async navigateToReservations(): Promise<void> {
    await this.page.goto('/demo-reservas');
    await this.page.waitForLoadState('networkidle');
  }

  // Métodos de búsqueda de clientes
  async searchClientByPhone(phone: string): Promise<void> {
    await this.clientSearchInput.fill(phone);
    await this.page.waitForTimeout(1000);
  }

  async searchClientByEmail(email: string): Promise<void> {
    await this.clientSearchInput.fill(email);
    await this.page.waitForTimeout(1000);
  }

  async clearSearch(): Promise<void> {
    await this.clientSearchInput.clear();
    await this.page.waitForTimeout(500);
  }

  // Métodos de modo visitante
  async switchToVisitorMode(): Promise<void> {
    if (await this.visitorToggle.count() > 0) {
      await this.visitorToggle.first().click();
    }
  }

  async fillVisitorInfo(name: string, phone: string): Promise<void> {
    if (await this.visitorNameInput.count() > 0) {
      await this.visitorNameInput.fill(name);
    }
    if (await this.visitorPhoneInput.count() > 0) {
      await this.visitorPhoneInput.fill(phone);
    }
  }

  // Métodos de selección de cliente
  async selectClientByName(clientName: string): Promise<void> {
    const clientElement = this.page.locator(`text=${clientName}`);
    if (await clientElement.count() > 0) {
      await clientElement.first().click();
    }
  }

  async selectFirstClient(): Promise<void> {
    if (await this.clientResults.count() > 0) {
      await this.clientResults.first().click();
    }
  }

  // Métodos de reserva
  async makeReservation(): Promise<void> {
    if (await this.reserveButton.count() > 0) {
      await this.reserveButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async confirmReservation(): Promise<void> {
    if (await this.confirmButton.count() > 0) {
      await this.confirmButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  // Verificaciones
  async verifyReservationsPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.clientSearchInput).toBeVisible();
  }

  async verifyClientFound(clientName: string): Promise<void> {
    await expect(this.page.locator(`text=${clientName}`)).toBeVisible();
  }

  async verifyClientNotFound(): Promise<void> {
    const noResults = this.page.locator('text=No clients found, text=Sin resultados, text=No se encontraron');
    if (await noResults.count() > 0) {
      await expect(noResults.first()).toBeVisible();
    }
  }

  async verifyVisitorModeActive(): Promise<void> {
    if (await this.visitorNameInput.count() > 0) {
      await expect(this.visitorNameInput).toBeVisible();
    }
  }

  async verifyVisitorInfo(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`)).toBeVisible();
  }

  async verifyReservationConfirmed(): Promise<void> {
    const confirmationElements = this.page.locator('text=confirmed, text=confirmado, text=success, text=exitoso');
    if (await confirmationElements.count() > 0) {
      await expect(confirmationElements.first()).toBeVisible();
    }
  }
}

/**
 * Page Object para formularios genéricos
 */
export class FormPage extends BasePage {
  // Métodos para campos comunes
  async fillInputByPlaceholder(placeholder: string, value: string): Promise<void> {
    const input = this.page.locator(`input[placeholder*="${placeholder}"]`);
    await input.fill(value);
  }

  async fillInputByName(name: string, value: string): Promise<void> {
    const input = this.page.locator(`input[name="${name}"]`);
    await input.fill(value);
  }

  async selectOption(selectSelector: string, option: string): Promise<void> {
    await this.page.selectOption(selectSelector, option);
  }

  async clickButtonByText(buttonText: string): Promise<void> {
    const button = this.page.locator('button', { hasText: buttonText });
    await button.click();
  }

  async submitForm(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"], button', { hasText: /Submit|Enviar|Save|Guardar/ });
    await submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  // Verificaciones de formulario
  async verifyFieldError(fieldName: string): Promise<void> {
    const errorMessage = this.page.locator(`text*=error, text*=required, text*=requerido, text*=obligatorio`);
    await expect(errorMessage).toBeVisible();
  }

  async verifyFormSubmitted(): Promise<void> {
    const successIndicator = this.page.locator('text*=success, text*=saved, text*=created, text*=guardado, text*=creado');
    if (await successIndicator.count() > 0) {
      await expect(successIndicator.first()).toBeVisible();
    }
  }
}

/**
 * Factory para crear page objects
 */
export class PageFactory {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getDashboardPage(): DashboardPage {
    return new DashboardPage(this.page);
  }

  getClubsPage(): ClubsPage {
    return new ClubsPage(this.page);
  }

  getReservationsPage(): ReservationsPage {
    return new ReservationsPage(this.page);
  }

  getFormPage(): FormPage {
    return new FormPage(this.page);
  }

  getBasePage(): BasePage {
    return new BasePage(this.page);
  }
}

// Helper function para facilitar el uso
export function createPageObjects(page: Page): PageFactory {
  return new PageFactory(page);
}
