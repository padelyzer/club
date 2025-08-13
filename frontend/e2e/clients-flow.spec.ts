import { test, expect } from '@playwright/test'
import { TestHelpers, testUsers, testClients } from './utils/helpers'
import { ClientsPage } from './utils/page-objects'

test.describe('Client Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page)
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
  })

  test('create new client successfully', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    const helpers = new TestHelpers(page)

    // Navigate to clients page
    await clientsPage.goto()
    await helpers.waitForLoading()

    // Open new client modal
    await clientsPage.openNewClientModal()

    // Fill client form with unique data
    const uniqueClient = {
      ...testClients.basic,
      email: helpers.generateRandomEmail(),
      phone: helpers.generateRandomPhone(),
    }

    await helpers.fillClientForm(uniqueClient)

    // Submit form
    await page.click('[data-testid="submit-client-button"]')

    // Verify success
    await helpers.expectToast('Client created successfully')
    await expect(page.locator(`text=${uniqueClient.firstName}`)).toBeVisible()
  })

  test('search for existing clients', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    const helpers = new TestHelpers(page)

    await clientsPage.goto()
    await helpers.waitForLoading()

    // Search for client
    await clientsPage.searchClient('Test')

    // Verify search results
    await expect(clientsPage.clientCards).toHaveCount({ min: 1 })
  })

  test('view client details', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    const helpers = new TestHelpers(page)

    await clientsPage.goto()
    await helpers.waitForLoading()

    // Click on first client card
    const firstClient = clientsPage.clientCards.first()
    await firstClient.click()

    // Verify client details modal opened
    await expect(page.locator('[data-testid="client-details-modal"]')).toBeVisible()
  })
})
