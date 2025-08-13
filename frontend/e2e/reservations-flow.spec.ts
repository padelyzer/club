import { test, expect } from '@playwright/test'
import { TestHelpers, testUsers, testReservations } from './utils/helpers'
import { ReservationsPage } from './utils/page-objects'

test.describe('Reservation Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page)
    await helpers.login(testUsers.admin.email, testUsers.admin.password)
  })

  test('create new reservation successfully', async ({ page }) => {
    const reservationsPage = new ReservationsPage(page)
    const helpers = new TestHelpers(page)

    // Navigate to reservations page
    await reservationsPage.goto()
    await helpers.waitForLoading()

    // Open new reservation modal
    await reservationsPage.openNewReservationModal()

    // Create reservation
    await helpers.createReservation({
      ...testReservations.morning,
      date: '2024-12-20', // Future date
    })

    // Verify success
    await helpers.expectToast('Reservation created successfully')
    await expect(page.locator('[data-testid="reservation-card"]')).toHaveCount({ min: 1 })
  })

  test('view calendar with existing reservations', async ({ page }) => {
    const reservationsPage = new ReservationsPage(page)
    const helpers = new TestHelpers(page)

    await reservationsPage.goto()
    await helpers.waitForLoading()

    // Verify calendar is visible
    await expect(reservationsPage.calendarView).toBeVisible()

    // Check for reservation cards
    await expect(reservationsPage.reservationCards).toHaveCount({ min: 0 })
  })

  test('filter reservations by date', async ({ page }) => {
    const reservationsPage = new ReservationsPage(page)
    const helpers = new TestHelpers(page)

    await reservationsPage.goto()
    await helpers.waitForLoading()

    // Select specific date
    await reservationsPage.selectDate('2024-12-01')

    // Verify date filter applied
    await expect(page.locator('[data-testid="date-picker"]')).toHaveValue('2024-12-01')
  })
})
