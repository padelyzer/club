import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(public page: Page) {}

  // Auth helpers
  async login(email: string = 'admin@padelyzer.com', password: string = 'admin123') {
    await this.page.goto('/login')
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 })
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('**/login**')
  }

  // Navigation helpers
  async navigateToClients() {
    await this.page.click('[data-testid="nav-clients"]')
    await this.page.waitForURL('**/clients**')
  }

  async navigateToReservations() {
    await this.page.click('[data-testid="nav-reservations"]')
    await this.page.waitForURL('**/reservations**')
  }

  async navigateToAnalytics() {
    await this.page.click('[data-testid="nav-analytics"]')
    await this.page.waitForURL('**/analytics**')
  }

  // Form helpers
  async fillClientForm(clientData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    level?: string
  }) {
    await this.page.fill('[data-testid="first-name-input"]', clientData.firstName)
    await this.page.fill('[data-testid="last-name-input"]', clientData.lastName)
    await this.page.fill('[data-testid="email-input"]', clientData.email)
    await this.page.fill('[data-testid="phone-input"]', clientData.phone)
    
    if (clientData.level) {
      await this.page.selectOption('[data-testid="level-select"]', clientData.level)
    }
  }

  async createReservation(reservationData: {
    court: string
    date: string
    time: string
    client?: string
  }) {
    await this.page.click('[data-testid="new-reservation-button"]')
    
    // Select court
    await this.page.click(`[data-testid="court-${reservationData.court}"]`)
    
    // Select date
    await this.page.fill('[data-testid="date-input"]', reservationData.date)
    
    // Select time
    await this.page.selectOption('[data-testid="time-select"]', reservationData.time)
    
    // Select client if provided
    if (reservationData.client) {
      await this.page.fill('[data-testid="client-search"]', reservationData.client)
      await this.page.click(`[data-testid="client-option-${reservationData.client}"]`)
    }
    
    await this.page.click('[data-testid="confirm-reservation-button"]')
  }

  // Assertion helpers
  async expectToast(message: string) {
    await expect(this.page.locator('[data-testid="toast"]')).toContainText(message)
  }

  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(new RegExp(title, 'i'))
  }

  async expectUrl(urlPattern: string) {
    await expect(this.page).toHaveURL(new RegExp(urlPattern))
  }

  // Data helpers
  generateRandomEmail() {
    const timestamp = Date.now()
    return `test.user.${timestamp}@example.com`
  }

  generateRandomPhone() {
    const numbers = Math.floor(Math.random() * 9000000000) + 1000000000
    return `+1${numbers}`
  }

  // Wait helpers
  async waitForLoading() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' })
  }

  async waitForElement(selector: string, timeout: number = 5000) {
    await this.page.waitForSelector(selector, { timeout })
  }
}

// Test data factories
export const testUsers = {
  admin: {
    email: 'admin@padelyzer.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
  },
  client: {
    email: 'client@example.com',
    password: 'client123',
    firstName: 'John',
    lastName: 'Doe',
  },
}

export const testClients = {
  basic: {
    firstName: 'Test',
    lastName: 'Client',
    email: 'test.client@example.com',
    phone: '+1234567890',
    level: 'beginner',
  },
  advanced: {
    firstName: 'Advanced',
    lastName: 'Player',
    email: 'advanced.player@example.com', 
    phone: '+1987654321',
    level: 'advanced',
  },
}

export const testReservations = {
  morning: {
    court: '1',
    date: '2024-12-15',
    time: '09:00',
  },
  evening: {
    court: '2', 
    date: '2024-12-15',
    time: '19:00',
  },
}
