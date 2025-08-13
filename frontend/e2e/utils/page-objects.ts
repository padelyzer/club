import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="email-input"]')
    this.passwordInput = page.locator('[data-testid="password-input"]')
    this.loginButton = page.locator('[data-testid="login-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

export class DashboardPage {
  readonly page: Page
  readonly welcomeMessage: Locator
  readonly statsCards: Locator
  readonly navigationMenu: Locator

  constructor(page: Page) {
    this.page = page
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]')
    this.statsCards = page.locator('[data-testid="stats-card"]')
    this.navigationMenu = page.locator('[data-testid="navigation-menu"]')
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async navigateToClients() {
    await this.page.click('[data-testid="nav-clients"]')
  }

  async navigateToReservations() {
    await this.page.click('[data-testid="nav-reservations"]')
  }
}

export class ClientsPage {
  readonly page: Page
  readonly clientsList: Locator
  readonly newClientButton: Locator
  readonly searchInput: Locator
  readonly clientCards: Locator

  constructor(page: Page) {
    this.page = page
    this.clientsList = page.locator('[data-testid="clients-list"]')
    this.newClientButton = page.locator('[data-testid="new-client-button"]')
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.clientCards = page.locator('[data-testid="client-card"]')
  }

  async goto() {
    await this.page.goto('/clients')
  }

  async searchClient(searchTerm: string) {
    await this.searchInput.fill(searchTerm)
  }

  async openNewClientModal() {
    await this.newClientButton.click()
  }
}

export class ReservationsPage {
  readonly page: Page
  readonly calendarView: Locator
  readonly newReservationButton: Locator
  readonly reservationCards: Locator
  readonly dateNavigator: Locator

  constructor(page: Page) {
    this.page = page
    this.calendarView = page.locator('[data-testid="calendar-view"]')
    this.newReservationButton = page.locator('[data-testid="new-reservation-button"]')
    this.reservationCards = page.locator('[data-testid="reservation-card"]')
    this.dateNavigator = page.locator('[data-testid="date-navigator"]')
  }

  async goto() {
    await this.page.goto('/reservations')
  }

  async openNewReservationModal() {
    await this.newReservationButton.click()
  }

  async selectDate(date: string) {
    await this.page.fill('[data-testid="date-picker"]', date)
  }
}
